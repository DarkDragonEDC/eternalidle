import { MONSTERS } from '../../shared/monsters.js';

export class CombatManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startCombat(userId, mobId, tier) {
        const char = await this.gameManager.getCharacter(userId);

        let mobData = null;
        if (MONSTERS[tier]) {
            mobData = MONSTERS[tier].find(m => m.id === mobId);
        }

        if (!mobData) throw new Error("Monster not found");

        const userLevel = char.state.skills?.COMBAT?.level || 1;
        const requiredLevel = tier == 1 ? 1 : (tier - 1) * 10;

        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires Combat Lv ${requiredLevel}`);
        }

        char.state.combat = {
            mobId: mobData.id,
            tier: tier,
            mobName: mobData.name,
            mobMaxHealth: mobData.health,
            mobHealth: mobData.health,
            playerHealth: char.state.health || 100,
            auto: true,
            kills: 0,
            started_at: new Date().toISOString()
        };

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Combat started against ${mobData.name}` };
    }

    async stopCombat(userId) {
        const char = await this.gameManager.getCharacter(userId);
        if (char.state.combat) {
            delete char.state.combat;
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true, message: "Combat ended" };
    }

    async processCombatRound(char) {
        const combat = char.state.combat;
        if (!combat) return null;

        const playerStats = this.gameManager.inventoryManager.calculateStats(char);
        const playerDmg = playerStats.damage;

        let mobData = null;
        if (MONSTERS[combat.tier]) {
            mobData = MONSTERS[combat.tier].find(m => m.id === combat.mobId);
        }
        let mobDmg = mobData ? mobData.damage : 5;

        const playerMitigation = playerStats.defense / (playerStats.defense + 2000);
        const mitigatedMobDmg = Math.max(1, Math.floor(mobDmg * (1 - playerMitigation)));

        const mobDef = mobData ? (mobData.defense || 0) : 0;
        const mobMitigation = mobDef / (mobDef + 2000);
        const mitigatedPlayerDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));

        combat.mobHealth -= mitigatedPlayerDmg;
        combat.playerHealth -= mitigatedMobDmg;

        char.state.health = Math.max(0, combat.playerHealth);

        let roundDetails = {
            playerDmg,
            mobDmg: mitigatedMobDmg,
            silverGained: 0,
            lootGained: [],
            xpGained: 0,
            victory: false,
            defeat: false,
            mobName: combat.mobName
        };

        let message = `Dmg: ${playerDmg} | Received: ${mitigatedMobDmg}`;
        let leveledUp = false;

        if (combat.mobHealth <= 0) {
            roundDetails.victory = true;
            message = `Defeated ${combat.mobName}!`;

            const baseXp = mobData ? mobData.xp : 10;
            const xpBonus = playerStats.globals?.xpYield || 0;
            const finalXp = Math.floor(baseXp * (1 + xpBonus / 100)); // +1% per point
            leveledUp = this.gameManager.addXP(char, 'COMBAT', finalXp);
            roundDetails.xpGained = finalXp;

            if (mobData && mobData.silver) {
                const sMin = mobData.silver[0] || 0;
                const sMax = mobData.silver[1] || 10;
                const baseSilver = Math.floor(Math.random() * (sMax - sMin + 1)) + sMin;

                const silverBonus = playerStats.globals?.silverYield || 0;
                const finalSilver = Math.floor(baseSilver * (1 + silverBonus / 100));

                char.state.silver = (char.state.silver || 0) + finalSilver;
                roundDetails.silverGained = finalSilver;
                message += ` [${finalSilver} Silver]`;
            }

            if (mobData && mobData.loot) {
                for (const [lootId, chance] of Object.entries(mobData.loot)) {
                    if (Math.random() <= chance) {
                        this.gameManager.inventoryManager.addItemToInventory(char, lootId, 1);
                        roundDetails.lootGained.push(lootId);
                        message += ` [Item: ${lootId}]`;
                    }
                }
            }

            if (combat.isDungeon) {
                delete char.state.combat;
            } else {
                combat.kills = (combat.kills || 0) + 1;
                combat.mobHealth = combat.mobMaxHealth;
            }
        }

        if (combat.playerHealth <= 0) {
            roundDetails.defeat = true;
            message = "You died!";
            delete char.state.combat;
        }

        return { message, leveledUp, details: roundDetails };
    }
}
