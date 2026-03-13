import { MONSTERS } from '../../shared/monsters.js';
import { 
    DEFAULT_PLAYER_ATTACK_SPEED, 
    DEFAULT_MOB_ATTACK_SPEED, 
    MAX_MITIGATION, 
    MITIGATION_PER_DEFENSE 
} from '../../shared/combat.js';
import fs from 'fs';
import crypto from 'crypto';

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

        // Validate player health before starting
        const currentHealth = char.state.health || 0;
        if (currentHealth <= 0) {
            throw new Error("You are too weak to fight! You need at least 1 HP to start combat.");
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

        const playerStats = this.gameManager.inventoryManager.calculateStats(char);
        const playerAtkSpeed = Math.max(200, playerStats.attackSpeed || DEFAULT_PLAYER_ATTACK_SPEED);

        char.state.combat = {
            mobId: mobData.id,
            tier: tierNum,
            mobName: mobData.name,
            mobMaxHealth: mobMaxHP,
            mobHealth: mobMaxHP,
            mobDamage: customStats?.damage || mobData.damage,
            mobDefense: customStats?.defense || mobData.defense,
            mob_next_attack_at: Date.now(), // Mob attacks immediately
            player_next_attack_at: Date.now() + playerAtkSpeed,
            next_attack_at: Date.now(), // Trigger first tick immediately
            mobAtkSpeed: DEFAULT_MOB_ATTACK_SPEED, // Standardized mob speed
            playerHealth: currentHealth,
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

        // REMOVED: Auto-sync logic that was overwriting stats


        let mobDmg = combat.mobDamage;
        if (typeof mobDmg === 'undefined') {
            mobDmg = mobData ? mobData.damage : 5;
        }



        // Restore Mitigation Calculations
        // FORMULA: 1% Mitigation per 100 Defense (Linear). Capped at 75%
        const playerMitigation = Math.min(MAX_MITIGATION, playerStats.defense * MITIGATION_PER_DEFENSE);

        let mobDef = combat.mobDefense;
        if (typeof mobDef === 'undefined') {
            mobDef = mobData ? (mobData.defense || 0) : 0;
        }
        const mobMitigation = Math.min(MAX_MITIGATION, mobDef * MITIGATION_PER_DEFENSE);

        if (!combat.player_next_attack_at) combat.player_next_attack_at = now + (playerStats.attackSpeed || DEFAULT_PLAYER_ATTACK_SPEED);

        // Player Attack Logic (Time-based / Catch-up)
        let playerAttackCount = 0;
        let mitigatedPlayerDmg = 0;
        let isBurst = false;
        let playerHitList = [];

        if (now >= combat.player_next_attack_at) {
            const playerSpeed = Math.max(200, playerStats.attackSpeed || DEFAULT_PLAYER_ATTACK_SPEED); // Min 200ms cap

            // Calculate how many attacks fit
            playerAttackCount = 1 + Math.floor((now - combat.player_next_attack_at) / playerSpeed);

            // Cap at 50 to prevent infinite loops
            if (playerAttackCount > 50) playerAttackCount = 50;

            let singleHitDmg = playerDmg;



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

            // Sync if too far behind (Prevents "burst" attacks after respawn or lag)
            if (combat.player_next_attack_at < now - playerSpeed) {
                combat.player_next_attack_at = now + playerSpeed;
            }
        }

        // Mob Attack Logic (with catch-up for slow players)
        let mitigatedMobDmg = 0;
        let mobAttackCount = 0;
        let mobHitList = [];

        // Ensure initialization
        if (!combat.mob_next_attack_at) combat.mob_next_attack_at = now + (combat.mobAtkSpeed || DEFAULT_MOB_ATTACK_SPEED);

        // ONLY attack if mob is still alive
        if (combat.mobHealth > 0 && now >= combat.mob_next_attack_at) {
            const mobSpeed = combat.mobAtkSpeed || DEFAULT_MOB_ATTACK_SPEED;

            // Calculate how many attacks fit in the elapsed time
            // +1 because the current due attack counts
            mobAttackCount = 1 + Math.floor((now - combat.mob_next_attack_at) / mobSpeed);
            let foodEaten = 0;

            // Safety Cap to prevent infinite loops or millions of damage on lag spike
            if (mobAttackCount > 50) mobAttackCount = 50;

            let singleHitDmg = Math.max(1, Math.floor(mobDmg * (1 - playerMitigation)));

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

            // Sync if too far behind (Prevents "burst" attacks after respawn or lag)
            if (combat.mob_next_attack_at < now - mobSpeed) {
                combat.mob_next_attack_at = now + mobSpeed;
            }
        }

        char.state.health = Math.max(0, combat.playerHealth);

        let roundDetails = {
            playerDmg: mitigatedPlayerDmg,
            playerHits: playerAttackCount,
            mobDmg: mitigatedMobDmg,
            mobHits: mobAttackCount,
            silverGained: 0,
            lootGained: [],
            xpGained: 0,
            victory: false,
            defeat: false,
            mobName: combat.mobName,
            foodEaten: combat.foodEatenInRound || 0
        };

        // Aggressively prune hit lists if they are large or if we have many rounds
        if (playerHitList.length > 5) {
            roundDetails.playerHitList = playerHitList.slice(-5);
            roundDetails._playerHitsOmitted = playerHitList.length - 5;
        } else {
            roundDetails.playerHitList = playerHitList;
        }

        if (mobHitList.length > 5) {
            roundDetails.mobHitList = mobHitList.slice(-5);
            roundDetails._mobHitsOmitted = mobHitList.length - 5;
        } else {
            roundDetails.mobHitList = mobHitList;
        }

        // Reset the counter for next round
        combat.foodEatenInRound = 0;

        let message = `Dmg: ${mitigatedPlayerDmg}${isBurst ? ' (BURST!)' : ''} | Recv: ${mitigatedMobDmg}`;
        let leveledUp = null;
        if (combat.mobHealth <= 0) {
            roundDetails.victory = true;
            message = `Defeated ${combat.mobName}!`;

            // 1. Calculate Rewards
            const globals = playerStats.globals || {};
            const xpBonusMultiplier = 1 + (globals.xpYield || 0) / 100;
            const silverBonusMultiplier = 1 + (globals.silverYield || 0) / 100;
            const dropRateMultiplier = 1 + (globals.dropRate || 0) / 100;

            const baseMobXp = mobData ? (mobData.xp || 0) : 0;
            const finalXp = Math.floor(baseMobXp * xpBonusMultiplier);

            let finalSilver = 0;
            if (mobData && mobData.silver) {
                const [min, max] = mobData.silver;
                const baseSilver = Math.floor(Math.random() * (max - min + 1)) + min;
                finalSilver = Math.floor(baseSilver * silverBonusMultiplier);
            }

            // 2. Process Loot
            const lootGained = [];
            if (mobData && mobData.loot) {
                for (const [itemId, chance] of Object.entries(mobData.loot)) {
                    const finalChance = chance * dropRateMultiplier;
                    if (Math.random() < finalChance) {
                        const amount = 1;
                        const added = this.gameManager.inventoryManager.addItemToInventory(char, itemId, amount);
                        if (added) {
                            lootGained.push({ id: itemId, amount });
                            combat.sessionLoot[itemId] = (combat.sessionLoot[itemId] || 0) + amount;
                        }
                    }
                }
            }

            // 3. Apply Rewards
            char.state.silver = (char.state.silver || 0) + finalSilver;
            const levelUp = this.gameManager.addXP(char, 'COMBAT', finalXp);
            if (levelUp) leveledUp = levelUp;

            // --- 4. Proficiency XP (5% of base XP) ---
            if (playerStats.activeProf) {
                const profSkillKey = `${playerStats.activeProf.toUpperCase()}_PROFICIENCY`;
                const rawProfXp = finalXp * 0.05;
                
                if (!char.state.skills[profSkillKey]) {
                    char.state.skills[profSkillKey] = { level: 1, xp: 0, nextLevelXp: 84 };
                }

                const skillObj = char.state.skills[profSkillKey];
                skillObj.buffer = (Number(skillObj.buffer) || 0) + rawProfXp;

                if (skillObj.buffer >= 1) {
                    const wholeXp = Math.floor(skillObj.buffer);
                    skillObj.buffer -= wholeXp;
                    const profLevelUp = this.gameManager.addXP(char, profSkillKey, wholeXp);
                    if (profLevelUp) leveledUp = profLevelUp;
                }
            }

            // Accumulate Session Stats
            combat.sessionXp = (combat.sessionXp || 0) + finalXp;
            combat.sessionSilver = (combat.sessionSilver || 0) + finalSilver;
            combat.kills = (combat.kills || 0) + 1;

            roundDetails.silverGained = finalSilver;
            roundDetails.xpGained = finalXp;
            roundDetails.lootGained = lootGained;
        }

        if (combat.playerHealth <= 0) {
            roundDetails.defeat = true;
            message = "You died!";

            // Save History (Session end)
            await this.saveCombatLog(char, 'DEFEAT');

            delete char.state.combat;

            // Push Notification: Character Death
            if (char.user_id) {
                this.gameManager.pushManager.notifyUser(
                    char.user_id,
                    'push_character_death',
                    'Character Defeated! 💀',
                    `${char.name} has been defeated by ${combat.mobName}.`,
                    '/combat'
                );
            }
        }

        return { message, leveledUp, details: roundDetails };
    }

    async saveCombatLog(char, outcome) {
        try {
            const combat = char.state.combat;
            if (!combat) return;

            // Ensure we have a valid start time, fallback to now if missing
            const startedAt = combat.started_at ? new Date(combat.started_at) : new Date();
            const duration = Math.floor((Date.now() - startedAt.getTime()) / 1000);

            // Format loot for storage
            const formattedLoot = [];
            for (const [itemId, qty] of Object.entries(combat.sessionLoot || {})) {
                formattedLoot.push(`${qty}x ${itemId}`);
            }

            // --- INTEGRITY CHECK: Ensure mob_id is not null/undefined ---
            const mobId = combat.mobId || 'UNKNOWN';
            const mobName = combat.mobName || 'Unknown Enemy';

            const { error } = await this.gameManager.supabase.from('combat_history').insert({
                id: crypto.randomUUID(),
                character_id: char.id,
                mob_id: mobId,
                mob_name: mobName,
                outcome: outcome,
                duration_seconds: duration,
                xp_gained: Math.floor(combat.sessionXp || 0),
                silver_gained: Math.floor(combat.sessionSilver || 0),
                loot_gained: formattedLoot,
                damage_dealt: Math.floor(combat.totalPlayerDmg || 0),
                damage_taken: Math.floor(combat.totalMobDmg || 0),
                kills: combat.kills || 0
            });

            if (error) {
                console.error(`[DB-ERROR] Failed to save combat history for ${char.name}:`, error.message, error.details);
                // Optional: write to a local fallback log if critical
                fs.appendFileSync('failed_history_inserts.log', `[${new Date().toISOString()}] Combat: ${char.id}, Mob: ${mobId}, Error: ${error.message}\n`);
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
