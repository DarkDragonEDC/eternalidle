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

        const mitigatedMobDmg = Math.max(1, mobDmg - Math.floor(playerStats.defense / 2));

        combat.mobHealth -= playerDmg;
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

            const xp = mobData ? mobData.xp : 10;
            leveledUp = this.gameManager.addXP(char, 'COMBAT', xp);
            roundDetails.xpGained = xp;

            if (mobData && mobData.silver) {
                const sMin = mobData.silver[0] || 0;
                const sMax = mobData.silver[1] || 10;
                const sGain = Math.floor(Math.random() * (sMax - sMin + 1)) + sMin;
                char.state.silver = (char.state.silver || 0) + sGain;
                roundDetails.silverGained = sGain;
                message += ` [${sGain} Silver]`;
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

            combat.kills = (combat.kills || 0) + 1;
            combat.mobHealth = combat.mobMaxHealth;
        }

        if (combat.playerHealth <= 0) {
            roundDetails.defeat = true;
            message = "You died!";
            delete char.state.combat;
        }

        return { message, leveledUp, details: roundDetails };
    }
}
