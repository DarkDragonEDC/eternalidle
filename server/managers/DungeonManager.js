
import { DUNGEONS, FOOD_COST_MATRIX, getFoodCost, getDungeonDuration } from '../../shared/dungeons.js';

const DUNGEON_DURATION = 5 * 60 * 1000; // 5 minutes fixed duration
const MAX_DUNGEON_TIME = 12 * 60 * 60 * 1000; // 12 hours safety limit
const MAX_DUNGEON_XP = 100_000_000; // 100M

export class DungeonManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async checkAndConsumeResources(char, dungeon) {
        // Silver check
        const entryCost = dungeon.entrySilver || 0;
        if ((char.state.silver || 0) < entryCost) {
            throw new Error(`Not enough silver to enter dungeon (requires ${entryCost})`);
        }

        // Map check
        const mapId = dungeon.reqItem;
        if (!this.gameManager.inventoryManager.hasItems(char, { [mapId]: 1 })) {
            throw new Error(`Missing required item: ${mapId}`);
        }

        // Food check
        const playerIP = this.gameManager.inventoryManager.calculateCharacterIP(char);
        const dungeonTier = dungeon.tier;
        let foodToConsume = null;
        let requiredAmount = 0;

        for (let foodTier = 10; foodTier >= 1; foodTier--) {
            const foodId = `T${foodTier}_FOOD`;
            const cost = getFoodCost(dungeonTier, foodTier, playerIP);
            if (cost <= 0) continue;
            if (this.gameManager.inventoryManager.hasItems(char, { [foodId]: cost })) {
                foodToConsume = foodId;
                requiredAmount = cost;
                break;
            }
        }

        if (!foodToConsume) {
            const equippedFood = char.state.equipment?.food;
            if (equippedFood) {
                const cost = getFoodCost(dungeonTier, equippedFood.tier, playerIP);
                if (equippedFood.amount >= cost) {
                    foodToConsume = 'EQUIPPED_FOOD';
                    requiredAmount = cost;
                }
            }
        }

        if (!foodToConsume) {
            throw new Error(`Not enough food to enter this tier ${dungeonTier} dungeon`);
        }

        // --- CONSUMPTION ---
        char.state.silver = (char.state.silver || 0) - entryCost;
        this.gameManager.inventoryManager.consumeItems(char, { [mapId]: 1 });
        if (foodToConsume === 'EQUIPPED_FOOD') {
            char.state.equipment.food.amount -= requiredAmount;
            if (char.state.equipment.food.amount <= 0) delete char.state.equipment.food;
        } else {
            this.gameManager.inventoryManager.consumeItems(char, { [foodToConsume]: requiredAmount });
        }

