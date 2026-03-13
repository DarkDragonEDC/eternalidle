import { resolveItem } from '../../shared/items.js';
import { DEFAULT_PLAYER_ATTACK_SPEED, RESPAWN_DELAY_MS } from '../../shared/combat.js';

export class CatchupManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.supabase = gameManager.supabase;
    }

    /**
     * Entry point for processing offline gains during character load.
     */
    async processCatchup(data, elapsedSeconds, lastSaved, isSignificantCatchup) {
        let updated = false;
        const finalReport = {
            totalTime: 0,
            itemsGained: {},
            xpGained: {},
            duplicationCount: 0,
            autoRefineCount: 0
        };

        try {
            const needsHealing = (data.state.health || 0) < (this.gm.inventoryManager.calculateStats(data).maxHP || 100) && (data.state.equipment?.food?.amount > 0);
            
            if ((data.current_activity || data.state.combat || data.state.dungeon || needsHealing) && data.last_saved) {
                if (isSignificantCatchup) {
                    console.log(`[CATCHUP] ${data.name}: last_saved=${data.last_saved}, elapsed=${elapsedSeconds.toFixed(1)}s, hasActivity=${!!data.current_activity}, hasCombat=${!!data.state.combat}, needsHealing=${needsHealing}`);
                }

                // 1. Process Activities
                if (data.current_activity && typeof data.current_activity === 'object' && data.activity_started_at) {
                    const timePerAction = data.current_activity.time_per_action || 3;
                    if (elapsedSeconds >= timePerAction) {
                        const actionsPossible = Math.floor(elapsedSeconds / timePerAction);
                        const actionsToProcess = Math.min(actionsPossible, data.current_activity.actions_remaining);

                        if (actionsToProcess > 0) {
                            const activityReport = await this.processBatchActions(data, actionsToProcess);
                            if (activityReport.processed > 0) {
                                updated = true;
                                this._mergeActivityReport(data, activityReport, finalReport);
                            }
                        }
                    }
                }

                // 2. Process Combat
                if (data.state.combat) {
                    const stats = this.gm.inventoryManager.calculateStats(data);
                    const atkSpeed = Number(stats.attackSpeed) || DEFAULT_PLAYER_ATTACK_SPEED;
                    const secondsPerRound = atkSpeed / 1000;

                    if (elapsedSeconds >= secondsPerRound) {
                        const maxIdleMs = this.gm.getMaxIdleTime(data);
                        const maxEffectSeconds = Math.min(elapsedSeconds, maxIdleMs / 1000);

                        if (elapsedSeconds * 1000 > maxIdleMs) {
                            console.log(`[CATCHUP-LIMIT] ${data.name}: Combat idle limit exceeded. Saving log.`);
                            await this.gm.combatManager.saveCombatLog(data, 'FLEE').catch(e => console.error(`[CATCHUP-SAVE-ERROR]`, e));
                        }

                        const maxRounds = Math.floor(maxEffectSeconds / secondsPerRound);
                        if (maxRounds > 0) {
                            const combatReport = await this.processBatchCombat(data, maxRounds);
                            if (combatReport.processedRounds > 0) {
                                updated = true;
                                this._mergeCombatReport(combatReport, finalReport);
                            }
                        }
                    }
                }

                // 3. Process Dungeon
                if (data.state.dungeon) {
                    const maxIdleMs = this.gm.getMaxIdleTime(data);
                    if (elapsedSeconds * 1000 > maxIdleMs) {
                        console.log(`[CATCHUP-LIMIT] ${data.name}: Dungeon idle limit exceeded. Saving log.`);
                        await this.gm.dungeonManager.saveDungeonLog(data, 'ABANDONED').catch(e => console.error(`[CATCHUP-SAVE-ERROR]`, e));
                    }

                    const dungeonReport = await this.processBatchDungeon(data, elapsedSeconds);
                    if (dungeonReport && dungeonReport.totalTime > 0) {
                        updated = true;
                        this._mergeDungeonReport(dungeonReport, finalReport);
                    }
                }

                // 4. Idle Healing
                let remainingSeconds = elapsedSeconds - finalReport.totalTime;
                const canHealIdle = (data.state.health || 0) < (this.gm.inventoryManager.calculateStats(data).maxHP || 100) && (data.state.equipment?.food?.amount > 0);

                if (remainingSeconds >= 1 && canHealIdle) {
                    const startTimeTs = lastSaved + (finalReport.totalTime * 1000);
                    const ticks = Math.floor(remainingSeconds / 5);
                    let ticksProcessed = 0;

                    for (let t = 0; t < ticks; t++) {
                        ticksProcessed = t + 1;
                        const virtualTime = startTimeTs + (t * 5000);
                        const healResult = this.gm.processFood(data, virtualTime);

                        if (healResult.used) {
                            updated = true;
                            if (healResult.eaten) {
                                finalReport.foodConsumed = (finalReport.foodConsumed || 0) + healResult.eaten;
                            }
                        }

                        const currentMax = this.gm.inventoryManager.calculateStats(data).maxHP || 100;
                        if ((data.state.health || 0) >= currentMax || !(data.state.equipment?.food?.amount > 0)) break;
                    }
                    finalReport.totalTime += (ticksProcessed * 5);
                }

                // 5. Finalize Taps/Sync
                finalReport.totalTime = Math.min(finalReport.totalTime, elapsedSeconds);
                const processedMs = Math.floor(finalReport.totalTime * 1000);
                const nextSavedTimestamp = lastSaved + processedMs;
                data.last_saved = new Date(nextSavedTimestamp).toISOString();

                if (data.current_activity && typeof data.current_activity === 'object' && data.activity_started_at) {
                    this._syncActivityStartedAt(data, nextSavedTimestamp, finalReport.totalTime);
                }

                finalReport.elapsedTime = elapsedSeconds;

                // 6. Guild XP Integration
                if (data.state.guild_id && finalReport.totalTime > 0) {
                    this._processGuildXPGain(data, finalReport);
                }

                // 7. Notification / Report
                if (elapsedSeconds > 60 && !data._offlineReportSent) {
                    data.offlineReport = finalReport;
                    data._offlineReportSent = true;
                    this.gm.addActionSummaryNotification(data, 'Offline Progress', {
                        itemsGained: finalReport.itemsGained,
                        xpGained: finalReport.xpGained,
                        totalTime: finalReport.totalTime,
                        elapsedTime: elapsedSeconds,
                        kills: finalReport.combat?.kills || 0,
                        silverGained: finalReport.combat?.silverGained || 0,
                        duplicationCount: finalReport.duplicationCount,
                        autoRefineCount: finalReport.autoRefineCount
                    });
                }

                if (updated || (elapsedSeconds >= 60)) {
                    data.last_saved = new Date().toISOString();
                    this.gm.markDirty(data.id);
                    await this.gm.persistCharacter(data.id);
                }
            }
        } catch (err) {
            console.error(`[CATCHUP-CRASH] Critical error processing character ${data.name}:`, err);
        }
    }

    async processBatchActions(char, quantity) {
        const { type } = char.current_activity;
        const item = resolveItem(char.current_activity.item_id);
        if (!item) return { processed: 0, itemsGained: {}, xpGained: {} };

        let processed = 0;
        let leveledUp = false;
        const itemsGained = {};
        const xpGained = {};
        let duplicationCount = 0;
        let autoRefineCount = 0;
        let stopReason = null;

        for (let i = 0; i < quantity; i++) {
            let result = null;
            switch (type) {
                case 'GATHERING': result = await this.gm.activityManager.processGathering(char, item); break;
                case 'REFINING': result = await this.gm.activityManager.processRefining(char, item); break;
                case 'CRAFTING': result = await this.gm.activityManager.processCrafting(char, item); break;
            }

            if (result && !result.error) {
                processed++;
                if (result.leveledUp) leveledUp = true;
                if (result.itemGained) {
                    itemsGained[result.itemGained] = (itemsGained[result.itemGained] || 0) + (result.amountGained || 1);
                }
                if (result.refinedItemGained) {
                    itemsGained[result.refinedItemGained] = (itemsGained[result.refinedItemGained] || 0) + 1;
                }
                if (result.xpGained) {
                    const stats = this.gm.inventoryManager.calculateStats(char);
                    const globalBonus = stats.globals?.xpYield || 0;
                    const catBonus = stats.xpBonus?.[type] || 0;
                    const finalXp = Math.floor(result.xpGained * (1 + (globalBonus + catBonus) / 100));
                    xpGained[result.skillKey] = (xpGained[result.skillKey] || 0) + finalXp;
                }
                if (result.isDuplication) duplicationCount++;
                if (result.isAutoRefine || result.refinedItemGained) autoRefineCount++;
            } else {
                stopReason = result?.error || "Stopped Early";
                break;
            }
        }

        if (processed > 0) {
            const timePerAction = char.current_activity?.time_per_action || 3;
            char.current_activity.actions_remaining -= processed;
            if (char.current_activity) {
                const timeProcessedMs = processed * timePerAction * 1000;
                char.current_activity.next_action_at = (char.current_activity.next_action_at || Date.now()) + timeProcessedMs;
            }

            if (char.current_activity.actions_remaining <= 0) {
                char.current_activity = null;
                char.activity_started_at = null;
            }
            return { processed, leveledUp, itemsGained, xpGained, totalTime: processed * timePerAction, stopReason, duplicationCount, autoRefineCount };
        }
        return { processed: 0, leveledUp: false, itemsGained: {}, xpGained: {}, totalTime: 0, stopReason };
    }

    async processBatchCombat(char, rounds) {
        let kills = 0;
        let combatXp = 0;
        let silverGained = 0;
        const itemsGained = {};
        let died = false;
        let foodConsumed = 0;

        const stats = this.gm.inventoryManager.calculateStats(char);
        const atkSpeed = Number(stats.attackSpeed) || 1000;
        const monsterName = char.state.combat?.mobName || "Unknown Monster";
        const startTime = char.last_saved ? new Date(char.last_saved).getTime() : Date.now();

        let virtualTime = startTime;
        const endTime = startTime + (rounds * atkSpeed);

        while (virtualTime < endTime && char.state.combat) {
            // Process Food - REMOVED duplicative call. CombatManager.processCombatRound handles reactive healing.
            // const foodResult = this.gm.processFood(char, virtualTime);
            // foodConsumed += foodResult.eaten || 0;

            const result = await this.gm.combatManager.processCombatRound(char, virtualTime);
            if (!result || !char.state.combat) {
                if (!char.state.combat && char.state.health <= 0) died = true;
                break;
            }

            if (result.details && result.details.foodEaten) foodConsumed += result.details.foodEaten;

            if (result.details?.victory) {
                kills++;
                combatXp += result.details.xpGained || 0;
                silverGained += result.details.silverGained || 0;
                if (result.details.lootGained) {
                    result.details.lootGained.forEach(lootEntry => {
                        // FIX: lootEntry is now an object { id, amount } from CombatManager
                        if (typeof lootEntry === 'object' && lootEntry !== null) {
                            const actualId = lootEntry.id;
                            const qty = lootEntry.amount || 1;
                            itemsGained[actualId] = (itemsGained[actualId] || 0) + qty;
                        } else if (typeof lootEntry === 'string') {
                            const match = lootEntry.match(/^(\d+)x\s+(.+)$/);
                            if (match) {
                                const qty = parseInt(match[1]) || 1;
                                const actualId = match[2];
                                itemsGained[actualId] = (itemsGained[actualId] || 0) + qty;
                            } else {
                                itemsGained[lootEntry] = (itemsGained[lootEntry] || 0) + 1;
                            }
                        }
                    });
                }
                
                // --- RESPawn Logic (Sync with Online) ---
                virtualTime += RESPAWN_DELAY_MS; // Respawn Delay
                if (char.state.combat) {
                    char.state.combat.mobHealth = char.state.combat.mobMaxHealth || 100;
                    char.state.combat.mob_next_attack_at = virtualTime; // Attack immediately on respawn
                    // char.state.combat.player_next_attack_at = virtualTime + atkSpeed; // REMOVED: Don't reset player timer
                }
            } else {
                // Advance to next event
                const nextPlayer = char.state.combat.player_next_attack_at;
                const nextMob = char.state.combat.mob_next_attack_at;
                const nextEvent = Math.min(nextPlayer, nextMob);
                
                if (nextEvent > virtualTime) {
                    virtualTime = nextEvent;
                } else {
                    virtualTime += 100; // Safety advancement
                }
            }
        }

        const totalProcessedTime = virtualTime - startTime;
        const roundsProcessed = Math.floor(totalProcessedTime / atkSpeed);

        return { processedRounds: roundsProcessed, kills, xpGained: { COMBAT: combatXp }, silverGained, itemsGained, died, foodConsumed, totalTime: (roundsProcessed * atkSpeed) / 1000, monsterName };
    }

    async processBatchDungeon(char, seconds) {
        let remainingSeconds = seconds;
        const itemsGained = {};
        const xpGained = {};
        let dungeonsTotalCleared = 0;
        let died = false;
        let virtualNow = Date.now() - (seconds * 1000);

        while (remainingSeconds >= 1 && char.state.dungeon && !died) {
            const result = await this.gm.dungeonManager.processDungeonTick(char, virtualNow);
            virtualNow += 1000;
            remainingSeconds -= 1;
            this.gm.processFood(char, virtualNow);

            if (result?.dungeonUpdate) {
                const status = result.dungeonUpdate.status;
                if (status === 'COMPLETED') {
                    dungeonsTotalCleared++;
                    const rewards = result.dungeonUpdate.rewards;
                    if (rewards) {
                        xpGained['DUNGEONEERING'] = (xpGained['DUNGEONEERING'] || 0) + (rewards.xp || 0);
                        if (rewards.items) {
                            rewards.items.forEach(itemStr => {
                                const match = itemStr.match(/^(\d+)x (.+)$/);
                                if (match) {
                                    itemsGained[match[2]] = (itemsGained[match[2]] || 0) + parseInt(match[1]);
                                } else {
                                    itemsGained[itemStr] = (itemsGained[itemStr] || 0) + 1;
                                }
                            });
                        }
                    }
                } else if (status === 'FAILED') {
                    died = true;
                }
            }
        }
        return { totalTime: seconds - remainingSeconds, itemsGained, xpGained, dungeonsTotalCleared, died };
    }

    // --- Helper Methods ---

    _mergeActivityReport(data, activityReport, finalReport) {
        if (data.current_activity && typeof data.current_activity === 'object') {
            if (!data.current_activity.sessionItems) data.current_activity.sessionItems = {};
            if (typeof data.current_activity.sessionXp === 'undefined') data.current_activity.sessionXp = 0;

            for (const [id, qty] of Object.entries(activityReport.itemsGained)) {
                const safeQty = Number(qty) || 1;
                const currentVal = data.current_activity.sessionItems[id];
                let currentQty = 0;
                if (typeof currentVal === 'number') currentQty = currentVal;
                else if (typeof currentVal === 'object' && currentVal !== null) currentQty = Number(currentVal.amount) || 0;
                data.current_activity.sessionItems[id] = currentQty + safeQty;
            }

            let totalXp = 0;
            for (const xp of Object.values(activityReport.xpGained)) totalXp += Number(xp) || 0;
            data.current_activity.sessionXp += totalXp;

            data.current_activity.duplicationCount = (Number(data.current_activity.duplicationCount) || 0) + (activityReport.duplicationCount || 0);
            data.current_activity.autoRefineCount = (Number(data.current_activity.autoRefineCount) || 0) + (activityReport.autoRefineCount || 0);
        }

        if (activityReport.totalTime > 10 || Object.keys(activityReport.itemsGained).length > 0) {
            finalReport.totalTime += activityReport.totalTime;
            for (const [id, qty] of Object.entries(activityReport.itemsGained)) finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
            for (const [skill, qty] of Object.entries(activityReport.xpGained)) finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
            finalReport.duplicationCount = (finalReport.duplicationCount || 0) + (activityReport.duplicationCount || 0);
            finalReport.autoRefineCount = (finalReport.autoRefineCount || 0) + (activityReport.autoRefineCount || 0);
        }
    }

    _mergeCombatReport(combatReport, finalReport) {
        if (combatReport.totalTime > 10 || Object.keys(combatReport.itemsGained).length > 0) {
            finalReport.totalTime += combatReport.totalTime;
            finalReport.combat = { ...combatReport };
            for (const [id, qty] of Object.entries(combatReport.itemsGained)) finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
            for (const [skill, qty] of Object.entries(combatReport.xpGained)) finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
        }
    }

    _mergeDungeonReport(dungeonReport, finalReport) {
        finalReport.totalTime += dungeonReport.totalTime;
        finalReport.dungeon = dungeonReport;
        for (const [id, qty] of Object.entries(dungeonReport.itemsGained)) finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
        for (const [skill, qty] of Object.entries(dungeonReport.xpGained)) finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
    }

    _syncActivityStartedAt(data, nextSavedTimestamp, totalTimeProcessed) {
        const { initial_quantity, actions_remaining, time_per_action } = data.current_activity;
        const tpa = time_per_action || 3;
        const iqty = initial_quantity || (actions_remaining + Math.floor(totalTimeProcessed / tpa));
        const doneQty = Math.max(0, iqty - actions_remaining);
        const elapsedVirtual = doneQty * tpa;
        data.activity_started_at = new Date(nextSavedTimestamp - (elapsedVirtual * 1000)).toISOString();
        if (!data.current_activity.initial_quantity) data.current_activity.initial_quantity = iqty;
    }

    _processGuildXPGain(data, finalReport) {
        let totalOfflineXp = 0;
        for (const xp of Object.values(finalReport.xpGained || {})) totalOfflineXp += (Number(xp) || 0);
        if (totalOfflineXp > 0) {
            const guildXpToAdd = totalOfflineXp * 0.10;
            if (this.gm.guildManager?.addPendingGuildXP) {
                this.gm.guildManager.addPendingGuildXP(data.state.guild_id, guildXpToAdd, data.id);
            }
        }
    }
}
