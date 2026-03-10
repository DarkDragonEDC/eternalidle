// Force Reload Trigger (Social Activity Debug) - 2026-03-09 21:58
// Force restart for items sync
// Forced reload to pick up shared/items.js changes
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import Stripe from "stripe";
import { getStoreItem, getAllStoreItems } from "../shared/orbStore.js";

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
if (!stripe) {
  console.warn(
    "WARNING: STRIPE_SECRET_KEY not found. Orb Store purchases will be disabled.",
  );
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("!!! Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("!!! Uncaught Exception:", err);
});

const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for alpha/testing to avoid Vercel block
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  // --- BANDWIDTH OPTIMIZATION: Enable WebSocket compression ---
  perMessageDeflate: {
    threshold: 256, // Only compress messages > 256 bytes
    zlibDeflateOptions: { level: 6 }, // Balanced speed/compression
    zlibInflateOptions: { chunkSize: 16 * 1024 },
  },
});

// Manual socket registry for Ticker reliability
const connectedSockets = new Map();

// Webhook must be BEFORE express.json() to get raw body
// Cache version at startup
const SERVER_VERSION = JSON.parse(fs.readFileSync("./package.json", "utf8")).version;
console.log(`[STARTUP] Eternal Idle Server v${SERVER_VERSION}`);

