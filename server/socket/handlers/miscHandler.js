export const registerMiscHandlers = (socket, gameManager, io) => {
  socket.on("save_push_subscription", async ({ subscription }) => {
    try {
      if (!socket.user?.id) return;
      await gameManager.savePushSubscription(socket.user.id, subscription);
      socket.emit("push_subscription_saved", { success: true });
    } catch (err) { console.error("Error saving push subscription:", err); }
  });

  socket.on("rest_heal", async ({ percent }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.startResting(socket.user.id, socket.data.characterId, percent);
        socket.emit("action_result", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("cancel_rest", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.stopResting(socket.user.id, socket.data.characterId);
        socket.emit("action_result", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("rest_check", async () => {
    try {
      // getStatus(..., true, ...) with catchup=true will trigger the check in getStatus lines 695-707
      const status = await gameManager.getStatus(socket.user.id, true, socket.data.characterId);
      socket.emit("status_update", status);
    } catch (err) { console.error("Error in rest_check:", err); }
  });

  socket.on("acknowledge_offline_report", async () => {
    try { await gameManager.acknowledgeOfflineReport(socket.data.characterId); }
    catch (err) { console.error("Error clearing offline report:", err); }
  });

  socket.on("mark_notification_read", async ({ notificationId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char?.state?.notifications) {
          const notif = char.state.notifications.find(n => n.id === notificationId);
          if (notif) {
            notif.read = true;
            await gameManager.saveState(char.id, char.state);
            socket.emit("game_status", await gameManager.getStatus(socket.user.id, false, char.id));
          }
        }
      });
    } catch (err) { console.error("Error marking notification as read:", err); }
  });

  socket.on("clear_notifications", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char?.state?.notifications) {
          char.state.notifications = [];
          await gameManager.saveState(char.id, char.state);
          socket.emit("game_status", await gameManager.getStatus(socket.user.id, false, char.id));
        }
      });
    } catch (err) { console.error("Error clearing notifications:", err); }
  });

  socket.on("mark_all_notifications_read", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char?.state?.notifications) {
          char.state.notifications.forEach(n => (n.read = true));
          await gameManager.saveState(char.id, char.state);
          socket.emit("game_status", await gameManager.getStatus(socket.user.id, false, char.id));
        }
      });
    } catch (err) { console.error("Error marking all notifications as read:", err); }
  });

  socket.on("get_combat_history", async () => {
    try {
      if (!socket.data.characterId) return;
      const history = await gameManager.combatManager.getCombatHistory(socket.data.characterId);
      socket.emit("combat_history", history);
    } catch (err) { console.error("Error getting combat history:", err); }
  });

  socket.on("get_dungeon_history", async () => {
    try {
      if (!socket.data.characterId) return;
      const history = await gameManager.combatManager.getDungeonHistory(socket.data.characterId);
      socket.emit("dungeon_history", history);
    } catch (err) { console.error("Error getting dungeon history:", err); }
  });

  socket.on("get_dungeon_history", async () => {
    try {
      if (!socket.data.characterId) return;
      const history = await gameManager.combatManager.getDungeonHistory(socket.data.characterId);
      socket.emit("dungeon_history", history);
    } catch (err) { console.error("Error getting dungeon history:", err); }
  });

  socket.on("get_leaderboard", async ({ type, mode, forceRefresh }) => {
    try {
      const response = await gameManager.getLeaderboard(type, mode, socket.data.characterId, forceRefresh);
      socket.emit("leaderboard_update", {
        type: response.type,
        mode: response.mode,
        top100: response.top100,
        userRank: response.userRank
      });
    } catch (err) {
      console.error("[RANKING] Error fetching leaderboard:", err);
      socket.emit("error", { message: "Error fetching leaderboard" });
    }
  });
  socket.on("spin_daily", async () => {
    try {
      if (!socket.data.characterId) return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        if (!char) return;

        if (char.state?.isIronman) {
          return socket.emit("daily_spin_result", {
            success: false,
            error: "Ironman characters cannot spin the wheel!",
          });
        }

        const result = await gameManager.dailyRewardManager.spin(char);
        socket.emit("daily_spin_result", result);

        if (result.success) {
          socket.emit("daily_status", { canSpin: false });
          // Sync inventory/orbs
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
      console.error("[DAILY] Error processing spin:", err);
      socket.emit("daily_spin_result", {
        success: false,
        error: "Internal server error during spin.",
      });
    }
  });
};
