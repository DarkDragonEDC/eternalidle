import { connectedSockets } from "./socket/registry.js";

export const startTicker = (gameManager) => {
  const tickCounters = new Map();

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
            if (gameManager.isLocked(user.id)) return;

            const key = `${user.id}:${charId}`;
            if (!tickCounters.has(key))
              tickCounters.set(key, { count: 0, lastFullSync: 0 });
            const counter = tickCounters.get(key);
            counter.count++;

            await gameManager.executeLocked(user.id, async () => {
              const char = await gameManager.getCharacter(user.id, charId);
              if (!char) return;

              const isInCombat = !!char.state?.combat;
              const isInDungeon = !!char.state?.dungeon;
              const isInWorldBoss = gameManager.worldBossManager.activeFights.has(charId);
              const isGathering = !!char.current_activity;

              const tickInterval = (isInCombat || isInDungeon || isInWorldBoss) ? 1 : isGathering ? 3 : 5;
              
                const needsFullSync = (counter.count - counter.lastFullSync >= 30);

                const tickResult = await gameManager.processTick(user.id, charId, needsFullSync);
                if (tickResult) {
                  const result = tickResult;
                  // If we leveled up or finished activity, force a full sync in the NEXT tick if not already synced
                  if (result.leveledUp || result.activityFinished) {
                    counter.lastFullSync = counter.count - 30; 
                  }

                sockets.forEach((s) => {
                  const shouldEmit = result.message || result.combatUpdate || (result.dungeonUpdate && result.dungeonUpdate.message) || result.healingUpdate || result.worldBossUpdate;
                  if (shouldEmit) {
                    s.emit("action_result", {
                      success: result.success,
                      message: result.message || result.combatUpdate?.details?.message || result.dungeonUpdate?.message,
                      leveledUp: result.leveledUp,
                      combatUpdate: result.combatUpdate,
                      dungeonUpdate: result.dungeonUpdate,
                      worldBossUpdate: result.worldBossUpdate,
                      healingUpdate: result.healingUpdate,
                    });
                  }

                  if (result.status) {
                    s.emit("status_update", result.status);
                    if (needsFullSync) counter.lastFullSync = counter.count;
                  }

                  if (result.leveledUp) {
                    const { skill, level } = result.leveledUp;
                    const skillName = skill.replace(/_/g, " ");
                    s.emit("skill_level_up", { message: `Your ${skillName} skill raised to level ${level}!` });
                  }
                });
              }
            });
          } catch (err) { console.error(`[TICKER] Error for character ${user.id}: `, err); }
        })
      );
    } catch (err) { console.error("[TICKER] Error in global heartbeat loop:", err); }
  }, 1000);

  // Cleanup tick counters for disconnected characters (60s)
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

  // Maintenance Loop (10 mins)
  setInterval(async () => {
    try {
      // await gameManager.runMaintenance();
    } catch (err) { console.error("[MAINTENANCE-LOOP] Error:", err); }
  }, 600000);

  // Sync Loop (15s)
  setInterval(async () => {
    try {
      await gameManager.persistAllDirty();
    } catch (err) { console.error("[SYNC-LOOP] Error:", err); }
  }, 15000);
};
