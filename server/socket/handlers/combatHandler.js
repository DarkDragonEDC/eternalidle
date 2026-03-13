export const registerCombatHandlers = (socket, gameManager, io) => {
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

  socket.on("get_world_boss_status", async () => {
    try {
      if (!socket.data?.characterId) return;
      const status = await gameManager.worldBossManager.getStatus(
        socket.data.characterId,
      );
      socket.emit("world_boss_status", status);
    } catch (err) {
      console.error("[WORLD_BOSS] get_status error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_world_boss_ranking_history", async ({ date }) => {
    try {
      const rankings = await gameManager.worldBossManager.getRankingHistory(date);
      socket.emit("world_boss_ranking_history", { date, rankings });
    } catch (err) {
      console.error("[WORLD_BOSS] history error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("start_world_boss_fight", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.worldBossManager.startFight(char);
        if (result.success) {
          await gameManager.saveState(char.id, char.state);
          socket.emit("world_boss_started", { success: true });
        }
        socket.emit("action_result", {
          success: result.success,
          message: "You challenge the World Boss!",
          worldBossStatus: await gameManager.worldBossManager.getStatus(char.id),
        });
      });
    } catch (err) {
      console.error("[WORLD_BOSS] Start Fight Error:", err);
      socket.emit("action_result", { success: false, message: err.message });
    }
  });

  socket.on("claim_world_boss_reward", async () => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(
          socket.user.id,
          socket.data.characterId,
        );
        const result = await gameManager.worldBossManager.claimReward(char);
        socket.emit("world_boss_reward_claimed", result);
        socket.emit("action_result", {
          success: result.success,
          message: result.message,
          worldBossStatus: await gameManager.worldBossManager.getStatus(char.id),
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
      console.error("[WORLD_BOSS] Claim Error:", err);
      socket.emit("action_result", { success: false, message: err.message });
    }
  });
};
