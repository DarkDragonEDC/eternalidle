
import { DUNGEONS } from '../../shared/dungeons.js';
import { MONSTERS } from '../../shared/monsters.js';

const WAVE_DURATION = 60 * 1000; // 1 minute per wave
const MAX_DUNGEON_TIME = 12 * 60 * 60 * 1000; // 12 hours safety limit
const MAX_DUNGEON_XP = 100_000_000; // 100M

export class DungeonManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startDungeon(userId, characterId, dungeonId, repeatCount = 0) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char.state.dungeon) throw new Error("Already in a dungeon");
        if (char.state.combat) throw new Error("Cannot enter dungeon while in combat");

        const dungeon = Object.values(DUNGEONS).find(d => d.id === dungeonId);
        if (!dungeon) throw new Error("Dungeon not found");

        // ---- Silver cost check ----
        const entryCost = dungeon.entrySilver || 0;
        if ((char.state.silver || 0) < entryCost) {
            throw new Error(`Not enough silver to enter dungeon (requires ${entryCost})`);
        }
        // Deduct silver
        char.state.silver = (char.state.silver || 0) - entryCost;

        const inventory = char.state.inventory || {};
        const mapId = dungeon.reqItem;
        if (!inventory[mapId] || inventory[mapId] < 1) {
            throw new Error(`Missing required item: ${mapId}`);
        }

        // Level Requirement Check
        const dungeonLevel = char.state.skills?.DUNGEONEERING?.level || 1;
        if (dungeonLevel < (dungeon.reqLevel || 1)) {
            throw new Error(`Dungeoneering level ${dungeon.reqLevel} required to enter this dungeon`);
        }

        // Consume Map
        this.gameManager.inventoryManager.consumeItems(char, { [mapId]: 1 });

        // Initialize Dungeon State
        char.state.dungeon = {
            id: dungeonId,
            tier: dungeon.tier,
            wave: 1,
            maxWaves: dungeon.waves,
            active: true,
            started_at: new Date().toISOString(),
            status: 'PREPARING',
            repeatCount: repeatCount,
            initialRepeats: repeatCount,
            wave_started_at: Date.now(),
            lootLog: []
        };
        char.last_saved = new Date().toISOString();

        await this.gameManager.saveState(char.id, char.state);
        return { success: true };
    }

    async processDungeonTick(char) {
        try {
            if (!char.state.dungeon) return;

            const dungeonState = char.state.dungeon;
            const dungeonConfig = Object.values(DUNGEONS).find(d => d.id === dungeonState.id);

            if (!dungeonConfig) {
                console.error(`[DUNGEON] Config not found for ID: ${dungeonState.id}`);
                return;
            }

            const now = Date.now();
            const totalElapsed = now - new Date(dungeonState.started_at).getTime();

            // 1. Max Time Check (Safety)
            if (totalElapsed > MAX_DUNGEON_TIME) {
                console.log(`[DUNGEON] Dungeon timed out for ${char.name}`);
                delete char.state.dungeon;
                if (char.state.combat) delete char.state.combat;
                return { dungeonUpdate: { status: 'FAILED', message: "Dungeon time limit reached!" } };
            }

            const stats = this.gameManager.inventoryManager.calculateStats(char);

            // 2. WALKING Logic
            if (dungeonState.status === 'WALKING') {
                const waveElapsed = now - (dungeonState.wave_started_at || now);
                const timeLeft = Math.ceil((WAVE_DURATION - waveElapsed) / 1000);

                if (waveElapsed >= WAVE_DURATION) {
                    if (dungeonState.wave < dungeonState.maxWaves) {
                        dungeonState.wave++;
                        dungeonState.status = 'WAITING_NEXT_WAVE';
                        return this.startNextWave(char, dungeonConfig);
                    } else {
                        return this.completeDungeon(char, dungeonConfig);
                    }
                } else {
                    return {
                        dungeonUpdate: {
                            status: 'WALKING',
                            message: null,
                            timeLeft: timeLeft
                        }
                    };
                }
            }

            // 3. Combat Logic (FIGHTING or BOSS_FIGHT)
            if (dungeonState.status === 'FIGHTING' || dungeonState.status === 'BOSS_FIGHT') {
                if (dungeonState.activeMob) {
                    const playerAtkSpeed = Math.max(200, stats.attackSpeed || 1000);

                    // Initial setup if missing
                    if (!dungeonState.activeMob.next_player_attack_at) {
                        dungeonState.activeMob.next_player_attack_at = now;
                        dungeonState.activeMob.next_mob_attack_at = now + 500;
                    }

                    // A. Player Attacks Mob (Burst Hits)
                    let pIterations = 0;
                    const MAX_BURST = 50;

                    while (now >= dungeonState.activeMob.next_player_attack_at && dungeonState.activeMob.health > 0 && pIterations < MAX_BURST) {
                        const playerDmg = Math.max(1, (stats.damage || 1));
                        const mobDef = dungeonState.activeMob.defense || 0;
                        const mobMitigation = mobDef / (mobDef + 2000);
                        const finalPlayerDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));

                        dungeonState.activeMob.health -= finalPlayerDmg;
                        dungeonState.activeMob.next_player_attack_at += playerAtkSpeed;
                        pIterations++;

                        if (dungeonState.activeMob.health <= 0) {
                            dungeonState.activeMob.health = 0;
                            break;
                        }
                    }

                    // Safety catch-up
                    if (dungeonState.activeMob.next_player_attack_at < now) {
                        dungeonState.activeMob.next_player_attack_at = now + playerAtkSpeed;
                    }

                    if (dungeonState.activeMob.health <= 0) {
                        // Mob Defeated!
                        const mobConfig = MONSTERS[dungeonConfig.tier]?.find(m => m.id === dungeonState.activeMob.id);

                        // Grant Dungeoneering XP only
                        if (mobConfig && mobConfig.xp) {
                            await this.gameManager.addXP(char, 'DUNGEONEERING', Math.floor(mobConfig.xp * 0.5));
                        }

                        // Advance to next state
                        const waveElapsed = now - (dungeonState.wave_started_at || now);
                        if (waveElapsed < WAVE_DURATION) {
                            dungeonState.status = 'WALKING';
                            const timeLeft = Math.ceil((WAVE_DURATION - waveElapsed) / 1000);
                            return {
                                dungeonUpdate: {
                                    status: 'WALKING',
                                    message: `Defeated ${dungeonState.activeMob.name}!`,
                                    timeLeft: timeLeft
                                }
                            };
                        } else {
                            if (dungeonState.wave < dungeonState.maxWaves) {
                                dungeonState.wave++;
                                dungeonState.status = 'WAITING_NEXT_WAVE';
                                return this.startNextWave(char, dungeonConfig);
                            } else {
                                return this.completeDungeon(char, dungeonConfig);
                            }
                        }
                    }

                    // B. Mob Attacks Player (Burst Hits)
                    let mIterations = 0;
                    const mobAtkSpeed = (dungeonState.activeMob.attackSpeed || 1000);
                    while (now >= dungeonState.activeMob.next_mob_attack_at && dungeonState.activeMob.health > 0 && mIterations < MAX_BURST) {
                        const mobDmg = dungeonState.activeMob.damage || 0;
                        const playerDef = stats.defense || 0;
                        const playerMitigation = Math.min(0.8, playerDef / (playerDef + 2000));
                        const finalMobDmg = Math.max(1, Math.floor(mobDmg * (1 - playerMitigation)));

                        char.state.health -= finalMobDmg;
                        dungeonState.activeMob.next_mob_attack_at += mobAtkSpeed;
                        mIterations++;

                        // COMIDA ONLINE (Dungeon): Consumir comida a cada hit tomado para garantir sobrevivência
                        this.gameManager.processFood(char);

                        if (char.state.health <= 0) {
                            char.state.health = 0;
                            await this.saveDungeonLog(char, dungeonConfig, 'FAILED');
                            delete char.state.dungeon;
                            return { dungeonUpdate: { status: 'FAILED', message: "You were defeated!" } };
                        }
                    }

                    // Safety catch-up
                    if (dungeonState.activeMob.next_mob_attack_at < now) {
                        dungeonState.activeMob.next_mob_attack_at = now + mobAtkSpeed;
                    }

                    return {
                        dungeonUpdate: {
                            status: dungeonState.status,
                            activeMob: dungeonState.activeMob,
                            wave: dungeonState.wave
                        }
                    };
                }
            }

            if (char.state.health <= 0) {
                await this.saveDungeonLog(char, dungeonConfig, 'FAILED');
                delete char.state.dungeon;
                return { dungeonUpdate: { status: 'FAILED', message: null } };
            }

            if (dungeonState.status === 'PREPARING' || dungeonState.status === 'WAITING_NEXT_WAVE') {
                return this.startNextWave(char, dungeonConfig);
            }
        } catch (error) {
            console.error(`[DUNGEON] Error in processDungeonTick:`, error);
        }
    }

    async startNextWave(char, config) {
        const wave = char.state.dungeon.wave;
        const isBoss = wave === char.state.dungeon.maxWaves;
        let mobId = null;

        char.state.dungeon.wave_started_at = Date.now();
        const scalingFactor = isBoss ? 1.5 : (1 + (wave - 1) * 0.1);

        if (isBoss) {
            mobId = config.bossId;
            char.state.dungeon.status = 'BOSS_FIGHT';
        } else {
            const mobs = config.trashMobs;
            mobId = mobs[wave - 1] || mobs[mobs.length - 1];
            char.state.dungeon.status = 'FIGHTING';
        }

        const baseMob = MONSTERS[config.tier].find(m => m.id === mobId);
        if (!baseMob) {
            console.error(`[DUNGEON] Mob ${mobId} not found in tier ${config.tier}`);
            char.state.dungeon.status = 'ERROR';
            return { dungeonUpdate: { status: 'ERROR', message: `Mob ${mobId} not found` } };
        }

        const scaledStats = {
            health: Math.floor(baseMob.health * scalingFactor),
            damage: Math.floor(baseMob.damage * scalingFactor),
            defense: Math.floor(baseMob.defense * scalingFactor)
        };

        char.state.dungeon.activeMob = {
            id: mobId,
            name: baseMob.name,
            health: scaledStats.health,
            maxHealth: scaledStats.health,
            damage: scaledStats.damage,
            defense: scaledStats.defense,
            attackSpeed: 1000,
            next_player_attack_at: Date.now(),
            next_mob_attack_at: Date.now() + 500
        };

        return {
            dungeonUpdate: {
                status: char.state.dungeon.status,
                wave: wave,
                activeMob: char.state.dungeon.activeMob
            }
        };
    }

    async completeDungeon(char, config) {
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

        const inventory = char.state.inventory || {};
        const mapId = config.reqItem;

        const logEntry = {
            id: Date.now(),
            run: (char.state.dungeon.lootLog?.length || 0) + 1,
            xp: rewards.xp,
            items: loot,
            timestamp: new Date().toISOString()
        };

        if (!char.state.dungeon.lootLog) char.state.dungeon.lootLog = [];
        char.state.dungeon.lootLog.unshift(logEntry);
        if (char.state.dungeon.lootLog.length > 50) char.state.dungeon.lootLog.pop();

        await this.saveDungeonLog(char, config, 'COMPLETED', {
            xp: rewards.xp,
            loot: loot
        });

        if (char.state.dungeon.repeatCount > 0 && inventory[mapId] && inventory[mapId] >= 1) {
            this.gameManager.inventoryManager.consumeItems(char, { [mapId]: 1 });
            char.state.dungeon.repeatCount--;
            char.state.dungeon.wave = 1;
            char.state.dungeon.status = 'PREPARING';
            char.state.dungeon.started_at = new Date().toISOString();
            char.state.dungeon.wave_started_at = Date.now();

            return {
                dungeonUpdate: {
                    status: 'PREPARING',
                    message: null,
                    rewards: { xp: rewards.xp, items: loot },
                    autoRepeat: true,
                    lootLog: char.state.dungeon.lootLog
                },
                leveledUp
            };
        }

        char.state.dungeon.status = 'COMPLETED';

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
            if (char.state.combat && char.state.combat.isDungeon) {
                delete char.state.combat;
            }
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true };
    }

    async saveDungeonLog(char, config, outcome, runLoot = null) {
        try {
            const dungeon = char.state.dungeon;
            if (!dungeon || !config) return;

            const duration = Math.floor((Date.now() - new Date(dungeon.started_at).getTime()) / 1000);

            let totalXp = runLoot ? runLoot.xp : 0;
            let rawLoot = runLoot ? (runLoot.loot || []) : [];

            if (!runLoot) {
                (dungeon.lootLog || []).forEach(log => {
                    totalXp += (log.xp || 0);
                    (log.items || []).forEach(item => rawLoot.push(item));
                });
            }

            // Aggregate loot: counts occurrences of the same item string
            const lootCounts = {};
            rawLoot.forEach(lootStr => {
                // Check if it's already in "Nx ITEM" format
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
            const runs_completed = (initialRepeats - currentRepeatCount) + 1;

            const { error } = await this.gameManager.supabase.from('dungeon_history').insert({
                character_id: char.id,
                dungeon_id: dungeon.id,
                dungeon_name: config.name,
                tier: dungeon.tier,
                wave_reached: dungeon.wave,
                max_waves: dungeon.maxWaves,
                outcome: outcome,
                duration_seconds: duration,
                xp_gained: totalXp,
                silver_gained: 0, // Drop removed by user, saving 0 for consistency
                loot_gained: formattedLoot,
                runs_completed: runs_completed,
                total_runs: total_runs
            });

            if (error) {
                console.error("Failed to save dungeon history:", error.message);
            }
        } catch (err) {
            console.error("Error saving dungeon history log:", err);
        }
    }
}
