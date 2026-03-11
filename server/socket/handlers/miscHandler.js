export const registerMiscHandlers = (socket, gameManager, io) => {
  socket.on("save_push_subscription", async ({ subscription }) => {
    try {
      if (!socket.user?.id) return;
      await gameManager.savePushSubscription(socket.user.id, subscription);
      socket.emit("push_subscription_saved", { success: true });
    } catch (err) { console.error("Error saving push subscription:", err); }
  });

  socket.on("rest_heal", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.startResting(socket.user.id, socket.data.characterId);
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

  socket.on("get_my_trade_history", async () => {
    try {
      if (!socket.data.characterId) return;
      const { data, error } = await gameManager.supabase.from("trade_history").select("*").or(`sender_id.eq.${socket.data.characterId},receiver_id.eq.${socket.data.characterId}`).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      socket.emit("my_trade_history", data);
    } catch (err) { console.error("Error getting trade history:", err); }
  });
};
