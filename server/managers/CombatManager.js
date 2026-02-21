import { MONSTERS } from '../../shared/monsters.js';
import fs from 'fs';

const MAX_XP_PER_KILL = 10_000_000; // 10M
const MAX_SILVER_PER_KILL = 100_000_000; // 100M

export class CombatManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startCombat(userId, characterId, mobId, tier, existingChar = null, customStats = null) {
        const char = existingChar || await this.gameManager.getCharacter(userId, characterId);

        if (char.state.dungeon) {
            throw new Error("Cannot start combat while in a dungeon");
        }

        const tierNum = Number(tier);
        let mobData = null;
        if (MONSTERS[tierNum]) {
            mobData = MONSTERS[tierNum].find(m => m.id === mobId);
        }

        if (!mobData) throw new Error("Monster not found");

        if (mobData.dungeonOnly) {
            throw new Error("This monster is found only in dungeons");
        }

        const userLevel = char.state.skills?.COMBAT?.level || 1;
        const requiredLevel = tier == 1 ? 1 : (tier - 1) * 10;

        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires Combat Lv ${requiredLevel}`);
        }

        const mobMaxHP = customStats?.health || mobData.health;

        char.state.combat = {
            mobId: mobData.id,
            tier: tierNum,
            mobName: mobData.name,
            mobMaxHealth: mobMaxHP,
            mobHealth: mobMaxHP,
            mobDamage: customStats?.damage || mobData.damage,
            mobDefense: customStats?.defense || mobData.defense,
            mob_next_attack_at: Date.now() + 1000,
            mobAtkSpeed: 1000, // Default mob speed
            playerHealth: char.state.health || 100,
            auto: true,
            kills: 0,
            totalPlayerDmg: 0,
            totalMobDmg: 0,
            sessionXp: 0,
            sessionSilver: 0,
            sessionLoot: {},
            savedFoodCount: 0,
            foodConsumed: 0,
            started_at: new Date().toISOString()
        };
        char.last_saved = new Date().toISOString();

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Combat started against ${mobData.name}` };
    }

    async stopCombat(userId, characterId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char.state.combat) {
            // Save Session History
            await this.saveCombatLog(char, 'FLEE'); // Or 'STOPPED'

            delete char.state.combat;
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true, message: "Combat ended" };
    }

    async processCombatRound(char, currentTime = null) {
        const combat = char.state.combat;
        if (!combat) return null;

        // FIX: Sanitize Combat State (handle NaN/Undefined health)
        if (!combat.mobMaxHealth || isNaN(combat.mobMaxHealth)) {
            // console.log(`[COMBAT-FIX] Resetting invalid mobMaxHealth for ${char.name}`);
            combat.mobMaxHealth = 100; // Fallback
        }
        if (typeof combat.mobHealth !== 'number' || isNaN(combat.mobHealth)) {
            // console.log(`[COMBAT-FIX] Resetting invalid mobHealth for ${char.name}`);
            combat.mobHealth = combat.mobMaxHealth;
        }

        // Use simulated time if provided, otherwise real time
        const now = currentTime || Date.now();

        // Legacy/Safety Init
        if (!combat.sessionLoot) combat.sessionLoot = {};
        if (typeof combat.sessionXp === 'undefined') combat.sessionXp = 0;
        if (typeof combat.sessionSilver === 'undefined') combat.sessionSilver = 0;
        if (typeof combat.totalPlayerDmg === 'undefined') combat.totalPlayerDmg = 0;
        if (typeof combat.totalMobDmg === 'undefined') combat.totalMobDmg = 0;
        if (typeof combat.savedFoodCount === 'undefined') combat.savedFoodCount = 0;
        if (typeof combat.totalBurstDmg === 'undefined') combat.totalBurstDmg = 0;
        if (typeof combat.burstCount === 'undefined') combat.burstCount = 0;

        const playerStats = this.gameManager.inventoryManager.calculateStats(char);
        const playerDmg = playerStats.damage;

        let mobData = null;
        const currentTier = Number(combat.tier);
        if (MONSTERS[currentTier]) {
            mobData = MONSTERS[currentTier].find(m => m.id === combat.mobId);
        }
        combat.tier = currentTier; // Sanitização em tempo de execução

        // SYNC: Update active combat stats if config changed (and not custom/dungeon)
        try {
            if (mobData && !combat.isDungeon && !combat.isBoss) {
                if (combat.mobMaxHealth !== mobData.health || combat.mobDamage !== mobData.damage) {
                    fs.appendFileSync('sync_log.txt', `[SYNC] Char: ${char.name}, Mob: ${combat.mobId}, OldHP: ${combat.mobMaxHealth}, NewHP: ${mobData.health}\n`);
                    combat.mobMaxHealth = mobData.health;
                    combat.mobHealth = mobData.health;
                    combat.mobDamage = mobData.damage;
                    combat.mobDefense = mobData.defense || 0;
                    char._stateChanged = true;
                }
            }
        } catch (e) {
            fs.appendFileSync('sync_log.txt', `[ERROR] ${e.message}\n`);
        }

        let mobDmg = combat.mobDamage;
        if (typeof mobDmg === 'undefined') {
            mobDmg = mobData ? mobData.damage : 5;
        }

        // Restore Mitigation Calculations
        // NEW FORMULA: 1% Mitigation per 100 Defense (Linear). Capped at 75% (Matches UI)
        const playerMitigation = Math.min(0.75, playerStats.defense / 10000);

        let mobDef = combat.mobDefense;
        if (typeof mobDef === 'undefined') {
            mobDef = mobData ? (mobData.defense || 0) : 0;
        }
        const mobMitigation = Math.min(0.75, mobDef / 10000);

        if (!combat.player_next_attack_at) combat.player_next_attack_at = now + (playerStats.attackSpeed || 2000);

        // Player Attack Logic (Time-based / Catch-up)
        let playerAttackCount = 0;
        let mitigatedPlayerDmg = 0;
        let isBurst = false;
        let playerHitList = [];

        if (now >= combat.player_next_attack_at) {
            const playerSpeed = Math.max(200, playerStats.attackSpeed || 2000); // Min 200ms cap

            // Calculate how many attacks fit
            playerAttackCount = 1 + Math.floor((now - combat.player_next_attack_at) / playerSpeed);

            // Cap at 50 to prevent infinite loops
            if (playerAttackCount > 50) playerAttackCount = 50;

            const singleHitDmg = playerDmg;
            playerHitList = [];
            // "mitigatedPlayerDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)))"
            // It's linear/percent based, so (Dmg * Count) * Mitigation is same as (Dmg * Mitigation) * Count.

            const singleHitMitigated = Math.max(1, Math.floor(singleHitDmg * (1 - mobMitigation)));

            let currentMobHP = combat.mobHealth;
            for (let i = 0; i < playerAttackCount; i++) {
                let hitDmg = singleHitMitigated;

                // Burst Rune Logic (Per Hit)
                const burstChance = playerStats.burstChance || 0;
                let hitIsBurst = false;
                if (burstChance > 0 && Math.random() * 100 < burstChance) {
                    hitDmg = Math.floor(hitDmg * (playerStats.burstDmg || 1.5));
                    hitIsBurst = true;
                    isBurst = true;
                    combat.totalBurstDmg = (combat.totalBurstDmg || 0) + hitDmg;
                    combat.burstCount = (combat.burstCount || 0) + 1;
                }

                mitigatedPlayerDmg += hitDmg;
                playerHitList.push({ dmg: hitDmg, isBurst: hitIsBurst });

                currentMobHP -= hitDmg;
                if (currentMobHP <= 0) {
                    playerAttackCount = i + 1;
                    break;
                }
            }

            // Apply Player Damage
            combat.mobHealth -= mitigatedPlayerDmg;
            if (combat.mobHealth < 0) combat.mobHealth = 0;
            combat.totalPlayerDmg = (combat.totalPlayerDmg || 0) + mitigatedPlayerDmg;

            // Advance Timer
            combat.player_next_attack_at += (playerAttackCount * playerSpeed);

            // Sync if too far behind
            if (combat.player_next_attack_at < now - 10000) {
                combat.player_next_attack_at = now + playerSpeed;
            }
        }

        // Mob Attack Logic (with catch-up for slow players)
        let mitigatedMobDmg = 0;
        let mobAttackCount = 0;
        let mobHitList = [];

        // Ensure initialization
        if (!combat.mob_next_attack_at) combat.mob_next_attack_at = now + (combat.mobAtkSpeed || 1000);

        if (now >= combat.mob_next_attack_at) {
            const mobSpeed = combat.mobAtkSpeed || 1000;

            // Calculate how many attacks fit in the elapsed time
            // +1 because the current due attack counts
            mobAttackCount = 1 + Math.floor((now - combat.mob_next_attack_at) / mobSpeed);
            let foodEaten = 0;

            // Safety Cap to prevent infinite loops or millions of damage on lag spike
            if (mobAttackCount > 50) mobAttackCount = 50;

            const singleHitDmg = Math.max(1, Math.floor(mobDmg * (1 - playerMitigation)));
            mobHitList = [];

            // Loop through each attack for reactive healing
            for (let a = 0; a < mobAttackCount; a++) {
                combat.playerHealth -= singleHitDmg;
                mitigatedMobDmg += singleHitDmg;
                mobHitList.push(singleHitDmg);

                // REACTIVE HEALING: Check food after each hit to prevent burst deaths
                const virtualTime = (combat.mob_next_attack_at || now) + (a * mobSpeed);
                const result = this.gameManager.processFood(char, virtualTime);
                if (result.used) {
                    foodEaten += (result.eaten || 0);
                }

                if (combat.playerHealth <= 0) break;
            }

            combat.totalMobDmg = (combat.totalMobDmg || 0) + mitigatedMobDmg;
            combat.foodEatenInRound = (combat.foodEatenInRound || 0) + foodEaten;

            // Advance the timer by the EXACT amount of time covered by these attacks
            // This maintains the rhythm/average DPS
            combat.mob_next_attack_at += (mobAttackCount * mobSpeed);

            // If for some reason we are still behind (due to cap or drift), force sync to avoid death spiral
            if (combat.mob_next_attack_at < now - 10000) {
                combat.mob_next_attack_at = now + mobSpeed;
            }
        }

        char.state.health = Math.max(0, combat.playerHealth);

        let roundDetails = {
            playerDmg: mitigatedPlayerDmg,
            playerHits: playerAttackCount,
            mobDmg: mitigatedMobDmg,
            mobHits: mobAttackCount,
            playerHitList,
            mobHitList,
            silverGained: 0,
            lootGained: [],
            xpGained: 0,
            victory: false,
            defeat: false,
            mobName: combat.mobName,
            foodEaten: combat.foodEatenInRound || 0
        };

        // Reset the counter for next round
        combat.foodEatenInRound = 0;

        let message = `Dmg: ${mitigatedPlayerDmg}${isBurst ? ' (BURST!)' : ''} | Recv: ${mitigatedMobDmg}`;
        let leveledUp = false;

        if (combat.mobHealth <= 0) {
            roundDetails.victory = true;
            message = `Defeated ${combat.mobName}!`;

            try {
                const baseXp = mobData ? mobData.xp : 10;
                const xpBonus = playerStats.globals?.xpYield || 0;
                let finalXp = Math.floor(baseXp * (1 + xpBonus / 100)); // +1% per point

                // --- FARM CAP: Proficiency Overleveling Penalty ---
                // Tier-to-Level: T1=1, T2=10, T3=20 ... T10=90
                const mobTierLevel = currentTier <= 1 ? 1 : (currentTier - 1) * 10;
                const weaponObj = char.state.equipment?.mainHand;
                const weaponId = (weaponObj?.id || '').toUpperCase();
                let profSkillKey = null;
                if (weaponId.includes('SWORD')) profSkillKey = 'WARRIOR_PROFICIENCY';
                else if (weaponId.includes('BOW')) profSkillKey = 'HUNTER_PROFICIENCY';
                else if (weaponId.includes('STAFF')) profSkillKey = 'MAGE_PROFICIENCY';

                const profLevel = profSkillKey ? (char.state.skills?.[profSkillKey]?.level || 1) : 1;
                const levelDiff = profLevel - mobTierLevel;

                let farmCapPenalty = 1.0; // 1.0 = no penalty
                if (levelDiff >= 20) {
                    farmCapPenalty = 0.2; // 80% penalty
                } else if (levelDiff >= 10) {
                    farmCapPenalty = 0.5; // 50% penalty
                }

                finalXp = Math.floor(finalXp * farmCapPenalty);

                // Safety Cap
                if (finalXp > MAX_XP_PER_KILL) finalXp = MAX_XP_PER_KILL;

                leveledUp = this.gameManager.addXP(char, 'COMBAT', finalXp);
                roundDetails.xpGained = finalXp;

                // --- PROFICIENCY XP LOGIC ---
                // 10% of Combat XP goes to the active weapon proficiency
                const profXp = Math.floor(finalXp * 0.1);
                if (profXp > 0) {
                    // profSkillKey already determined above for farm cap
                    if (profSkillKey) {
                        const profLeveled = this.gameManager.addXP(char, profSkillKey, profXp);
                        if (profLeveled) {
                            leveledUp = profLeveled; // Store the object, not just true
                        }

                        // Track session XP for specific proficiency
                        if (!char.state.combat.sessionProfXp) char.state.combat.sessionProfXp = {};
                        char.state.combat.sessionProfXp[profSkillKey] = (char.state.combat.sessionProfXp[profSkillKey] || 0) + profXp;
                    }
                }



                // Track Persistent Stats (Kills)
                if (!char.state.stats) char.state.stats = {};
                char.state.stats.totalKills = (char.state.stats.totalKills || 0) + 1;

                let finalSilver = 0;
                if (mobData && mobData.silver) {
                    const sMin = mobData.silver[0] || 0;
                    const sMax = mobData.silver[1] || 10;
                    const baseSilver = Math.floor(Math.random() * (sMax - sMin + 1)) + sMin;

                    const silverBonus = playerStats.globals?.silverYield || 0;
                    finalSilver = Math.floor(baseSilver * (1 + silverBonus / 100));

                    // Apply farm cap penalty to silver too
                    finalSilver = Math.floor(finalSilver * farmCapPenalty);

                    // Safety Cap
                    if (finalSilver > MAX_SILVER_PER_KILL) finalSilver = MAX_SILVER_PER_KILL;

                    char.state.silver = (char.state.silver || 0) + finalSilver;
                    roundDetails.silverGained = finalSilver;
                    message += ` [${finalSilver} Silver]`;
                }

                if (mobData && mobData.loot) {
                    const dropBonus = playerStats.globals?.dropRate || 0;
                    const dropMult = 1 + (dropBonus / 100);

                    for (const [lootId, chance] of Object.entries(mobData.loot)) {
                        if (Math.random() <= (chance * dropMult)) {
                            this.gameManager.inventoryManager.addItemToInventory(char, lootId, 1);
                            roundDetails.lootGained.push(lootId);
                            message += ` [Item: ${lootId}]`;

                            // Accumulate Session Loot
                            if (!combat.sessionLoot) combat.sessionLoot = {};
                            combat.sessionLoot[lootId] = (combat.sessionLoot[lootId] || 0) + 1;
                        }
                    }
                }

                // Accumulate Session Stats
                combat.sessionXp = (combat.sessionXp || 0) + finalXp;
                combat.sessionSilver = (combat.sessionSilver || 0) + (finalSilver || 0);

            } catch (err) {
            }

            combat.kills = (combat.kills || 0) + 1;
            // combat.mobHealth = combat.mobMaxHealth; // REMOVED: Managed by GameManager with delay
        }

        if (combat.playerHealth <= 0) {
            roundDetails.defeat = true;
            message = "You died!";

            // Save History (Session end)
            await this.saveCombatLog(char, 'DEFEAT');

            delete char.state.combat;
        }

        return { message, leveledUp, details: roundDetails };
    }

    async saveCombatLog(char, outcome) {
        try {
            const combat = char.state.combat;
            if (!combat) return;

            const duration = Math.floor((Date.now() - new Date(combat.started_at).getTime()) / 1000);

            // Format loot for storage
            const formattedLoot = [];
            for (const [itemId, qty] of Object.entries(combat.sessionLoot || {})) {
                formattedLoot.push(`${qty}x ${itemId}`);
            }

            const { error } = await this.gameManager.supabase.from('combat_history').insert({
                character_id: char.id,
                mob_id: combat.mobId,
                mob_name: combat.mobName,
                outcome: outcome,
                duration_seconds: duration,
                xp_gained: combat.sessionXp || 0,
                silver_gained: combat.sessionSilver || 0,
                loot_gained: formattedLoot,
                damage_dealt: combat.totalPlayerDmg || 0,
                damage_taken: combat.totalMobDmg || 0,
                kills: combat.kills || 0
            });

            if (error) {
                console.error("Failed to save combat history:", error.message);
            }

            // Send System Notification
            this.gameManager.addActionSummaryNotification(char, 'Combat', {
                itemsGained: combat.sessionLoot || {},
                xpGained: { COMBAT: combat.sessionXp || 0 },
                totalTime: duration,
                kills: combat.kills || 0,
                silverGained: combat.sessionSilver || 0
            });

        } catch (err) {
            console.error("Error saving combat history log:", err);
        }
    }
}