        return { playerIP };
    }

    async startDungeon(userId, characterId, dungeonId, repeatCount = 0) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char.state.dungeon) throw new Error("Already in a dungeon");
        if (char.state.combat) throw new Error("Cannot enter dungeon while in combat");

        const dungeon = Object.values(DUNGEONS).find(d => d.id === dungeonId);
        if (!dungeon) throw new Error("Dungeon not found");

        // Level Requirement Check
        const dungeonLevel = char.state.skills?.DUNGEONEERING?.level || 1;
        if (dungeonLevel < (dungeon.reqLevel || 1)) {
            throw new Error(`Dungeoneering level ${dungeon.reqLevel} required to enter this dungeon`);
        }

        // Consume all resources (Silver, Map, Food)
        const { playerIP } = await this.checkAndConsumeResources(char, dungeon);

        const now = Date.now();
        const duration = getDungeonDuration(dungeon.tier, playerIP);
        const finishAt = now + duration;

        // Initialize Dungeon State
        char.state.dungeon = {
            id: dungeonId,
            tier: dungeon.tier,
            active: true,
            started_at: now,
            finish_at: finishAt,
            total_duration: duration / 1000,
            status: 'EXPLORING',
            repeatCount: repeatCount,
            initialRepeats: repeatCount,
            currentRun: 1, // Initialize run counter
            lootLog: [],
            sessionStats: {
                totalXp: 0,
                lootMap: {},
                startTime: now,
                runsCompleted: 0
            }
        };
        char.last_saved = new Date(now).toISOString();

        await this.gameManager.saveState(char.id, char.state);
        return { success: true };
    }

    async processDungeonTick(char, virtualTime = null) {
        try {
            if (!char.state.dungeon || !char.state.dungeon.id) return;

            const dungeonState = char.state.dungeon;
            const dungeonConfig = Object.values(DUNGEONS).find(d => d.id === dungeonState.id);

            if (!dungeonConfig) {
                console.error(`[DUNGEON] Config not found for ID: ${dungeonState.id}`);
                return;
            }

            const now = virtualTime || Date.now();
            const totalElapsed = now - new Date(dungeonState.started_at).getTime();

            // 1. Max Time Check (Safety)
            if (totalElapsed > MAX_DUNGEON_TIME) {
                console.log(`[DUNGEON] Dungeon timed out for ${char.name}`);
                delete char.state.dungeon;
                return { dungeonUpdate: { status: 'FAILED', message: "Dungeon time limit reached!" } };
            }

            // 2. Exploration Logic (Fixed Time)
            if (now >= dungeonState.finish_at) {
                return await this.completeDungeon(char, dungeonConfig, now);
            } else {
                const timeLeft = Math.ceil((dungeonState.finish_at - now) / 1000);
                return {
                    dungeonUpdate: {
                        status: 'EXPLORING',
                        message: `Exploring ${dungeonConfig.name}...`,
                        timeLeft: timeLeft
                    }
                };
            }
        } catch (error) {
            console.error(`[DUNGEON] Error in processDungeonTick:`, error);
        }
    }

    async completeDungeon(char, config, virtualNow = null) {
        const now = virtualNow || Date.now();
        const rewards = config.rewards;
        const loot = [];

        let dungeonXp = rewards.xp || 100;
        if (dungeonXp > MAX_DUNGEON_XP) dungeonXp = MAX_DUNGEON_XP;

        const leveledUp = this.gameManager.addXP(char, 'DUNGEONEERING', dungeonXp);

        const roll = Math.random();
        let rarity = 'NORMAL';

        if (roll < 0.01) rarity = 'MASTERPIECE';
        else if (roll < 0.05) rarity = 'EXCELLENT';
        else if (roll < 0.20) rarity = 'OUTSTANDING';
        else if (roll < 0.50) rarity = 'GOOD';
        else rarity = 'NORMAL';

        const chestId = `T${config.tier}_CHEST_${rarity}`;
        const added = this.gameManager.inventoryManager.addItemToInventory(char, chestId, 1);

        if (added) {
            loot.push(`1x ${chestId}`);
        } else {
            loot.push(`(Full) ${chestId} LOST`);
        }

        if (!char.state.stats) char.state.stats = {};
        char.state.stats.dungeonsCleared = (char.state.stats.dungeonsCleared || 0) + 1;

        const mapId = config.reqItem;

        // Update Session Stats
        if (!char.state.dungeon.sessionStats) {
            char.state.dungeon.sessionStats = {
                totalXp: 0,
                lootMap: {},
                startTime: char.state.dungeon.started_at ? new Date(char.state.dungeon.started_at).getTime() : now,
                runsCompleted: 0
            };
        }
        const session = char.state.dungeon.sessionStats;
        session.totalXp += rewards.xp;
        session.runsCompleted++;

        // Aggregate Loot
        loot.forEach(lootStr => {
            const match = lootStr.match(/^(\d+)x\s+(.+)$/);
            if (match) {
                const qty = parseInt(match[1]);
                const itemId = match[2];
                session.lootMap[itemId] = (session.lootMap[itemId] || 0) + qty;
            } else {
                session.lootMap[lootStr] = (session.lootMap[lootStr] || 0) + 1;
            }
        });

        const logEntry = {
            id: now,
            run: (char.state.dungeon.lootLog?.length || 0) + 1,
            xp: rewards.xp,
            items: loot,
            timestamp: new Date(now).toISOString()
        };

        if (!char.state.dungeon.lootLog) char.state.dungeon.lootLog = [];
        char.state.dungeon.lootLog.unshift(logEntry);
        if (char.state.dungeon.lootLog.length > 50) char.state.dungeon.lootLog.pop();

        // Check for Repeats
        if (char.state.dungeon.repeatCount > 0) {
            try {
                // Consume all resources (Silver, Map, Food) for the next run
                const { playerIP } = await this.checkAndConsumeResources(char, config);
                const duration = getDungeonDuration(config.tier, playerIP);

                char.state.dungeon.repeatCount--;
                char.state.dungeon.currentRun = (char.state.dungeon.currentRun || 1) + 1;
                char.state.dungeon.started_at = now;
                char.state.dungeon.finish_at = now + duration;
                char.state.dungeon.status = 'EXPLORING';

                // Save immediately after starting a new repeat run
                await this.gameManager.saveState(char.id, char.state);

                return {
                    dungeonUpdate: {
                        status: 'EXPLORING',
                        message: `Starting repeat run...`,
                        rewards: { xp: rewards.xp, items: loot },
                        autoRepeat: true,
                        lootLog: char.state.dungeon.lootLog
                    },
                    leveledUp
                };
            } catch (e) {
                // Not enough resources to start the next run
                await this.saveDungeonLog(char, config, 'COMPLETED', null, now);
                char.state.dungeon.status = 'COMPLETED';
                // Save immediately when queue stops
                await this.gameManager.saveState(char.id, char.state);

                return {
                    dungeonUpdate: {
                        status: 'COMPLETED',
                        message: `Queue stopped: ${e.message}`,
                        rewards: { xp: rewards.xp, items: loot },
                        lootLog: char.state.dungeon.lootLog
                    },
                    leveledUp
                };
            }
        }

        // Final Run Completed
        await this.saveDungeonLog(char, config, 'COMPLETED', null, now);
        char.state.dungeon.status = 'COMPLETED';
        // Save immediately after final run
        await this.gameManager.saveState(char.id, char.state);

        return {
            dungeonUpdate: {
                status: 'COMPLETED',
                message: null,
                rewards: { xp: rewards.xp, items: loot },
                lootLog: char.state.dungeon.lootLog
            },
            leveledUp
        };
    }

    async stopDungeon(userId, characterId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char && char.state && char.state.dungeon) {
            const dungeonConfig = Object.values(DUNGEONS).find(d => d.id === char.state.dungeon.id);
            if (char.state.dungeon.status !== 'COMPLETED' && char.state.dungeon.status !== 'FAILED') {
                await this.saveDungeonLog(char, dungeonConfig, 'ABANDONED');
            }
            delete char.state.dungeon;
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true };
    }

    async stopQueue(userId, characterId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char && char.state && char.state.dungeon) {
            char.state.dungeon.repeatCount = 0;
            char.state.dungeon.stopping = true; // Flag for UI feedback
            await this.gameManager.saveState(char.id, char.state);
            return { success: true, message: "Queue stopped. Dungeon will finish after this run." };
        }
        return { success: false, message: "No active dungeon found." };
    }

    async saveDungeonLog(char, config, outcome, runLoot = null, virtualNow = null) {
        try {
            const dungeon = char.state.dungeon;
            if (!dungeon || !config) return;

            let rawLoot = runLoot ? [...runLoot] : [];
            let totalXp = 0;
            let duration = 0;
            const now = virtualNow || Date.now();

            if (dungeon.sessionStats) {
                totalXp = dungeon.sessionStats.totalXp;
                const sessionStart = dungeon.sessionStats.startTime || new Date(dungeon.started_at).getTime();
                duration = Math.floor((now - sessionStart) / 1000);

                const lootArray = [];
                for (const [itemId, qty] of Object.entries(dungeon.sessionStats.lootMap)) {
                    lootArray.push(`${qty}x ${itemId}`);
                }
                rawLoot = lootArray;
            } else if (!runLoot) {
                (dungeon.lootLog || []).forEach(log => {
                    totalXp += (log.xp || 0);
                    (log.items || []).forEach(item => rawLoot.push(item));
                });
            }

            const lootCounts = {};
            rawLoot.forEach(lootStr => {
                const match = lootStr.match(/^(\d+)x\s+(.+)$/);
                if (match) {
                    const qty = parseInt(match[1]);
                    const itemId = match[2];
                    lootCounts[itemId] = (lootCounts[itemId] || 0) + qty;
                } else {
                    lootCounts[lootStr] = (lootCounts[lootStr] || 0) + 1;
                }
            });

            const formattedLoot = Object.entries(lootCounts).map(([itemId, qty]) => `${qty}x ${itemId}`);
            const initialRepeats = dungeon.initialRepeats || 0;
            const currentRepeatCount = dungeon.repeatCount || 0;
            const total_runs = initialRepeats + 1;
            const runs_completed = dungeon.sessionStats ? dungeon.sessionStats.runsCompleted : ((initialRepeats - currentRepeatCount) + 1);

            const { error } = await this.gameManager.supabase.from('dungeon_history').insert({
                character_id: char.id,
                dungeon_id: dungeon.id || config?.id || 'UNKNOWN',
                dungeon_name: config?.name || dungeon.name || 'Unknown Dungeon',
                tier: dungeon.tier || config?.tier || 1,
                outcome: outcome,
                duration_seconds: duration,
                xp_gained: Math.floor(totalXp || 0),
                silver_gained: 0,
                loot_gained: formattedLoot,
                runs_completed: runs_completed,
                total_runs: total_runs
            });

            if (error) {
                console.error("Failed to save dungeon history:", error.message);
            } else {
                const { error: cleanupError } = await this.gameManager.supabase.rpc('cleanup_dungeon_history', {
                    p_character_id: char.id,
                    p_keep_count: 10
                });
                if (cleanupError) console.error("Failed to cleanup old dungeon history:", cleanupError.message);
            }
        } catch (err) {
            console.error("Error saving dungeon history log:", err);
        }
    }
}