app.use(cors());
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    if (!stripe) {
      return res.status(503).send("Stripe not configured");
    }

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret",
      );
    } catch (err) {
      console.error(`[STRIPE] Webhook Signature Error: ${err.message}`);
      console.error(
        `[STRIPE] Expected Secret: ${process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10)}...`,
      );
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[STRIPE] Webhook received: ${event.type}`);

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      let { userId, characterId, orbAmount, packageId } =
        session.metadata || {};

      // Deliver based on metadata - dynamic sessions ALWAYS have these
      console.log(
        `[STRIPE] Delivery started: User=${userId}, Char=${characterId}, Orbs=${orbAmount}, Package=${packageId}`,
      );

      if (!userId || !characterId) {
        console.error(
          "[STRIPE] Error: Missing critical metadata in session",
          session.metadata,
        );
        return res.json({ received: true, error: "missing_metadata" });
      }

      try {
        await gameManager.executeLocked(userId, async () => {
          console.log(`[STRIPE] Lock acquired for user ${userId}`);
          const char = await gameManager.getCharacter(
            userId,
            characterId,
            false,
            true,
          ); // Bypass cache to be safe

          if (!char) {
            console.error(
              `[STRIPE] Error: Character ${characterId} not found for user ${userId}`,
            );
            return;
          }

          console.log(
            `[STRIPE] Character found: ${char.name}. Current Orbs: ${char.state.orbs || 0}`,
          );

          let result;
          let deliveryMessage = "";

          if (packageId.startsWith("MEMBERSHIP")) {
            // Purchase is MEMBERSHIP (single or bundle)
            const pkg = getStoreItem(packageId);
            const qty = pkg?.membershipQty || 1;
            const added = gameManager.inventoryManager.addItemToInventory(
              char,
              "MEMBERSHIP",
              qty,
            );
            if (added) {
              result = {
                success: true,
                message: `${qty}x Membership item${qty > 1 ? "s" : ""} added to inventory!`,
              };
            } else {
              // Inventory Full - Add to Claims instead
              gameManager.marketManager.addClaim(char, {
                type: "PURCHASED_ITEM",
                itemId: "MEMBERSHIP",
                amount: qty,
                name: `Membership x${qty}`,
                timestamp: Date.now(),
              });
              result = {
                success: true,
                message: `Inventory full! ${qty}x Membership item${qty > 1 ? "s" : ""} sent to Market -> Claims tab.`,
              };
            }
            deliveryMessage = result.message;
          } else {
            // Standard orbs package
            result = gameManager.orbsManager.addOrbs(
              char,
              parseInt(orbAmount),
              `STRIPE_${packageId}`,
            );
            deliveryMessage = `Payment confirmed! Added ${orbAmount} Orbs.`;
          }

          console.log(`[STRIPE] Delivery result: ${JSON.stringify(result)}`);

          if (result.success) {
            await gameManager.saveState(char.id, char.state);
            console.log(`[STRIPE] State saved successfully for ${char.name}`);

            // Notify client if connected
            const userSockets = Array.from(connectedSockets.values()).filter(
              (s) => s.user?.id === userId,
            );

            console.log(
              `[STRIPE] Found ${userSockets.length} active sockets to notify`,
            );

            userSockets.forEach((s) => {
              s.emit("orb_purchase_success", {
                message: deliveryMessage,
                newBalance: char.state.orbs,
              });
              // Also trigger a full status update
              gameManager
                .getStatus(userId, false, characterId)
                .then((status) => {
                  s.emit("status_update", status);
                });
            });
          } else {
            console.error(`[STRIPE] addOrbs failed: ${result.error}`);
          }
        });
      } catch (err) {
        console.error("[STRIPE] Critical Error processing delivery:", err);
      }
    }

    res.json({ received: true });
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { authMiddleware } from "./authMiddleware.js";

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("WARNING: Supabase credentials not found in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


const isServiceRole = SUPABASE_KEY?.includes("NlcnZpY2Vfcm9sZ");
console.log(
  "[SERVER] Supabase Key Role:",
  isServiceRole ? "SERVICE_ROLE" : "ANON",
);

import { GameManager } from "./GameManager.js";
const gameManager = new GameManager(supabase);
gameManager.setSocketServer(io);

// Register Global Stats Update Callback
gameManager.onGlobalStatsUpdate = (stats) => {
  io.emit("global_stats_update", stats);
};

import { characterRoutes } from "./routes/characters.js";
app.use("/api/characters", authMiddleware, characterRoutes(gameManager));

// Public route
app.get("/", (req, res) => {
  res.send("Jogo 2.0 Server is running");
});

// Protected route example
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user, message: "You are authenticated!" });
});

// Update Last Active Timestamp
app.post("/api/update_last_active", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from("user_sessions").upsert({
      user_id: req.user.id,
      last_active_at: new Date().toISOString(),
      ip_address:
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip,
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating last_active:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get Last Active Timestamp
app.get("/api/last_active", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("last_active_at")
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    res.json({
      last_active_at: data?.last_active_at || null,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting last_active:", err);
    res.status(500).json({ error: err.message });
  }
});

// Cache for active players count
let activePlayersCache = {
  count: 0,
  timestamp: 0,
};

// Public route for active accounts count (unique users with active characters)
app.get("/api/active_players", async (req, res) => {
  const now = Date.now();

  // Return cached value if it's less than 60 seconds old
  if (now - activePlayersCache.timestamp < 60000) {
    return res.json({ count: activePlayersCache.count, cached: true });
  }

  // Persistent log for debugging
  const logMsg = `[${new Date().toISOString()}] Counter refreshed. Origin: ${req.headers.origin}\n`;
  try {
    if (!fs.existsSync("logs")) fs.mkdirSync("logs");
    fs.appendFileSync("logs/access.log", logMsg);
  } catch (e) { }

  try {
    // Fetch user_id for all characters that have an active activity
    // Optimization: We could also check combat/dungeon columns if they are separate now
    const { data, error } = await supabase
      .from("characters")
      .select("user_id")
      .not("current_activity", "is", null);

    if (error) throw error;

    // Count unique user_ids to get "active accounts"
    const uniqueUsers = new Set((data || []).map((c) => c.user_id)).size;

    // Update cache
    activePlayersCache = {
      count: uniqueUsers,
      timestamp: now,
    };

    res.json({ count: uniqueUsers });
  } catch (err) {
    console.error("[SERVER] Error:", err);
    res
      .status(500)
      .json({ count: activePlayersCache.count || 0, error: err.message });
  }
});

// Public leaderboard endpoint (no auth required)
app.get("/api/leaderboard", async (req, res) => {
  try {
    const type = req.query.type || "COMBAT";
    const mode = req.query.mode || "NORMAL";
    const response = await gameManager.getLeaderboard(type, null, mode);
    res.json({
      type: response.type,
      mode: response.mode,
      data: response.top100,
    });
  } catch (err) {
    console.error("[SERVER] Leaderboard error:", err);
    res.status(500).json({ data: [], error: err.message });
  }
});

io.use(async (socket, next) => {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    console.warn(`[SOCKET AUTH] No token provided for socket: ${socket.id}`);
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(
        `[SOCKET AUTH] Invalid token for socket: ${socket.id}`,
        error?.message,
      );
      return next(new Error("Authentication error: Invalid token"));
    }

    socket.user = user;
    socket.data.user = user;
    next();
  } catch (err) {
    return next(new Error("Authentication error: " + err.message));
  }
});

io.on("connection", (socket) => {
  console.log(
    `[SOCKET] User connected: ${socket.user?.email || "Unknown"} (Socket: ${socket.id})`,
  );
  const clientIp =
    socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
  console.log(
    `[SOCKET] User connected: ${socket.user?.email || "Unknown"} (Socket: ${socket.id}, IP: ${clientIp})`,
  );

  // Log IP to user_sessions immediately on connection
  if (socket.user?.id) {
    supabase
      .from("user_sessions")
      .upsert({
        user_id: socket.user.id,
        last_active_at: new Date().toISOString(),
        ip_address: clientIp,
      })
      .then(({ error }) => {
        if (error) console.error("[SOCKET] Error logging session IP:", error);
      });
  }

  connectedSockets.set(socket.id, socket);

  // Ensure account-wide room joining happens immediately on connect
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
  }

  const fetchAndEmitTradeList = async (targetSocket, charId) => {
    try {
      if (!charId || charId === "undefined" || charId === "null") return;
      const { data, error } = await supabase
        .from("trade_sessions")
        .select("*")
        .eq("status", "PENDING")
        .or(`sender_id.eq.${charId},receiver_id.eq.${charId}`);

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (trade) => {
          const partnerId =
            trade.sender_id === charId ? trade.receiver_id : trade.sender_id;
          const { data: partnerData } = await supabase
            .from("characters")
            .select("name")
            .eq("id", partnerId)
            .single();

          return {
            ...trade,
            partner_name: partnerData?.name || "Unknown",
          };
        }),
      );
      targetSocket.emit("trade_list", enriched);
    } catch (err) {
      console.error("[TRADE] Error fetching active trades:", err);
    }
  };

  // Version Handshake for Auto-Refresh
  socket.emit("server_version", {
    version: SERVER_VERSION,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY
  });

  // 1. Initial Account Status Check (Bans & Warnings)
  if (socket.user?.id) {
    gameManager
      .checkBan(socket.user.id)
      .then((ban) => {
        if (ban) {
          if (ban.level === 1) {
            if (!ban.ack) {
              socket.emit("account_status", { banWarning: ban.reason });
            }
          } else {
            // Level 2 or 3 - block login
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
            });
          }
        }
      })
      .catch((err) =>
        console.error("[SOCKET] Error checking initial ban status:", err),
      );
  }

  socket.on("acknowledge_ban_warning", async () => {
    if (!socket.user?.id) return;
    await gameManager.acknowledgeBanWarning(socket.user.id);
    // Clear warning on all active tabs for this user
    gameManager.broadcastToUser(socket.user.id, "account_status", {
      banWarning: null,
    });
  });

  socket.on("disconnect", async (reason) => {
    console.log(`[SOCKET] User disconnected: ${socket.id}. Reason: ${reason}`);
    connectedSockets.delete(socket.id);

    const charId = socket.data.characterId;
    if (charId) {
      try {
        // Save immediately on disconnect to prevent rollback
        await gameManager.executeLocked(socket.user.id, async () => {
          await gameManager.persistCharacter(charId);
          // Clear cache so next login starts fresh from DB (important for manual edits)
          gameManager.removeFromCache(charId);
        });
        console.log(
          `[SOCKET] Char ${charId} persisted and cleared from cache on disconnect.`,
        );
      } catch (err) {
        console.error(
          `[SOCKET] Error persisting char ${charId} on disconnect:`,
          err,
        );
      }
    }
  });

  socket.on("join_character", async ({ characterId }) => {
    if (!characterId || characterId === "undefined") return;
    const userId = socket.user.id;

    try {
      // 1. Check for bans (Level 2 or 3 block login)
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
        console.log(
          `[BAN] Blocking login for ${socket.user.email} (Level ${ban.level})`,
        );
        return;
      }

      // Note: Removed syncWithDatabase here - it was preventing catchup from working
      // because it populated cache with old DB data BEFORE getStatus could run catchup.
      // The getStatus with bypassCache=true handles fresh loading properly.

      // Immediately send status for this character (with catchup=true for offline progress)
      await gameManager.executeLocked(userId, async () => {
        // getStatus(..., true) handles getCharacter + catchup + stats calculation
        const status = await gameManager.getStatus(
          socket.user.id,
          true,
          characterId,
          true,
        );

        // AUTO-COMPLETE TUTORIAL: If player is mid-tutorial, just mark it as completed
        if (
          status.state &&
          status.state.tutorialStep &&
          status.state.tutorialStep !== "COMPLETED"
        ) {
          console.log(
            `[TUTORIAL] Auto-completing character ${characterId} (was at step: ${status.state.tutorialStep})`,
          );
          status.state.tutorialStep = "COMPLETED";
          // status.state is the character state, updating it here marks the char as dirty in getStatus's getCharacter call if bypassCache=true
          // Actually, getStatus returns a COPY or the object. If it's the object, updating status.state is enough.
          // But to be safe, we should save it.
          await gameManager.saveState(characterId, status.state);
        }

        // CRITICAL FIX: Only assign characterId to socket AFTER catchup ensures state is valid.
        // Previous race condition: assigning before lock allowed Ticker Loop to processTick()
        // on a raw DB loaded char (catchup=false), resetting last_saved and erasing offline progress.
        socket.data.characterId = characterId;

        // Attach offline report ONLY to THIS emit (not in getStatus which is used by 53+ callers)
        const cachedChar = gameManager.cache.get(characterId);
        if (cachedChar && cachedChar.offlineReport) {
          status.offlineReport = cachedChar.offlineReport;
          // delete cachedChar.offlineReport; // Keep in memory until acknowledged via acknowledge_offline_report
          console.log(
            `[OFFLINE] Including offline report in join_character status_update`,
          );
        }

        socket.emit("status_update", status);
        socket.emit("global_stats_update", gameManager.globalStats);

        try {
          const canSpin =
            await gameManager.dailyRewardManager.canSpin(cachedChar);
          socket.emit("daily_status", { canSpin });
        } catch (spinErr) {
          console.error("[DAILY-SPIN] Error checking canSpin:", spinErr);
          socket.emit("daily_status", { canSpin: false });
        }

        console.log(
          `[SOCKET] User ${socket.user.email} successfully joined character ${characterId}`,
        );

        // Send active trades immediately on join to fix notification dot race condition
        fetchAndEmitTradeList(socket, characterId);
      });
    } catch (err) {
      console.error(`[SOCKET] Error joining character ${characterId}:`, err);
      socket.emit("error", { message: "Failed to load character data." });
    }
  });

  socket.on("push_subscribe", async ({ subscription }) => {
    try {
      if (!socket.user?.id) return;
      const result = await gameManager.pushManager.saveSubscription(socket.user.id, subscription);
      socket.emit("push_subscribe_result", result);
    } catch (err) {
      console.error("[PUSH] Subscription error:", err);
      socket.emit("error", { message: "Failed to save push subscription." });
    }
  });

  socket.on("push_update_settings", async ({ settings }) => {
    try {
      if (!socket.user?.id) return;
      const result = await gameManager.pushManager.updateSettings(socket.user.id, settings);
      socket.emit("push_update_settings_result", result);
    } catch (err) {
      console.error("[PUSH] Settings update error:", err);
      socket.emit("error", { message: "Failed to update push settings." });
    }
  });

  socket.on("get_status", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === "undefined") return; // Prevent crash if not joined yet

      await gameManager.executeLocked(socket.user.id, async () => {
        const status = await gameManager.getStatus(
          socket.user.id,
          true,
          charId,
        );
        socket.emit("status_update", status);
      });
    } catch (err) {
      console.error(`[SERVER] Error in get_status: `, err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_leaderboard", async (payload) => {
    try {
      const charId = socket.data.characterId;
      // Support both old (string) and new (object) formats for backward compatibility
      let type = "COMBAT";
      let mode = "NORMAL";

      if (typeof payload === "string") {
        type = payload;
      } else if (typeof payload === "object") {
        type = payload.type || "COMBAT";
        mode = payload.mode || "NORMAL";
      }

      const response = await gameManager.getLeaderboard(type, charId, mode);
      socket.emit("leaderboard_update", response);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_guild_profile", async ({ guildId }) => {
    try {
      const profile = await gameManager.guildManager.getPublicGuildProfile(guildId);
      socket.emit("guild_profile_data", profile);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("create_character", async ({ name, isIronman }) => {

    console.log(
      `[SERVER] Received create_character request: "${name}" (Ironman: ${isIronman}) from user ${socket.user.email} `,
    );
    try {
      const char = await gameManager.createCharacter(
        socket.user.id,
        name,
        isIronman,
      );
      console.log(`[SERVER] Character created successfully: "${name}"`);
      socket.emit("character_created", char);
      socket.emit(
        "status_update",
        await gameManager.getStatus(socket.user.id, true, char.id),
      );
    } catch (err) {
      console.error(
        `[SERVER] Error creating character "${name}": `,
        err.message,
      );
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("start_activity", async ({ actionType, itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.startActivity(
          socket.user.id,
          socket.data.characterId,
          actionType,
          itemId,
          quantity,
        );
        socket.emit("activity_started", result);
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
      console.error("Error starting activity:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("create_guild", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.createGuild(char, data);

        socket.emit("guild_created", result);
        // Force a status update to sync guild data to client
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
      console.error("[GUILD] Error in create_guild socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("update_guild_customization", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.updateCustomization(
          char,
          data,
        );

        socket.emit("guild_customization_updated", result);
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
      console.error("[GUILD] Error in update_guild_customization socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("search_guilds", async ({ query, countryCode }) => {
    try {
      const characterId = socket.data.characterId;
      const results = await gameManager.guildManager.searchGuilds(
        query,
        countryCode,
        characterId,
      );
      socket.emit("guild_search_results", results);
    } catch (err) {
      console.error("[GUILD] Error in search_guilds socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("leave_guild", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.leaveGuild(char);
        socket.emit("guild_left", result);
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
      console.error("[GUILD] Error in leave_guild socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("apply_to_guild", async ({ guildId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.applyToGuild(
          char,
          guildId,
        );
        socket.emit("guild_application_sent", result);
      });
    } catch (err) {
      console.error("[GUILD] Error in apply_to_guild socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_guild_requests", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      const char = await gameManager.getCharacter(
        socket.user.id,
        socket.data.characterId,
      );
      const requests = await gameManager.guildManager.getGuildRequests(char);
      socket.emit("guild_requests_data", requests);
    } catch (err) {
      console.error("[GUILD] Error in get_guild_requests socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Push Notifications
  socket.on("save_push_subscription", async (data) => {
    try {
      if (!socket.user?.id) return;
      const { subscription, settings } = data || {};
      if (!subscription) return;
      const result = await gameManager.pushManager.saveSubscription(socket.user.id, subscription, settings);
      socket.emit("push_subscription_saved", result);
    } catch (err) {
      console.error("[PUSH] Error saving subscription:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("handle_guild_request", async ({ requestId, action }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.handleGuildRequest(
          char,
          requestId,
          action,
        );
        socket.emit("guild_request_handled", result);

        // If accepted, force a status update for the leader to see the new member count
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
      console.error("[GUILD] Error in handle_guild_request socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("change_member_role", async ({ memberId, newRole }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.changeMemberRole(char, {
          memberId,
          newRole,
        });

        if (result.success) {
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
      console.error("[GUILD] Error in change_member_role socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("update_guild_role", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.updateGuildRole(
          char,
          data,
        );
        if (result.success) {
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
      console.error("[GUILD] Error in update_guild_role socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("reorder_guild_roles", async ({ roles }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.reorderGuildRoles(char, {
          roles,
        });
        if (result.success) {
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
      console.error("[GUILD] Error in reorder_guild_roles socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_guild_tasks", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;

      const char = await gameManager.getCharacter(
        socket.user.id,
        socket.data.characterId,
      );

      if (!char || !char.state) {
        throw new Error("Character data not found or invalid");
      }

      const tasks = await gameManager.guildManager.getGuildTasks(char);
      socket.emit("guild_tasks_data", tasks);
    } catch (err) {
      console.error("[GUILD] Error in get_guild_tasks socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("contribute_to_guild_task", async ({ taskId, amount }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char || !char.state) {
          throw new Error("Character data not found or invalid");
        }
        const result = await gameManager.guildManager.contributeToTask(char, {
          taskId,
          amount,
        });
        socket.emit("guild_task_contribute_result", {
          success: true,
          tasks: result.tasks,
        });
        // Update status for inventory and possible GP/XP changes
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
      console.error("[GUILD] Error in contribute_to_guild_task socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("update_guild_settings", async ({ minLevel, joinMode }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.updateGuildSettings(
          char,
          { minLevel, joinMode },
        );
        if (result.success) {
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
      console.error("[GUILD] Error in update_guild_settings socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("delete_guild_role", async ({ roleId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.deleteGuildRole(char, {
          roleId,
        });
        if (result.success) {
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
      console.error("[GUILD] Error in delete_guild_role socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("kick_guild_member", async ({ memberId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.kickMember(char, {
          memberId: memberId,
        });
        if (result.success) {
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
      console.error("[GUILD] Error in kick_guild_member socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("upgrade_guild_building", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;

      const buildingType = typeof data === 'string' ? data : data?.buildingType;


      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.upgradeBuilding(
          char,
          data,
        );
        if (result.success) {
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
      console.error("[GUILD] Error in upgrade_guild_building socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("donate_to_guild_bank", async ({ silver, items }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.guildManager.donateToBank(char, {
          silver,
          items,
        });
        if (result.success) {
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
      console.error("[GUILD] Error in donate_to_guild_bank socket:", err);
      socket.emit("error", { message: err.message });
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

        // Name Validation
        const safeName = (newName || "").trim();
        if (safeName.length < 3 || safeName.length > 20) {
          throw new Error("Name must be between 3 and 20 characters.");
        }
        if (!/^[a-zA-Z0-9_ ]+$/.test(safeName)) {
          throw new Error(
            "Name can only contain letters, numbers, spaces, and underscores.",
          );
        }

        // Check Uniqueness handled by DB constraint unique violation (23505) but we can pre-check too
        // But let's trust the error handler we write below

        // Update in DB (Characters table 'name' column)
        // We need to update both the column AND the state if name is stored there (it's not usually, but good to check)

        const { error } = await supabase
          .from("characters")
          .update({ name: safeName })
          .eq("id", char.id);

        if (error) {
          if (error.code === "23505")
            throw new Error("Name already taken via DB Check.");
          throw error;
        }

        // Success
        char.name = safeName;
        char.state.pendingNameChange = false;

        await gameManager.saveState(char.id, char.state); // Save the flag removal

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

        // Validation
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

        // Validation: Only allow "1 - male" and "1 - female" by default
        // Others must be in unlockedAvatars array
        const freeAvatars = ["1 - male", "1 - female"];
        const unlocked = char.state.unlockedAvatars || [];

        // Extract filename from path/url if needed, but client sends the "preview" or path
        // For simplicity, we compare based on what the client sends.
        // Since the client uses filenames for selection, let's assume 'avatar' is the filename or includes it.
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

        // Update the avatar
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

        // Extrair o nome base sem /banner/ nem extensão pra verificar
        const filename = banner.split("/").pop();
        const baseName = filename.replace(/\.[^/.]+$/, "");

        const isFree = freeBanners.includes(baseName);
        const isUnlocked = unlocked.includes(filename);

        if (!isFree && !isUnlocked) {
          throw new Error(
            "This banner is locked! Unlock it first for 200 Orbs.",
          );
        }

        // Update the banner
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

        // Deduct Orbs
        char.state.orbs -= cost;

        // Unlock
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

        // Deduct Orbs
        char.state.orbs -= cost;

        // Unlock
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

        const premiumThemes = [
          "ember",
          "cyber",
          "rose",
          "nature",
          "arcane",
          "ice",
          "crimson",
        ];
        if (!premiumThemes.includes(themeId)) throw new Error("Invalid theme.");

        if (!char.state.unlockedThemes) {
          char.state.unlockedThemes = ["medieval", "dark", "light"];
        }

        if (char.state.unlockedThemes.includes(themeId)) {
          throw new Error("Theme already unlocked.");
        }

        const cost = 50;
        // Check Orbs
        if ((char.state.orbs || 0) < cost) {
          throw new Error(`Not enough Orbs! This theme costs ${cost} Orbs.`);
        }

        // Deduct Orbs
        char.state.orbs -= cost;

        // Unlock theme
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
      // If no character is selected, we just ignore it on the server
      // (the client now saves to Supabase metadata directly)
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;

      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) return; // No error needed here

        // Validation
        const unlocked = char.state.unlockedThemes || [
          "medieval",
          "dark",
          "light",
        ];
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

      // 1. Save to Supabase user_metadata for cross-device sync (Fallback/Legacy)
      try {
        const {
          data: { user },
          error: fetchError,
        } = await supabase.auth.admin.getUserById(socket.user.id);
        if (!fetchError) {
          const currentMetadata = user?.user_metadata || {};
          await supabase.auth.admin.updateUserById(socket.user.id, {
            user_metadata: {
              ...currentMetadata,
              game_settings: settings,
            },
          });
        }
      } catch (authErr) {
        console.warn(
          "[SETTINGS] Could not sync to user_metadata:",
          authErr.message,
        );
      }

      // 2. Save settings to dedicated column in 'characters' table
      if (socket.data.characterId && socket.data.characterId !== "undefined") {
        await gameManager.executeLocked(socket.user.id, async () => {
          const char = await gameManager.getCharacter(
            socket.user.id,
            socket.data.characterId,
          );
          if (char) {
            // Ensure state exists
            if (!char.state) char.state = {};
            char.state.settings = settings;

            // Mark dirty and save to cache
            gameManager.markDirty(char.id);
            await gameManager.saveState(char.id, char.state);
          }
        });
      }

      console.log(`[SETTINGS] Settings saved for user ${socket.user.email}`);
    } catch (err) {
      console.error("Set Settings Error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_public_profile", async ({ characterName }) => {
    try {
      console.log(`[SOCKET] get_public_profile for: ${characterName}`);
      const profile = await gameManager.getPublicProfile(characterName);
      socket.emit("public_profile_data", profile);
    } catch (err) {
      console.error("[SOCKET_ERROR] use_item:", err);
      socket.emit("error", {
        message: err.message || String(err),
        stack: err.stack,
        fullError: err,
      });
    }
  });

  socket.on("start_dungeon", async ({ dungeonId, repeatCount }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.startDungeon(
          socket.user.id,
          socket.data.characterId,
          dungeonId,
          repeatCount
        );
        socket.emit("dungeon_started", result);
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

  socket.on("stop_dungeon", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.stopDungeon(
          socket.user.id,
          socket.data.characterId,
        );
        socket.emit("dungeon_stopped", result);
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

  socket.on("stop_dungeon_queue", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.stopDungeonQueue(
          socket.user.id,
          socket.data.characterId,
        );
        socket.emit("dungeon_queue_stopped", result);
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

  socket.on("start_combat", async ({ tier, mobId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.startCombat(
          socket.user.id,
          socket.data.characterId,
          mobId,
          tier,
        );
        socket.emit("combat_started", result);
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
      console.error("Error starting combat:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("stop_combat", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const userId = socket.user.id;
        const result = await gameManager.stopCombat(
          userId,
          socket.data.characterId,
        );
        socket.emit("action_result", result);
        const status = await gameManager.getStatus(
          userId,
          true,
          socket.data.characterId,
        );
        socket.emit("status_update", status);
      });
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  // --- REST HEAL ---
  socket.on("rest_heal", async ({ percent }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const userId = socket.user.id;
        const char = await gameManager.getCharacter(
          userId,
          socket.data.characterId,
        );
        if (!char)
          return socket.emit("action_result", {
            restHealError: "Character not found.",
          });

        // Validate not in combat or dungeon
        if (char.state?.combat) {
          return socket.emit("action_result", {
            restHealError: "Cannot rest during combat!",
          });
        }
        if (char.state?.dungeon?.active) {
          return socket.emit("action_result", {
            restHealError: "Cannot rest during a dungeon!",
          });
        }

        // Already resting?
        if (char.state?.resting) {
          return socket.emit("action_result", {
            restHealError: "Already resting!",
          });
        }

        // Validate percent
        const validPercents = [10, 25, 50, 75, 100];
        if (!validPercents.includes(percent)) {
          return socket.emit("action_result", {
            restHealError: "Invalid heal percentage.",
          });
        }

        // Calculate heal
        const stats = gameManager.inventoryManager.calculateStats(char);
        const maxHp = stats.maxHP || 100;
        const currentHp = char.state.health || 0;
        const missingHp = Math.max(0, maxHp - currentHp);

        if (missingHp <= 0) {
          return socket.emit("action_result", {
            restHealError: "You are already at full health!",
          });
        }

        const targetHp = Math.ceil(maxHp * (percent / 100));
        const healAmount = Math.max(0, targetHp - currentHp);

        if (healAmount <= 0) {
          return socket.emit("action_result", {
            restHealError: "No healing needed for this amount.",
          });
        }

        const cost = healAmount * 3; // 3 silver per HP

        // Check silver
        const silver = char.state.silver || 0;
        if (silver < cost) {
          return socket.emit("action_result", {
            restHealError: "Not enough silver!",
          });
        }

        // Deduct silver upfront
        char.state.silver -= cost;

        // Calculate duration: 3 seconds per 1% of maxHP healed
        const durationSeconds =
          Math.max(1, Math.ceil((healAmount / maxHp) * 100)) * 3;
        const now = Date.now();

        // Save resting state (idle-compatible)
        char.state.resting = {
          startedAt: now,
          endsAt: now + durationSeconds * 1000,
          healAmount,
          cost,
          percent,
        };

        gameManager.markDirty(char.id);

        // Tax tracking
        await gameManager.updateGlobalTax(cost, "REST_HEAL");

        console.log(
          `[REST] ${char.name} started resting: heal ${healAmount} HP for ${cost} silver (${percent}%), duration ${durationSeconds}s`,
        );

        socket.emit("action_result", {
          restHealStarted: true,
          healAmount,
          cost,
          durationSeconds,
        });
        const status = await gameManager.getStatus(
          userId,
          true,
          socket.data.characterId,
        );
        socket.emit("status_update", status);
      });
    } catch (err) {
      console.error("Error in rest_heal:", err);
      socket.emit("action_result", { restHealError: err.message });
    }
  });

  // --- CANCEL REST ---
  socket.on("cancel_rest", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const userId = socket.user.id;
        const char = await gameManager.getCharacter(
          userId,
          socket.data.characterId,
        );
        if (!char || !char.state?.resting) return;

        // Refund silver
        char.state.silver = (char.state.silver || 0) + char.state.resting.cost;
        console.log(
          `[REST] ${char.name} cancelled resting, refunded ${char.state.resting.cost} silver`,
        );
        delete char.state.resting;
        gameManager.markDirty(char.id);

        const status = await gameManager.getStatus(
          userId,
          true,
          socket.data.characterId,
        );
        socket.emit("status_update", status);
      });
    } catch (err) {
      console.error("Error in cancel_rest:", err);
    }
  });

  // --- REST CHECK (client asks server to finalize completed rest) ---
  socket.on("rest_check", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      const userId = socket.user.id;
      const status = await gameManager.getStatus(
        userId,
        false,
        socket.data.characterId,
      );
      socket.emit("status_update", status);
    } catch (err) {
      console.error("Error in rest_check:", err);
    }
  });

  // --- EQUIPMENT LOCK HELPERS ---
  // Determines which equipment cannot be changed based on current activity
  const COMBAT_GEAR_TYPES = [
    "WEAPON",
    "ARMOR",
    "HELMET",
    "BOOTS",
    "GLOVES",
    "CAPE",
    "OFF_HAND",
  ];
  const FARM_TOOL_TYPES = [
    "TOOL",
    "TOOL_AXE",
    "TOOL_PICKAXE",
    "TOOL_KNIFE",
    "TOOL_SICKLE",
    "TOOL_ROD",
    "TOOL_POUCH",
  ];

  function checkEquipmentLock(char, itemType, itemId) {
    const inCombat = !!char.state?.combat;
    const inDungeon = !!char.state?.dungeon;
    const isFarming = !!char.current_activity;

    // Food is NEVER locked
    if (itemType === "FOOD") return null;

    // In Combat or Dungeon: lock gear + combat runes
    if (inCombat || inDungeon) {
      if (COMBAT_GEAR_TYPES.includes(itemType)) {
        return "Cannot change gear during combat! Flee or finish first.";
      }
      if (itemType === "RUNE" && itemId && itemId.includes("_COMBAT_")) {
        return "Cannot change combat runes during combat! Flee or finish first.";
      }
    }

    // In Farm activity: lock tools + farm runes
    if (isFarming) {
      if (FARM_TOOL_TYPES.includes(itemType)) {
        return "Cannot change tools during an activity! Stop the activity first.";
      }
      if (itemType === "RUNE" && itemId) {
        if (
          itemId.includes("_GATHERING_") ||
          itemId.includes("_REFINING_") ||
          itemId.includes("_TOOLS_")
        ) {
          return "Cannot change farm runes during an activity! Stop the activity first.";
        }
      }
    }

    return null;
  }

  // Same logic but by slot name (for unequip)
  const COMBAT_GEAR_SLOTS = [
    "mainHand",
    "offHand",
    "chest",
    "helmet",
    "boots",
    "gloves",
    "cape",
  ];
  const FARM_TOOL_SLOTS = [
    "tool",
    "tool_axe",
    "tool_pickaxe",
    "tool_knife",
    "tool_sickle",
    "tool_rod",
    "tool_pouch",
  ];

  function checkEquipmentLockBySlot(char, slot) {
    const inCombat = !!char.state?.combat;
    const inDungeon = !!char.state?.dungeon;
    const isFarming = !!char.current_activity;

    if (slot === "food") return null;

    if (inCombat || inDungeon) {
      if (COMBAT_GEAR_SLOTS.includes(slot)) {
        return "Cannot change gear during combat! Flee or finish first.";
      }
      if (slot.startsWith("rune_COMBAT_")) {
        return "Cannot change combat runes during combat! Flee or finish first.";
      }
    }

    if (isFarming) {
      if (FARM_TOOL_SLOTS.includes(slot)) {
        return "Cannot change tools during an activity! Stop the activity first.";
      }
      if (
        slot.startsWith("rune_GATHERING_") ||
        slot.startsWith("rune_REFINING_") ||
        slot.startsWith("rune_TOOLS_")
      ) {
        return "Cannot change farm runes during an activity! Stop the activity first.";
      }
    }

    return null;
  }

  socket.on("equip_item", async ({ itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char) {
          const item = gameManager.inventoryManager.resolveItem(itemId);
          if (item) {
            const lockError = checkEquipmentLock(char, item.type, itemId);
            if (lockError) {
              socket.emit("action_result", {
                success: false,
                message: lockError,
              });
              return;
            }
          }
        }
        const result = await gameManager.equipItem(
          socket.user.id,
          socket.data.characterId,
          itemId,
          quantity,
        );
        socket.emit("item_equipped", result);
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

  socket.on("switch_equipment_set", async ({ setIndex }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (
          char &&
          (char.state?.combat || char.state?.dungeon || char.current_activity)
        ) {
          socket.emit("action_result", {
            success: false,
            message: "Cannot switch equipment sets during an activity!",
          });
          return;
        }
        const result = await gameManager.inventoryManager.switchEquipmentSet(
          socket.user.id,
          socket.data.characterId,
          setIndex,
        );
        socket.emit("equipment_set_switched", result);
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

  socket.on("unlock_equipment_set", async ({ setIndex }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.inventoryManager.unlockEquipmentSet(
          socket.user.id,
          socket.data.characterId,
          setIndex,
        );
        socket.emit("equipment_set_unlocked", result);
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

  socket.on("unequip_item", async ({ slot }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char) {
          const lockError = checkEquipmentLockBySlot(char, slot);
          if (lockError) {
            socket.emit("action_result", {
              success: false,
              message: lockError,
            });
            return;
          }
        }
        const result = await gameManager.unequipItem(
          socket.user.id,
          socket.data.characterId,
          slot,
        );
        socket.emit("item_unequipped", result);
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
      console.error("Error unequipping item:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // --- WORLD BOSS ---
  socket.on("get_world_boss_status", async () => {
    try {
      // console.log(`[WORLD_BOSS] get_status called for char: ${socket.data?.characterId}`);
      if (!socket.data?.characterId) {
        console.warn("[WORLD_BOSS] get_status: No characterId on socket!");
        return;
      }
      const status = await gameManager.worldBossManager.getStatus(
        socket.data.characterId,
      );
      socket.emit("world_boss_status", status);
      // console.log('[WORLD_BOSS] status sent to client.');
    } catch (err) {
      console.error("[WORLD_BOSS] get_status error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_world_boss_ranking_history", async ({ date }) => {
    try {
      const rankings =
        await gameManager.worldBossManager.getRankingHistory(date);
      socket.emit("world_boss_ranking_history", { date, rankings });
    } catch (err) {
      console.error("[WORLD_BOSS] history error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("challenge_world_boss", async () => {
    console.log(
      `[WORLD_BOSS] challenge_world_boss event received! charId=${socket.data?.characterId}`,
    );
    try {
      if (!socket.data.characterId) return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.worldBossManager.startFight(char);
        socket.emit("world_boss_started", result);
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

  socket.on("sell_item", async ({ itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.sellItem(
          socket.user.id,
          socket.data.characterId,
          itemId,
          quantity,
        );
        socket.emit("item_sold", result);
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

  socket.on("dismantle_item", async ({ itemId, quantity = 1 }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.dismantleItem(
          socket.user.id,
          socket.data.characterId,
          itemId,
          quantity,
        );
        socket.emit("item_dismantled", result);
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

  // --- BANK SYSTEM ---
  socket.on("deposit_to_bank", async ({ itemId, quantity = 1 }) => {
    try {
      console.log(
        `[BANK] Deposit request: charId=${socket.data.characterId}, itemId=${itemId}, qty=${quantity}`,
      );
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        if (!char.state.bank) char.state.bank = { items: {}, slots: 10 };
        const bank = char.state.bank;
        if (!bank.items) bank.items = {}; // Ensure items exists

        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;

        // Validate item exists in inventory
        const entry = inv[itemId];
        if (!entry) throw new Error("You don't have this item");

        const availableQty =
          typeof entry === "object" ? entry.amount || 0 : Number(entry) || 0;
        if (availableQty < 1)
          throw new Error("You don't have enough of this item");

        const qty = Math.min(quantity, availableQty);
        console.log(
          `[BANK] Depositing ${qty} of ${itemId}. Available: ${availableQty}`,
        );

        // Check bank slots
        const usedBankSlots = Object.keys(bank.items || {}).filter((k) => {
          const e = bank.items[k];
          return typeof e === "object"
            ? (e.amount || 0) > 0
            : (Number(e) || 0) > 0;
        }).length;

        const bankEntry = bank.items[itemId];
        const isNewSlot =
          !bankEntry ||
          (typeof bankEntry === "object"
            ? (bankEntry.amount || 0) <= 0
            : (Number(bankEntry) || 0) <= 0);

        if (isNewSlot && usedBankSlots >= (bank.slots || 10)) {
          socket.emit("action_result", {
            success: false,
            message: `Bank is full! (${usedBankSlots}/${bank.slots || 10} slots)`,
          });
          return;
        }

        // Prepare metadata if it's an object
        let metadata = null;
        if (typeof entry === "object") {
          metadata = { ...entry };
          delete metadata.amount;
        }

        // Transfer item: remove from inventory
        if (typeof entry === "object") {
          entry.amount = (entry.amount || 0) - qty;
          if (entry.amount <= 0) delete inv[itemId];
        } else {
          inv[itemId] = (Number(inv[itemId]) || 0) - qty;
          if (inv[itemId] <= 0) delete inv[itemId];
        }

        // Add to bank
        if (metadata) {
          if (!bank.items[itemId] || typeof bank.items[itemId] !== "object") {
            bank.items[itemId] = { amount: 0 };
          }
          Object.assign(bank.items[itemId], metadata);
          bank.items[itemId].amount = (bank.items[itemId].amount || 0) + qty;
        } else {
          if (typeof bank.items[itemId] === "object") {
            bank.items[itemId].amount = (bank.items[itemId].amount || 0) + qty;
          } else {
            bank.items[itemId] = (Number(bank.items[itemId]) || 0) + qty;
          }
        }

        gameManager.markDirty(char.id);
        const status = await gameManager.getStatus(
          socket.user.id,
          false,
          socket.data.characterId,
        );
        console.log(
          `[BANK] Deposit success. Inventory items: ${Object.keys(char.state.inventory).length}, Bank items: ${Object.keys(char.state.bank.items).length}`,
        );

        socket.emit("action_result", {
          success: true,
          message: `Deposited ${qty}x ${itemId} to bank.`,
        });
        socket.emit("status_update", status);
      });
    } catch (err) {
      console.error("[BANK-DEPOSIT-ERROR]", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("withdraw_from_bank", async ({ itemId, quantity = 1 }) => {
    try {
      console.log(
        `[BANK] Withdraw request: charId=${socket.data.characterId}, itemId=${itemId}, qty=${quantity}`,
      );
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        if (!char.state.bank) char.state.bank = { items: {}, slots: 10 };
        const bank = char.state.bank;
        if (!bank.items) bank.items = {}; // Ensure items exists

        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;

        // Validate item exists in bank
        const bankEntry = bank.items[itemId];
        if (!bankEntry) throw new Error("Item not found in bank");

        const bankQty =
          typeof bankEntry === "object"
            ? bankEntry.amount || 0
            : Number(bankEntry) || 0;
        if (bankQty < 1)
          throw new Error("You don't have enough of this item in the bank");

        const qty = Math.min(quantity, bankQty);
        console.log(
          `[BANK] Withdrawing ${qty} of ${itemId}. Available in bank: ${bankQty}`,
        );

        // Check inventory space
        const invManager = gameManager.inventoryManager;
        const entryInInv = inv[itemId];
        const isNewInvSlot =
          !entryInInv ||
          (typeof entryInInv === "object"
            ? (entryInInv.amount || 0) <= 0
            : (Number(entryInInv) || 0) <= 0);
        const itemData = invManager.resolveItem(itemId);

        if (isNewInvSlot && itemData && !itemData.noInventorySpace) {
          if (invManager.getUsedSlots(char) >= invManager.getMaxSlots(char)) {
            socket.emit("action_result", {
              success: false,
              message: "Inventory is full!",
            });
            return;
          }
        }

        // Prepare metadata
        let metadata = null;
        if (typeof bankEntry === "object") {
          metadata = { ...bankEntry };
          delete metadata.amount;
        }

        // Transfer: remove from bank
        if (typeof bankEntry === "object") {
          bankEntry.amount = (bankEntry.amount || 0) - qty;
          if (bankEntry.amount <= 0) delete bank.items[itemId];
        } else {
          bank.items[itemId] = (Number(bank.items[itemId]) || 0) - qty;
          if (bank.items[itemId] <= 0) delete bank.items[itemId];
        }

        // Add to inventory
        if (metadata) {
          if (!inv[itemId] || typeof inv[itemId] !== "object") {
            inv[itemId] = { amount: 0 };
          }
          Object.assign(inv[itemId], metadata);
          inv[itemId].amount = (inv[itemId].amount || 0) + qty;
        } else {
          if (typeof inv[itemId] === "object") {
            inv[itemId].amount = (inv[itemId].amount || 0) + qty;
          } else {
            inv[itemId] = (Number(inv[itemId]) || 0) + qty;
          }
        }

        gameManager.markDirty(char.id);
        const status = await gameManager.getStatus(
          socket.user.id,
          false,
          socket.data.characterId,
        );
        console.log(
          `[BANK] Withdraw success. Inventory items: ${Object.keys(char.state.inventory).length}, Bank items: ${Object.keys(char.state.bank.items).length}`,
        );

        socket.emit("action_result", {
          success: true,
          message: `Withdrew ${qty}x ${itemId} from bank.`,
        });
        socket.emit("status_update", status);
      });
    } catch (err) {
      console.error("[BANK-WITHDRAW-ERROR]", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("buy_bank_slot", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        if (!char.state.bank) char.state.bank = { items: {}, slots: 10 };
        const bank = char.state.bank;
        const currentSlots = bank.slots || 10;

        if (currentSlots >= 50) {
          socket.emit("action_result", {
            success: false,
            message: "Bank is already at maximum capacity (50 slots)!",
          });
          return;
        }

        // Cost: slot 11 = 10,000, slot 12 = 15,000, slot 13 = 20,000, etc.
        const cost = 10000 + (currentSlots - 10) * 5000;
        const silver = char.state.silver || 0;

        if (silver < cost) {
          socket.emit("action_result", {
            success: false,
            message: `Not enough Silver! Need ${formatNumber(cost)} (you have ${formatNumber(silver)})`,
          });
          return;
        }

        char.state.silver -= cost;
        bank.slots = currentSlots + 1;

        gameManager.markDirty(char.id);
        socket.emit("action_result", {
          success: true,
          message: `Bank expanded to ${bank.slots} slots! (-${formatNumber(cost)} Silver)`,
        });
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            false,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("use_item", async ({ itemId, quantity = 1 }) => {
    console.log(`[DEBUG-SOCKET] Received use_item for ${itemId}`, quantity);
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.consumeItem(
          socket.user.id,
          socket.data.characterId,
          itemId,
          quantity,
        );
        socket.emit("item_used", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            false,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("stop_activity", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.stopActivity(socket.user.id, socket.data.characterId);
        socket.emit("activity_stopped");
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

  const TUTORIAL_STEP_ORDER = [
    "OPEN_INVENTORY",
    "SELECT_CHEST",
    "OPEN_CHEST",
    "CLAIM_LOOT",
    "OPEN_PROFILE",
    "EQUIP_WEAPON",
    "SELECT_WEAPON",
    "EQUIP_FOOD",
    "SELECT_FOOD",
    "MERGE_RUNES_1",
    "OPEN_RUNE_FORGE",
    "CREATE_RUNE",
    "FORGE_SELECT_MAX",
    "FORGE_SELECT_GATHERING",
    "FORGE_CONFIRM",
    "CLAIM_FORGE_RESULTS",
    "OPEN_RUNE_TAB",
    "SELECT_MERGE_RUNE",
    "CONFIRM_MERGE_SELECTION",
    "FINAL_MERGE_CLICK",
    "VIEW_MERGE_RESULTS",
    "CLOSE_FINAL_MODAL",
    "EQUIP_RUNE_PROFILE",
    "PROFILE_RUNE_TAB",
    "SELECT_RUNE_SLOT",
    "CONFIRM_EQUIP_RUNE",
    "GO_TO_COMBAT",
    "SELECT_COMBAT_CATEGORY",
    "START_FIRST_MOB",
    "TUTORIAL_FINAL_MESSAGE",
    "COMPLETED",
  ];

  socket.on("complete_tutorial_step", async ({ step }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not found");

        const currentIndex = TUTORIAL_STEP_ORDER.indexOf(
          char.state.tutorialStep || "OPEN_INVENTORY",
        );
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

  socket.on("get_market_listings", async (filters) => {
    try {
      // Note: getMarketListings does NOT require a characterId.
      const listings = await gameManager.getMarketListings(filters);
      socket.emit("market_listings_update", listings);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // Get lowest market price and highest buy order for a specific item
  socket.on("get_item_market_price", async ({ itemId }) => {
    try {
      // Strip signature if present
      const baseId = itemId.split("::")[0];

      // Extract quality/stars if encoded in itemId (e.g. T4_SWORD_Q2)
      let quality, stars;
      if (itemId.includes("_Q")) quality = parseInt(itemId.split("_Q")[1]);
      if (itemId.includes("_S")) stars = parseInt(itemId.split("_S")[1]);

      // 1. Get Lowest Sell Price
      const { data: listings } = await supabase
        .from("market_listings")
        .select("price, amount, item_id, item_data")
        .or(`item_id.eq.${baseId},item_id.like.${baseId}::%`);

      let lowestPrice = null;
      if (listings && listings.length > 0) {
        const filtered = listings.filter((l) => {
          if (quality !== undefined && l.item_data?.quality !== quality)
            return false;
          if (stars !== undefined && l.item_data?.stars !== stars) return false;
          return true;
        });
        if (filtered.length > 0) {
          const unitPrices = filtered.map((l) =>
            Math.floor(l.price / l.amount),
          );
          lowestPrice = Math.min(...unitPrices);
        }
      }

      // 2. Get Highest Buy Order
      const { data: buyOrders } = await supabase
        .from("market_buy_orders")
        .select("price_per_unit, item_data")
        .eq("item_id", baseId)
        .eq("status", "ACTIVE");

      let highestBuyOrder = null;
      if (buyOrders && buyOrders.length > 0) {
        const filtered = buyOrders.filter((o) => {
          if (quality !== undefined && o.item_data?.quality !== quality)
            return false;
          if (stars !== undefined && o.item_data?.stars !== stars) return false;
          return true;
        });
        if (filtered.length > 0) {
          const prices = filtered.map((o) => o.price_per_unit);
          highestBuyOrder = Math.max(...prices);
        }
      }

      socket.emit("item_market_price", {
        itemId,
        lowestPrice,
        highestBuyOrder,
      });
    } catch (err) {
      console.error("[MARKET PRICE] Error:", err);
      socket.emit("item_market_price", {
        itemId,
        lowestPrice: null,
        highestBuyOrder: null,
      });
    }
  });

  socket.on("list_market_item", async ({ itemId, amount, price, metadata }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.listMarketItem(
          socket.user.id,
          socket.data.characterId,
          itemId,
          amount,
          price,
          metadata,
        );
        socket.emit("market_action_success", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
        // Broadcast update to all
        const listings = await gameManager.getMarketListings();
        io.emit("market_listings_update", listings);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on("buy_market_item", async ({ listingId, quantity }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.buyMarketItem(
          socket.user.id,
          socket.data.characterId,
          listingId,
          quantity,
        );
        socket.emit("market_action_success", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
        // Broadcast update to all
        const listings = await gameManager.getMarketListings();
        io.emit("market_listings_update", listings);
      });
    } catch (err) {
      console.error("Buy Error:", err);
      socket.emit("error", { message: err.message });
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on("cancel_listing", async ({ listingId }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.cancelMarketListing(
          socket.user.id,
          socket.data.characterId,
          listingId,
        );
        socket.emit("market_action_success", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
        // Broadcast update to all
        const listings = await gameManager.getMarketListings();
        io.emit("market_listings_update", listings);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on("get_buy_orders", async (filters) => {
    try {
      const orders = await gameManager.marketManager.getBuyOrders(filters);
      socket.emit("buy_orders_update", orders);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("create_buy_order", async ({ itemId, amount, pricePerUnit }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.createBuyOrder(
          socket.user.id,
          socket.data.characterId,
          itemId,
          amount,
          pricePerUnit,
        );
        socket.emit("market_action_success", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );

        // Broadcast update
        const orders = await gameManager.marketManager.getBuyOrders();
        io.emit("buy_orders_update", orders);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on("fill_buy_order", async ({ orderId, quantity }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.fillBuyOrder(
          socket.user.id,
          socket.data.characterId,
          orderId,
          quantity,
        );
        socket.emit("market_action_success", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );

        // Broadcast update
        const orders = await gameManager.marketManager.getBuyOrders();
        io.emit("buy_orders_update", orders);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on("cancel_buy_order", async ({ orderId }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.cancelBuyOrder(
          socket.user.id,
          socket.data.characterId,
          orderId,
        );
        socket.emit("market_action_success", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );

        // Broadcast update
        const orders = await gameManager.marketManager.getBuyOrders();
        io.emit("buy_orders_update", orders);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on(
    "craft_rune",
    async ({ shardId, qty = 1, category = "GATHERING" }) => {
      console.log(
        `[SERVER] Received craft_rune request from ${socket.user.email} for shard ${shardId}, qty ${qty}, category ${category}`,
      );
      try {
        await gameManager.executeLocked(socket.user.id, async () => {
          const result = await gameManager.craftRune(
            socket.user.id,
            socket.data.characterId,
            shardId,
            qty,
            category,
          );
          if (result.success) {
            socket.emit("craft_rune_success", result);
            socket.emit(
              "status_update",
              await gameManager.getStatus(
                socket.user.id,
                true,
                socket.data.characterId,
              ),
            );
          } else {
            socket.emit("error", { message: result.error });
          }
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    },
  );

  socket.on("upgrade_rune", async ({ runeId, qty = 1 }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.upgradeRune(
          socket.user.id,
          socket.data.characterId,
          runeId,
          qty,
        );
        if (result.success) {
          socket.emit("craft_rune_success", result); // Reusing same success event since structure is similar
          socket.emit(
            "status_update",
            await gameManager.getStatus(
              socket.user.id,
              true,
              socket.data.characterId,
            ),
          );
        } else {
          socket.emit("error", { message: result.error });
        }
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("auto_merge_runes", async ({ filters = {} } = {}) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.autoMergeRunes(
          socket.user.id,
          socket.data.characterId,
          filters,
        );
        socket.emit("craft_rune_success", result);
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

  socket.on("unequip_all_runes", async ({ type }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char) {
          const inCombat = !!char.state?.combat || !!char.state?.dungeon;
          const isFarming = !!char.current_activity;
          if (inCombat && type?.toUpperCase() === "COMBAT") {
            socket.emit("action_result", {
              success: false,
              message: "Cannot change combat runes during combat!",
            });
            return;
          }
          if (
            isFarming &&
            ["GATHERING", "REFINING", "TOOLS"].includes(type?.toUpperCase())
          ) {
            socket.emit("action_result", {
              success: false,
              message: "Cannot change farm runes during an activity!",
            });
            return;
          }
        }
        const result = await gameManager.inventoryManager.unequipAllRunes(
          socket.user.id,
          socket.data.characterId,
          type,
        );
        if (result.success) {
          socket.emit("action_success", {
            message: `Unequipped all ${type} runes.`,
          });
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
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("auto_equip_runes", async ({ type }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char) {
          const inCombat = !!char.state?.combat || !!char.state?.dungeon;
          const isFarming = !!char.current_activity;
          if (inCombat && type?.toUpperCase() === "COMBAT") {
            socket.emit("action_result", {
              success: false,
              message: "Cannot change combat runes during combat!",
            });
            return;
          }
          if (
            isFarming &&
            ["GATHERING", "REFINING", "TOOLS"].includes(type?.toUpperCase())
          ) {
            socket.emit("action_result", {
              success: false,
              message: "Cannot change farm runes during an activity!",
            });
            return;
          }
        }
        const result = await gameManager.inventoryManager.autoEquipRunes(
          socket.user.id,
          socket.data.characterId,
          type,
        );
        if (result.success) {
          socket.emit("action_success", {
            message: `Auto-equipped best ${type} runes.`,
          });
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
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("claim_market_item", async ({ claimId }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.claimMarketItem(
          socket.user.id,
          socket.data.characterId,
          claimId,
        );
        socket.emit("market_action_success", result);
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
      try {
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      } catch (e) { }
    }
  });

  socket.on("get_chat_history", async () => {
    try {
      // Fetch 50 messages for each main channel separately so slow channels don't get buried
      const channels = ["GLOBAL", "PTBR", "TRADE"];
      const queries = channels.map((ch) =>
        supabase
          .from("messages")
          .select("*")
          .eq("channel", ch)
          .order("created_at", { ascending: false })
          .limit(50),
      );

      // Fetch System messages specifically meant for this user or public
      const systemQuery = supabase
        .from("messages")
        .select("*")
        .or(
          `and(channel.eq.SYSTEM,user_id.eq.${socket.user.id}),and(channel.eq.SYSTEM,user_id.is.null)`,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      queries.push(systemQuery);

      // Fetch Guild channel messages if the player is in a guild
      const charId = socket.data.characterId;
      if (charId) {
        const char = await gameManager.getCharacter(socket.user.id, charId);
        if (char && char.state && char.state.guild_id) {
          const guildChannelId = `Guild-${char.state.guild_id}`;
          const guildQuery = supabase
            .from("messages")
            .select("*")
            .eq("channel", guildChannelId)
            .order("created_at", { ascending: false })
            .limit(50);

          queries.push(guildQuery);
        }
      }

      const results = await Promise.all(queries);

      // Collect all data, flattening the results
      let allMessages = [];
      for (const res of results) {
        if (res.error)
          console.error("Error fetching chat channel history:", res.error);
        if (res.data) {
          // Normalize the Guild channel name for the client so it appears in the "Guild" tab
          const normalized = res.data.map((msg) => ({
            ...msg,
            channel: msg.channel?.startsWith("Guild-") ? "Guild" : msg.channel,
          }));
          allMessages = allMessages.concat(normalized);
        }
      }

      // Sort everything chronologically and deduplicate by ID before sending
      allMessages.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );

      const finalMessages = [];
      const seenIds = new Set();
      for (const m of allMessages) {
        if (m.id && !seenIds.has(m.id)) {
          seenIds.add(m.id);
          finalMessages.push(m);
        }
      }

      socket.emit("chat_history", finalMessages);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  });

  socket.on("get_combat_history", async () => {
    try {
      // Fix: Fetch history for the SELECTED character
      const charId = socket.data.characterId;
      if (!charId) return;

      const { data, error } = await supabase
        .from("combat_history")
        .select("*")
        .eq("character_id", charId)
        .order("occurred_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      socket.emit("combat_history_update", data);
    } catch (err) {
      console.error("Error fetching combat history:", err);
      socket.emit("error", { message: "Failed to fetch combat history" });
    }
  });

  socket.on("get_dungeon_history", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId) return;

      const { data, error } = await supabase
        .from("dungeon_history")
        .select("*")
        .eq("character_id", charId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      socket.emit("dungeon_history_update", data);
    } catch (err) {
      console.error("Error fetching dungeon history:", err);
      socket.emit("error", {
        message: `Failed to fetch dungeon history: ${err.message}`,
      });
    }
  });

  socket.on("get_market_history", async () => {
    try {
      const history = await gameManager.marketManager.getGlobalHistory();
      socket.emit("market_history_update", history);
    } catch (err) {
      console.error("[SOCKET] Error getting market history:", err);
      socket.emit("error", { message: "Failed to fetch market history." });
    }
  });

  socket.on("get_my_market_history", async () => {
    try {
      const history = await gameManager.marketManager.getPersonalHistory(
        socket.user.id,
      );
      socket.emit("my_market_history_update", history);
    } catch (err) {
      console.error("[SOCKET] Error getting personal market history:", err);
      socket.emit("error", { message: "Failed to fetch your market history." });
    }
  });

  socket.on("get_my_trade_history", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId) return;
      const history =
        await gameManager.tradeManager.getPersonalTradeHistory(charId);
      socket.emit("my_trade_history_update", history);
    } catch (err) {
      console.error("[SOCKET] Error getting personal trade history:", err);
      socket.emit("error", { message: "Failed to fetch your trade history." });
    }
  });

  // --- DAILY SPIN EVENTS ---
  socket.on("request_daily_status", async () => {
    // FIX: Use executeLocked to prevent race condition with join_character catchup
    await gameManager.executeLocked(socket.user.id, async () => {
      const char = await gameManager.getCharacter(
        socket.user.id,
        socket.data.characterId,
      );
      if (!char) return;

      const canSpin = await gameManager.dailyRewardManager.canSpin(char);
      console.log(
        `[SOCKET] Daily status requested for user ${socket.user.email} (char ${socket.data.characterId}): canSpin=${canSpin}`,
      );
      socket.emit("daily_status", { canSpin });
    });
  });

  socket.on("spin_daily", async () => {
    if (socket.user.is_anonymous) {
      return socket.emit("error", {
        message: "Daily Spin is locked for Guest accounts.",
      });
    }
    // FIX: Use executeLocked to prevent race condition
    await gameManager.executeLocked(socket.user.id, async () => {
      const char = await gameManager.getCharacter(
        socket.user.id,
        socket.data.characterId,
      );
      if (!char) return;

      try {
        const result = await gameManager.dailyRewardManager.spin(char);
        if (result.success) {
          // Return result to client
          socket.emit("daily_spin_result", result);
          // Also update status immediately (crucial for showing new orbs/items)
          socket.emit(
            "status_update",
            await gameManager.getStatus(
              socket.user.id,
              true,
              socket.data.characterId,
            ),
          );
          socket.emit("daily_status", { canSpin: false });
        } else {
          socket.emit("error", { message: result.error });
        }
      } catch (err) {
        console.error("Daily spin error:", err);
        socket.emit("error", { message: "Failed to process daily spin." });
      }
    });
  });

  socket.on("send_message", async ({ content, channel = "GLOBAL" }) => {
    try {
      // Guest check: Prevent anonymous users from sending messages
      if (socket.user.is_anonymous) {
        socket.emit("error", {
          message:
            "Guest accounts cannot send messages. Please register to chat!",
        });
        return;
      }

      const char = await gameManager.getCharacter(
        socket.user.id,
        socket.data.characterId,
      );
      if (!char) return;

      // Cooldown Check (10s)
      const lastChat = socket.data.lastChatTime || 0;
      const now = Date.now();
      const IS_ADMIN = !!char.is_admin;

      if (now - lastChat < 10000 && !IS_ADMIN && channel !== "Guild") {
        // Allow commands to bypass cooldown
        if (!content.startsWith("/")) {
          const remaining = Math.ceil((10000 - (now - lastChat)) / 1000);
          socket.emit("error", {
            message: `Chat cooldown: Wait ${remaining}s`,
          });
          return;
        }
      }

      // check for commands
      if (content.startsWith("/")) {
        const parts = content.slice(1).trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        const result = await gameManager.adminManager.handleCommand(
          socket,
          command,
          args,
        );

        if (result.success) {
          // 1. Create message object
          const sysMsg = {
            user_id: socket.user.id,
            sender_name: "[SYSTEM]",
            content: result.message || "Command executed successfully.",
            channel: "SYSTEM",
          };

          // 2. Persist to DB for history
          const { data, error } = await supabase
            .from("messages")
            .insert(sysMsg)
            .select()
            .single();

          // 3. Send feedback as a system message in chat
          socket.emit(
            "new_message",
            data || {
              ...sysMsg,
              id: "sys-" + Date.now(),
              created_at: new Date().toISOString(),
            },
          );
        } else {
          // 1. Create error object
          const errMsg = {
            user_id: socket.user.id,
            sender_name: "[ERROR]",
            content: result.error || "Command failed.",
            channel: "SYSTEM",
          };

          // 2. Persist to DB for history
          const { data, error } = await supabase
            .from("messages")
            .insert(errMsg)
            .select()
            .single();

          // 3. Send error as a system message in chat
          socket.emit(
            "new_message",
            data || {
              ...errMsg,
              id: "err-" + Date.now(),
              created_at: new Date().toISOString(),
            },
          );
        }
        return; // Do not broadcast commands to global chat
      }

      // char is already fetched above for the permission check

      if (channel !== "Guild") {
        socket.data.lastChatTime = now;
      }

      // Enforce character limit (Bypass for admins)
      if (content.length > 100 && !char.is_admin) {
        content = content.substring(0, 100);
      }

      // Reject Guild messages if the user is not in a guild
      if (channel === "Guild" && !char.state?.guild_id) {
        socket.emit("error", {
          message: "You must be in a guild to use the Guild chat.",
        });
        return;
      }

      // We attempt to insert with channel. If it fails due to missing column, we fallback.
      let insertData = {
        user_id: socket.user.id,
        sender_name: char.name,
        content: content,
        channel:
          channel === "Guild" && char.state?.guild_id
            ? `Guild-${char.state.guild_id}`
            : channel,
      };

      const { data, error } = await supabase
        .from("messages")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // If column doesn't exist, remove it and try again without channel persistence
        if (error.code === "42703") {
          // undefined_column
          delete insertData.channel;
          const { data: retryData, error: retryError } = await supabase
            .from("messages")
            .insert(insertData)
            .select()
            .single();
          if (retryError) throw retryError;

          // Manually add channel to broadcast data even if not persisted
          retryData.channel = channel;
          if (!retryData.created_at) retryData.created_at = new Date().toISOString();

          if (channel === "Guild" && char.state.guild_id) {
            gameManager.broadcastToGuild(
              char.state.guild_id,
              "new_message",
              retryData,
            );
          } else {
            io.emit("new_message", retryData);
          }
        } else {
          throw error;
        }
      } else {
        // Force include channel in case select() didn't pick it up (schema cache)
        const outData = { ...data, channel: data.channel || channel };
        if (!outData.created_at) outData.created_at = new Date().toISOString();

        if (channel === "Guild" && char.state.guild_id) {
          outData.channel = "Guild"; // Normalize for the client
          gameManager.broadcastToGuild(
            char.state.guild_id,
            "new_message",
            outData,
          );
        } else {
          io.emit("new_message", outData);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      socket.emit("error", { message: "Error sending message" });
    }
  });

  // --- TRADE EVENTS ---
  socket.on("trade_search_player", async ({ nickname }) => {
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("id, name, state, skills")
        .ilike("name", `%${nickname}%`)
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) {
        socket.emit("error", {
          message: "No players found matching that name.",
        });
        return;
      }

      const results = data.map((char) => {
        const skills = char.skills || char.state?.skills || {};
        const level = Object.values(skills).reduce(
          (acc, s) => acc + (Number(s?.level) || 0),
          0,
        );
        return {
          id: char.id,
          name: char.name,
          level: Math.max(1, level),
          isIronman: !!(
            char.state?.isIronman ||
            char.name?.toLowerCase() === "ironman" ||
            char.name?.toLowerCase().startsWith("[im]")
          ),
        };
      });

      socket.emit("trade_search_result", results);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("trade_create", async ({ receiverName }) => {
    try {
      if (!socket.user) throw new Error("Not authenticated.");
      if (socket.user.is_anonymous)
        throw new Error("Trading is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) throw new Error("Character not loaded.");
        const trade = await gameManager.tradeManager.createTrade(
          char,
          receiverName,
        );
        socket.emit("trade_update", trade);

        // Notify receiver if online
        const receiverSockets = Array.from(connectedSockets.values()).filter(
          (s) => s.data.characterId === trade.receiver_id,
        );
        receiverSockets.forEach((s) => s.emit("trade_invite", trade));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("trade_get_active", async () => {
    fetchAndEmitTradeList(socket, socket.data.characterId);
  });

  socket.on("trade_update_offer", async ({ tradeId, items, silver }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Trading is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const trade = await gameManager.tradeManager.updateOffer(
          char,
          tradeId,
          items,
          silver,
        );

        // Notify both if online
        const affectedIds = [trade.sender_id, trade.receiver_id];
        Array.from(connectedSockets.values())
          .filter((s) => affectedIds.includes(s.data.characterId))
          .forEach((s) => s.emit("trade_update", trade));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("trade_accept", async ({ tradeId }) => {
    try {
      if (socket.user.is_anonymous)
        throw new Error("Trading is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.tradeManager.acceptTrade(
          char,
          tradeId,
        );

        // Notify both if online
        const affectedIds = [result.sender_id, result.receiver_id];
        const socketsToNotify = Array.from(connectedSockets.values()).filter(
          (s) => affectedIds.includes(s.data.characterId),
        );

        socketsToNotify.forEach((s) => {
          s.emit("trade_update", result);
          if (result.status === "COMPLETED") {
            s.emit("trade_success", {
              message: "Trade completed successfully!",
            });
            // Push full status update to refresh inventory/silver
            gameManager
              .getStatus(s.user.id, true, s.data.characterId)
              .then((status) => {
                s.emit("status_update", status);
              });
          }
        });
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("trade_cancel", async ({ tradeId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.tradeManager.cancelTrade(
          char,
          tradeId,
        );

        // Notify both if online
        const affectedIds = [result.sender_id, result.receiver_id];
        Array.from(connectedSockets.values())
          .filter((s) => affectedIds.includes(s.data.characterId))
          .forEach((s) =>
            s.emit("trade_update", { id: tradeId, status: "CANCELLED" }),
          );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // --- SOCIAL / FRIENDS EVENTS ---
  socket.on("get_friends", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId) return;
      const friends = await gameManager.socialManager.getFriends(charId);
      socket.emit("friends_list_update", friends);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("add_friend", async ({ friendName }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        await gameManager.socialManager.sendFriendRequest(char, friendName);
        socket.emit("friend_action_success", {
          message: `Request sent to ${friendName}!`,
        });
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("respond_friend_request", async ({ requestId, accept }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        const result = await gameManager.socialManager.respondToRequest(
          charId,
          requestId,
          accept,
        );
        socket.emit("friend_action_success", {
          message: accept ? "Request accepted!" : "Request rejected.",
        });

        // Refresh list
        const friends = await gameManager.socialManager.getFriends(charId);
        socket.emit("friends_list_update", friends);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("remove_friend", async ({ friendId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        await gameManager.socialManager.removeFriend(charId, friendId);
        socket.emit("friend_action_success", { message: "Friend removed." });

        // Refresh list
        const friends = await gameManager.socialManager.getFriends(charId);
        socket.emit("friends_list_update", friends);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("cancel_friend_request", async ({ requestId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        await gameManager.socialManager.cancelFriendRequest(charId, requestId);
        socket.emit("friend_action_success", { message: "Request cancelled." });

        // Refresh list
        const friends = await gameManager.socialManager.getFriends(charId);
        socket.emit("friends_list_update", friends);
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("request_best_friend", async ({ friendId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        await gameManager.socialManager.requestBestFriend(charId, friendId);
        socket.emit("friend_action_success", {
          message: "Best Friend Request Sent!",
        });

        // Refresh lists for both
        const myFriends = await gameManager.socialManager.getFriends(charId);
        socket.emit("friends_list_update", myFriends);

        // Notify friend if online
        const friendSockets = Array.from(connectedSockets.values()).filter(
          (s) => s.data.characterId === friendId,
        );

        if (friendSockets.length > 0) {
          const friendFriends =
            await gameManager.socialManager.getFriends(friendId);
          friendSockets.forEach((s) => {
            s.emit("friends_list_update", friendFriends);
            s.emit("friend_action_success", {
              message: "New Best Friend Request!",
            });
          });
        }
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("respond_best_friend", async ({ friendId, accept }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        await gameManager.socialManager.respondBestFriend(
          charId,
          friendId,
          accept,
        );
        socket.emit("friend_action_success", {
          message: accept ? "Best Friend Accepted!" : "Request Declined.",
        });

        // Refresh lists for both
        const myFriends = await gameManager.socialManager.getFriends(charId);
        socket.emit("friends_list_update", myFriends);

        // Notify friend if online
        const otherSockets = Array.from(connectedSockets.values()).filter(
          (s) => s.data.characterId === friendId,
        );

        if (otherSockets.length > 0) {
          const otherFriends =
            await gameManager.socialManager.getFriends(friendId);
          otherSockets.forEach((s) => {
            s.emit("friends_list_update", otherFriends);
            if (accept)
              s.emit("friend_action_success", {
                message: "You are now Best Friends!",
              });
          });
        }
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("remove_best_friend", async ({ friendId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        await gameManager.socialManager.removeBestFriend(charId, friendId);
        socket.emit("friend_action_success", {
          message: "Best Friend removed.",
        });

        // Refresh lists
        const myFriends = await gameManager.socialManager.getFriends(charId);
        socket.emit("friends_list_update", myFriends);

        const otherSockets = Array.from(connectedSockets.values()).filter(
          (s) => s.data.characterId === friendId,
        );

        if (otherSockets.length > 0) {
          const otherFriends =
            await gameManager.socialManager.getFriends(friendId);
          otherSockets.forEach((s) =>
            s.emit("friends_list_update", otherFriends),
          );
        }
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("acknowledge_offline_report", async () => {
    try {
      await gameManager.acknowledgeOfflineReport(socket.data.characterId);
    } catch (err) {
      console.error("Error clearing offline report:", err);
    }
  });

  socket.on("mark_notification_read", async ({ notificationId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char && char.state.notifications) {
          const notif = char.state.notifications.find(
            (n) => n.id === notificationId,
          );
          if (notif) {
            notif.read = true;
            await gameManager.saveState(char.id, char.state);

            // Emit updated status immediately
            const status = await gameManager.getStatus(
              socket.user.id,
              false,
              char.id,
            );
            socket.emit("game_status", status);
          }
        }
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  });

  socket.on("clear_notifications", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char && char.state.notifications) {
          char.state.notifications = [];
          await gameManager.saveState(char.id, char.state);

          // Emit updated status immediately
          const status = await gameManager.getStatus(
            socket.user.id,
            false,
            char.id,
          );
          socket.emit("game_status", status);
        }
      });
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  });

  socket.on("mark_all_notifications_read", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (char && char.state.notifications) {
          char.state.notifications.forEach((n) => (n.read = true));
          await gameManager.saveState(char.id, char.state);

          // Emit updated status immediately
          const status = await gameManager.getStatus(
            socket.user.id,
            false,
            char.id,
          );
          socket.emit("game_status", status);
        }
      });
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  });

  // ===== CROWN STORE EVENTS =====

  // Get orb store items
  socket.on("get_orb_store", async () => {
    try {
      console.log(`[ORB STORE] Request from ${socket.user?.email}`);
      const items = getAllStoreItems();
      console.log(`[ORB STORE] Sending ${items.length} items to client`);
      socket.emit("orb_store_update", items);
    } catch (err) {
      console.error("Error getting crown store:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Purchase item with orbs
  socket.on("purchase_orb_item", async ({ itemId, quantity }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const qty = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), 100));
        let lastResult = null;
        let successCount = 0;

        for (let i = 0; i < qty; i++) {
          const result = await gameManager.orbsManager.purchaseItem(char, itemId);
          lastResult = result;
          if (!result.success) break;
          successCount++;
        }

        if (successCount > 0) {
          await gameManager.saveState(char.id, char.state);
          socket.emit("orb_purchase_success", {
            ...lastResult,
            success: true,
            message: successCount > 1
              ? `Successfully purchased x${successCount}!`
              : (lastResult.message || 'Purchase successful!')
          });
        } else {
          socket.emit("orb_purchase_error", lastResult);
        }

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
      console.error("Error purchasing crown item:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("buy_orb_package", async ({ packageId, locale }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const pkg = getStoreItem(packageId);

        if (!pkg) {
          return socket.emit("orb_purchase_error", {
            error: "Package not found",
          });
        }

        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

        if (!stripe) {
          return socket.emit("orb_purchase_error", {
            error: "Payments are not configured on this server.",
          });
        }

        // Detect currency based on client locale
        const isBR = (locale || "").toLowerCase().startsWith("pt");
        const currency = isBR && pkg.priceBRL ? "brl" : "usd";
        const unitAmount =
          currency === "brl"
            ? Math.round(pkg.priceBRL * 100)
            : Math.round(pkg.price * 100);

        console.log(
          `[STRIPE] Creating ${currency.toUpperCase()} session for ${packageId} (User: ${socket.user.id}, Char: ${socket.data.characterId}, Locale: ${locale})`,
        );

        // Build payment method types based on currency
        const paymentMethodTypes =
          currency === "brl" ? ["card", "boleto"] : undefined; // undefined = Stripe uses Dashboard defaults

        const sessionConfig = {
          line_items: [
            {
              price_data: {
                currency,
                product_data: {
                  name: pkg.name,
                  description: pkg.description,
                  images: [
                    "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/gem.svg",
                  ],
                },
                unit_amount: unitAmount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${CLIENT_URL}/?payment=success&package=${packageId}`,
          cancel_url: `${CLIENT_URL}/?payment=cancel`,
          metadata: {
            userId: socket.user.id,
            characterId: socket.data.characterId,
            packageId: packageId,
            orbAmount: pkg.amount || 0,
          },
        };

        // Only set payment_method_types for BRL (to enable Pix/Boleto)
        if (paymentMethodTypes) {
          sessionConfig.payment_method_types = paymentMethodTypes;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        socket.emit("stripe_checkout_session", { url: session.url });
      });
    } catch (err) {
      console.error("Error creating checkout session:", err);
      // Send actual error message to client for easier debugging
      socket.emit("orb_purchase_error", {
        error: err.message || "Failed to initiate payment",
      });
    }
  });

  // Get orb balance
  socket.on("get_orb_balance", async () => {
    try {
      const char = await gameManager.getCharacter(
        socket.user.id,
        socket.data.characterId,
      );
      const balance = gameManager.orbsManager.getOrbs(char);
      socket.emit("orb_balance_update", { orbs: balance });
    } catch (err) {
      console.error("Error getting orb balance:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // ADMIN: Add orbs (for testing - should be protected in production)
  socket.on("admin_add_orbs", async ({ amount }) => {
    try {
      // TODO: Add admin check in production
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = gameManager.orbsManager.addOrbs(char, amount, "ADMIN");

        if (result.success) {
          await gameManager.saveState(char.id, char.state);
          socket.emit("orb_balance_update", { orbs: result.newBalance });
        }

        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            false,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("Error adding orbs:", err);
      socket.emit("error", { message: err.message });
    }
  });
  // World Boss Fight Start
  socket.on("start_world_boss_fight", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );

        // 1. Initialize logic in Manager
        const result = await gameManager.worldBossManager.startFight(char);

        // 2. Set Activity to 'world_boss' so processTick picks it up
        if (result.success) {
          await gameManager.saveState(char.id, char.state);

          // Trigger client UI transition
          socket.emit("world_boss_started", { success: true });
        }

        // Initial data send
        socket.emit("action_result", {
          success: result.success,
          message: "You challenge the World Boss!",
          worldBossStatus: await gameManager.worldBossManager.getStatus(
            char.id,
          ),
        });
      });
    } catch (err) {
      console.error("[WORLD_BOSS] Start Fight Error:", err);
      socket.emit("action_result", { success: false, message: err.message });
    }
  });

  // World Boss Reward Claim
  socket.on("claim_world_boss_reward", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.worldBossManager.claimReward(char);

        // Send specific event expected by App.jsx
        socket.emit("world_boss_reward_claimed", result);

        // Also send action_result for generic feedback if needed
        socket.emit("action_result", {
          success: result.success,
          message: result.message,
          worldBossStatus: await gameManager.worldBossManager.getStatus(
            char.id,
          ),
        });

        // And status update
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            false,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      console.error("[WORLD_BOSS] Claim Error:", err);
      socket.emit("action_result", { success: false, message: err.message });
    }
  });
});

