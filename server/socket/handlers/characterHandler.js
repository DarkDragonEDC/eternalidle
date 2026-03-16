import { supabase } from "../../services/supabase.js";

export const registerCharacterHandlers = (socket, gameManager, io) => {
  socket.on("acknowledge_ban_warning", async () => {
    if (!socket.user?.id) return;
    await gameManager.acknowledgeBanWarning(socket.user.id);
    // Clear warning on all active tabs for this user
    io.to(`user:${socket.user.id}`).emit("account_status", {
      banWarning: null,
    });
  });

  socket.on("join_character", async ({ characterId }) => {
    if (!characterId || characterId === "undefined") return;
    const userId = socket.user.id;

    try {
      const ban = await gameManager.checkBan(userId);
      if (ban && (ban.level === 2 || ban.level === 3)) {
        let message = "Your account has been restricted.";
        if (ban.level === 2) {
          message = `Your account is temporarily banned for 24h. Reason: ${ban.reason}. Remaining: ${ban.remaining}h`;
        } else if (ban.level === 3) {
          message = `Your account is permanently banned. Reason: ${ban.reason}`;
        }

        socket.emit("ban_error", {
          type: "BANNED",
          message: message,
          level: ban.level,
          reason: ban.reason,
          remaining: ban.remaining,
          banned_until: ban.banned_until,
        });
        return;
      }

      await gameManager.executeLocked(userId, async () => {
        const status = await gameManager.getStatus(
          socket.user.id,
          true,
          characterId,
          true,
        );

        if (
          status.state &&
          status.state.tutorialStep &&
          status.state.tutorialStep !== "COMPLETED"
        ) {
          status.state.tutorialStep = "COMPLETED";
          await gameManager.saveState(characterId, status.state);
        }

        socket.data.characterId = characterId;
        socket.join(`user_char:${characterId}`);

        if (status.offlineReport) {
          socket.emit("offline_report", status.offlineReport);
        }

        socket.emit("game_status", status);
        
        // --- DAILY SPIN STATUS ---
        try {
          const canSpin = await gameManager.dailyRewardManager.canSpin(char);
          socket.emit("daily_status", { canSpin });
        } catch (dailyErr) {
          console.error("[JOIN] Error checking daily spin status:", dailyErr);
        }
        
        // Also trigger trade list refresh on join
        // (Moved from index.js inline logic)
        try {
          const { data: tradeData } = await supabase
            .from("trade_sessions")
            .select("*")
            .eq("status", "PENDING")
            .or(`sender_id.eq.${characterId},receiver_id.eq.${characterId}`);

          const enrichedTrades = await Promise.all(
            (tradeData || []).map(async (trade) => {
              const partnerId = trade.sender_id === characterId ? trade.receiver_id : trade.sender_id;
              const { data: partnerData } = await supabase
                .from("characters")
                .select("name")
                .eq("id", partnerId)
                .single();
              return { ...trade, partner_name: partnerData?.name || "Unknown" };
            })
          );
          socket.emit("trade_active_list", enrichedTrades);
        } catch (err) {
          console.error("[TRADE] Error fetching active trades on join:", err);
        }
      });
    } catch (err) {
      console.error("[JOIN] Error joining character:", err);
      socket.emit("error", { message: "Error joining character" });
    }
  });

  socket.on("request_sync", async () => {
    if (!socket.data.characterId || !socket.user?.id) return;
    
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const status = await gameManager.getStatus(
          socket.user.id,
          true, // catchup
          socket.data.characterId,
          false // bypassCache - usually cache is fine for visibility sync
        );
        socket.emit("game_status", status);
      });
    } catch (err) {
      console.error("[SYNC] Error processing request_sync:", err);
    }
  });

  socket.on("acknowledge_offline_report", async () => {
    if (!socket.data.characterId) return;
    await gameManager.acknowledgeOfflineReport(socket.data.characterId);
  });

  socket.on("check_name_availability", async ({ name }) => {
    try {
      if (!name || name.trim().length < 3) {
        return socket.emit("name_availability_result", { available: false, error: "Name too short" });
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id")
        .eq("name", name.trim())
        .maybeSingle();

      if (error) throw error;

      socket.emit("name_availability_result", { 
        available: !data, 
        name: name.trim() 
      });
    } catch (err) {
      console.error("Check Name Error:", err);
      socket.emit("error", { message: "Error checking name availability" });
    }
  });

  socket.on("change_name", async ({ newName }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        if (!char.state.pendingNameChange) {
          throw new Error("You do not have a pending name change!");
        }

        const safeName = (newName || "").trim();
        if (safeName.length < 3 || safeName.length > 20) {
          throw new Error("Name must be between 3 and 20 characters.");
        }
        if (!/^[a-zA-Z0-9_ ]+$/.test(safeName)) {
          throw new Error(
            "Name can only contain letters, numbers, spaces, and underscores.",
          );
        }

        const { error } = await supabase
          .from("characters")
          .update({ name: safeName })
          .eq("id", char.id);

        if (error) {
          if (error.code === "23505")
            throw new Error("Name already taken via DB Check.");
          throw error;
        }

        char.name = safeName;
        char.state.pendingNameChange = false;

        // Perform denormalized updates in background/parallel
        try {
          // Update History Tables
          await Promise.all([
            supabase.from("market_history").update({ seller_name: safeName }).eq("seller_id", socket.user.id),
            supabase.from("market_history").update({ buyer_name: safeName }).eq("buyer_id", socket.user.id),
            supabase.from("trade_history").update({ sender_name: safeName }).eq("sender_id", socket.user.id),
            supabase.from("trade_history").update({ receiver_name: safeName }).eq("receiver_id", socket.user.id),
            supabase.from("market_buy_orders").update({ buyer_name: safeName }).eq("buyer_id", socket.user.id)
          ]);
        } catch (updateErr) {
          console.error("Denormalized name update error (non-fatal):", updateErr);
        }

        await gameManager.saveState(char.id, char.state);

        socket.emit("name_changed", { success: true, newName: safeName });
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("Name Change Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("change_title", async ({ title }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        const unlocked = char.state.unlockedTitles || [];
        if (title && title !== "None" && !unlocked.includes(title)) {
          throw new Error("You haven't unlocked this title yet!");
        }

        char.state.selectedTitle = title === "None" || !title ? null : title;
        await gameManager.saveState(char.id, char.state);

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("Title Change Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("change_avatar", async ({ avatar }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        const freeAvatars = ["1 - male", "1 - female"];
        const unlocked = char.state.unlockedAvatars || [];
        const normalizeAvatar = (name) => name.replace(/\.(png|webp)$/i, "");
        const normalizedAvatar = normalizeAvatar(avatar);

        const isFree = freeAvatars.some((fa) =>
          normalizedAvatar.includes(normalizeAvatar(fa)),
        );
        const isUnlocked = unlocked.some((ua) =>
          normalizedAvatar.includes(normalizeAvatar(ua)),
        );

        if (!isFree && !isUnlocked) {
          throw new Error(
            "This avatar is locked! Unlock it first for 200 Orbs.",
          );
        }

        char.state.avatar = avatar;
        await gameManager.saveState(char.id, char.state);

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("Avatar Change Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("change_banner", async ({ banner }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        const freeBanners = ["ceu-noturno", "noite-sem-fim", "medieval"];
        const unlocked = char.state.unlockedBanners || [];
        const filename = banner.split("/").pop();
        const baseName = filename.replace(/\.[^/.]+$/, "");

        const isFree = freeBanners.includes(baseName);
        const isUnlocked = unlocked.includes(filename);

        if (!isFree && !isUnlocked) {
          throw new Error(
            "This banner is locked! Unlock it first for 200 Orbs.",
          );
        }

        char.state.banner = banner;
        await gameManager.saveState(char.id, char.state);

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("Banner Change Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("unlock_banner", async ({ bannerName }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        if (!char.state.unlockedBanners) {
          char.state.unlockedBanners = [];
        }

        if (char.state.unlockedBanners.includes(bannerName)) {
          throw new Error("Banner already unlocked!");
        }

        const cost = 200;
        if ((char.state.orbs || 0) < cost) {
          throw new Error(`Not enough Orbs! This banner costs ${cost} Orbs.`);
        }

        char.state.orbs -= cost;
        char.state.unlockedBanners.push(bannerName);

        await gameManager.saveState(char.id, char.state);
        await gameManager.persistCharacter(char.id);

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
        socket.emit("action_result", {
          success: true,
          message: `Unlocked ${bannerName} banner!`,
        });
      });
    } catch (err) {
      console.error("Banner Unlock Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("unlock_avatar", async ({ avatarName }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        if (!char.state.unlockedAvatars) {
          char.state.unlockedAvatars = [];
        }

        const normalizeAvatar = (name) => name.replace(/\.(png|webp)$/i, "");
        const normalizedAvatarName = normalizeAvatar(avatarName);

        if (
          char.state.unlockedAvatars.some(
            (ua) => normalizeAvatar(ua) === normalizedAvatarName,
          )
        ) {
          throw new Error("Avatar already unlocked!");
        }

        const premiumAvatars = ["5 - male", "5 - female"];
        const isPremiumAvatar = premiumAvatars.some((pa) =>
          normalizedAvatarName.includes(pa),
        );
        const cost = isPremiumAvatar ? 250 : 200;
        if ((char.state.orbs || 0) < cost) {
          throw new Error(`Not enough Orbs! This avatar costs ${cost} Orbs.`);
        }

        char.state.orbs -= cost;
        char.state.unlockedAvatars.push(avatarName);

        await gameManager.saveState(char.id, char.state);
        await gameManager.persistCharacter(char.id);

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
        socket.emit("action_result", {
          success: true,
          message: `Unlocked ${avatarName} avatar!`,
        });
      });
    } catch (err) {
      console.error("Avatar Unlock Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("unlock_theme", async ({ themeId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        const premiumThemes = ["ember", "cyber", "rose", "nature", "arcane", "ice", "crimson"];
        if (!premiumThemes.includes(themeId)) throw new Error("Invalid theme.");

        if (!char.state.unlockedThemes) {
          char.state.unlockedThemes = ["medieval", "dark"];
        }

        if (char.state.unlockedThemes.includes(themeId)) {
          throw new Error("Theme already unlocked.");
        }

        const cost = 50;
        if ((char.state.orbs || 0) < cost) {
          throw new Error(`Not enough Orbs! This theme costs ${cost} Orbs.`);
        }

        char.state.orbs -= cost;
        char.state.unlockedThemes.push(themeId);

        await gameManager.saveState(char.id, char.state);
        await gameManager.persistCharacter(char.id);

        socket.emit("action_result", {
          success: true,
          message: `Unlocked ${themeId} theme!`,
        });
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("set_theme", async ({ themeId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;

      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) return;

        const unlocked = char.state.unlockedThemes || ["medieval", "dark"];
        if (!unlocked.includes(themeId)) {
          throw new Error("You haven't unlocked this theme yet!");
        }

        char.state.theme = themeId;
        await gameManager.saveState(char.id, char.state);

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("Set Theme Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("set_settings", async ({ settings }) => {
    try {
      if (!settings || typeof settings !== "object") return;
      
      // Sync to user_metadata
      try {
        const { data: { user }, error: fetchError } = await supabase.auth.admin.getUserById(socket.user.id);
        if (!fetchError) {
          const currentMetadata = user?.user_metadata || {};
          await supabase.auth.admin.updateUserById(socket.user.id, {
            user_metadata: { ...currentMetadata, game_settings: settings },
          });
        }
      } catch (authErr) {
        console.warn("[SETTINGS] Could not sync to user_metadata:", authErr.message);
      }

      if (socket.data.characterId && socket.data.characterId !== "undefined") {
        await gameManager.executeLocked(socket.user.id, async () => {
          const char = await gameManager.getCharacter(
            socket.user.id,
            socket.data.characterId,
          );
          if (char) {
            if (!char.state) char.state = {};
            char.state.settings = settings;
            gameManager.markDirty(char.id);
            await gameManager.saveState(char.id, char.state);
          }
        });
      }
    } catch (err) {
      console.error("Set Settings Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("complete_tutorial_step", async ({ step }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      
      const TUTORIAL_STEP_ORDER = [
        "OPEN_INVENTORY", "SELECT_CHEST", "OPEN_CHEST", "CLAIM_LOOT", "OPEN_PROFILE",
        "EQUIP_WEAPON", "SELECT_WEAPON", "EQUIP_FOOD", "SELECT_FOOD", "MERGE_RUNES_1",
        "OPEN_RUNE_FORGE", "CREATE_RUNE", "FORGE_SELECT_MAX", "FORGE_SELECT_GATHERING",
        "FORGE_CONFIRM", "CLAIM_FORGE_RESULTS", "OPEN_RUNE_TAB", "SELECT_MERGE_RUNE",
        "CONFIRM_MERGE_SELECTION", "FINAL_MERGE_CLICK", "VIEW_MERGE_RESULTS",
        "CLOSE_FINAL_MODAL", "EQUIP_RUNE_PROFILE", "PROFILE_RUNE_TAB", "SELECT_RUNE_SLOT",
        "CONFIRM_EQUIP_RUNE", "GO_TO_COMBAT", "SELECT_COMBAT_CATEGORY", "START_FIRST_MOB",
        "TUTORIAL_FINAL_MESSAGE", "COMPLETED",
      ];

      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        const currentIndex = TUTORIAL_STEP_ORDER.indexOf(char.state.tutorialStep || "OPEN_INVENTORY");
        const nextIndex = TUTORIAL_STEP_ORDER.indexOf(step);

        if (nextIndex > currentIndex) {
          char.state.tutorialStep = step;
          await gameManager.saveState(char.id, char.state);
          socket.emit(
            "status_update",
            await gameManager.getStatus(
              socket.user.id,
              true,
              socket.data.characterId,
            ),
          );
        }
      });
    } catch (err) {
      console.error("Tutorial Step Error:", err);
      socket.emit("error", { message: err.message });
    }
  });
};