// --- GLOBAL TICKER LOOP (1s base, adaptive per-character) ---
// Track tick count per character for adaptive updates
const tickCounters = new Map(); // key -> { count, lastFullSync }

setInterval(async () => {
  try {
    const localSockets = Array.from(connectedSockets.values());
    const charGroups = {};

    localSockets.forEach((s) => {
      const user = s.user || s.data?.user;
      const charId = s.data?.characterId;
      if (user && user.id && charId) {
        const key = `${user.id}:${charId}`;
        if (!charGroups[key]) charGroups[key] = { user, charId, sockets: [] };
        charGroups[key].sockets.push(s);
      }
    });

    await Promise.all(
      Object.values(charGroups).map(async ({ user, charId, sockets }) => {
        try {
          // Skip if already locked (prevent queue accumulation)
          if (gameManager.isLocked(user.id)) return;

          const key = `${user.id}:${charId}`;
          if (!tickCounters.has(key))
            tickCounters.set(key, { count: 0, lastFullSync: 0 });
          const counter = tickCounters.get(key);
          counter.count++;

          await gameManager.executeLocked(user.id, async () => {
            // Determine character state for adaptive ticking
            const char = await gameManager.getCharacter(user.id, charId);
            if (!char) return;

            const isInCombat = !!char.state?.combat;
            const isInDungeon = !!char.state?.dungeon;
            const isInWorldBoss =
              gameManager.worldBossManager.activeFights.has(charId);
            const isGathering = !!char.current_activity;
            const isActive =
              isInCombat || isInDungeon || isInWorldBoss || isGathering;

            // --- ADAPTIVE TICK RATE ---
            // Combat/Dungeon/WorldBoss: every tick (1s)
            // Gathering/Crafting: every 3 ticks (3s)
            // Idle: every 5 ticks (5s)
            const tickInterval =
              isInCombat || isInDungeon || isInWorldBoss
                ? 1
                : isGathering
                  ? 3
                  : 5;
            if (
              counter.count % tickInterval !== 0 &&
              !isInCombat &&
              !isInDungeon &&
              !isInWorldBoss
            )
              return;

            const result = await gameManager.processTick(user.id, charId);
            if (result) {
              // --- FULL SYNC every 10s, or on significant events ---
              const needsFullSync =
                counter.count - counter.lastFullSync >= 10 ||
                result.leveledUp ||
                result.activityFinished;

              sockets.forEach((s) => {
                // Emit action_result for combat/dungeon/food events (unchanged)
                const shouldEmit =
                  result.message ||
                  result.combatUpdate ||
                  (result.dungeonUpdate && result.dungeonUpdate.message) ||
                  result.healingUpdate ||
                  result.worldBossUpdate;
                if (shouldEmit) {
                  try {
                    s.emit("action_result", {
                      success: result.success,
                      message:
                        result.message ||
                        result.combatUpdate?.details?.message ||
                        result.dungeonUpdate?.message,
                      leveledUp: result.leveledUp,
                      combatUpdate: result.combatUpdate,
                      dungeonUpdate: result.dungeonUpdate,
                      worldBossUpdate: result.worldBossUpdate,
                      healingUpdate: result.healingUpdate,
                    });
                  } catch (e) {
                    console.error("[EMIT-ERROR] action_result failed:", e);
                  }
                }

                if (result.status) {
                  try {
                    if (needsFullSync) {
                      // FULL STATUS: send everything (like before)
                      s.emit("status_update", result.status);
                      counter.lastFullSync = counter.count;
                    } else {
                      // LIGHTWEIGHT STATUS: only send actively changing data
                      const lightStatus = {
                        _lightweight: true, // Flag for client to merge
                        serverTime: Date.now(),
                        state: {},
                      };

                      // Always include health and food state
                      if (result.status.state) {
                        lightStatus.state.health = result.status.state.health;
                        lightStatus.state.lastFoodAt =
                          result.status.state.lastFoodAt;
                        if (result.status.state.equipment?.food) {
                          lightStatus.state.equipment = {
                            food: result.status.state.equipment.food,
                          };
                        }
                      }

                      // Include combat state if in combat
                      if (isInCombat && result.status.state?.combat) {
                        lightStatus.state.combat = result.status.state.combat;
                      }

                      // Include dungeon state if in dungeon
                      if (isInDungeon && result.status.state?.dungeon) {
                        lightStatus.state.dungeon = result.status.state.dungeon;
                      }

                      // Include activity if gathering
                      if (isGathering) {
                        lightStatus.current_activity =
                          result.status.current_activity;
                        lightStatus.activity_started_at =
                          result.status.activity_started_at;
                      }

                      // Include notifications if any
                      if (result.status.state?.notifications?.length > 0) {
                        lightStatus.state.notifications =
                          result.status.state.notifications;
                      }

                      s.emit("status_update", lightStatus);
                    }
                  } catch (e) {
                    console.error("[EMIT-ERROR] status_update failed:", e);
                  }
                }

                if (result.leveledUp) {
                  const { skill, level } = result.leveledUp;
                  const skillName = skill.replace(/_/g, " ");
                  s.emit("skill_level_up", {
                    message: `Your ${skillName} skill raised to level ${level}!`,
                  });
                }
              });
            }
          });
        } catch (err) {
          console.error(`[TICKER] Error for character ${user.id}: `, err);
        }
      }),
    );
  } catch (err) {
    console.error("[TICKER] Error in global heartbeat loop:", err);
  }
}, 1000);

// Cleanup tick counters for disconnected characters (every 60s)
setInterval(() => {
  const activeKeys = new Set();
  connectedSockets.forEach((s) => {
    const user = s.user || s.data?.user;
    const charId = s.data?.characterId;
    if (user?.id && charId) activeKeys.add(`${user.id}:${charId}`);
  });
  for (const key of tickCounters.keys()) {
    if (!activeKeys.has(key)) tickCounters.delete(key);
  }
}, 60000);

// --- Background Maintenance (10 mins) ---
setInterval(async () => {
  try {
    await gameManager.runMaintenance();
  } catch (err) {
    console.error("[MAINTENANCE-LOOP] Error:", err);
  }
}, 600000);

// --- Background Sync (15s) ---
setInterval(async () => {
  try {
    await gameManager.persistAllDirty();
  } catch (err) {
    console.error("[SYNC-LOOP] Error:", err);
  }
}, 15000);

// --- Shutdown Handling ---
const shutdown = async (signal) => {
  console.log(`[SERVER] Received ${signal}. Persisting data and exiting...`);
  try {
    await gameManager.persistAllDirty();
    console.log("[SERVER] All dirty data persisted.");
  } catch (err) {
    console.error("[SERVER] Error during shutdown persistence:", err);
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Run once on startup
setTimeout(() => {
  gameManager.runMaintenance();
}, 5000);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
