import { DUNGEONS } from '../../shared/dungeons.js';
import { MONSTERS } from '../../shared/monsters.js';

export class DungeonManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startDungeon(userId, dungeonId) {
        const char = await this.gameManager.getCharacter(userId);
        const dungeon = Object.values(DUNGEONS).find(d => d.id === dungeonId);

        if (!dungeon) throw new Error("Dungeon not found");

        const combatLevel = char.state.skills?.COMBAT?.level || 1;
        if (combatLevel < dungeon.minLevel) {
            throw new Error(`Insufficient level! Requires Combat Lv ${dungeon.minLevel}`);
        }

        if (char.state.combat || char.current_activity) {
            throw new Error("You are already busy!");
        }

        char.state.dungeon = {
            id: dungeon.id,
            name: dungeon.name,
            currentLevel: 1,
            currentRoom: 1,
            maxLevels: dungeon.levels,
            roomsPerLevel: dungeon.roomsPerLevel,
            status: 'IN_PROGRESS',
            lastUpdate: Date.now(),
            logs: [`Entered ${dungeon.name}`]
        };

        // Automaticamente inicia o primeiro combate se a sala tiver monstro
        await this.setupRoom(char);

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Entered ${dungeon.name}` };
    }

    async setupRoom(char) {
        const dungeonState = char.state.dungeon;
        const dungeon = DUNGEONS[dungeonState.id.replace('dungeon_t', '')];

        if (!dungeon) return;

        // Decidir se a sala tem monstro, baú ou é vazia
        // Por enquanto, sempre monstro
        const isBossRoom = dungeonState.currentLevel === dungeon.levels && dungeonState.currentRoom === dungeon.roomsPerLevel;

        const mobId = isBossRoom ? dungeon.boss : dungeon.monsterPool[Math.floor(Math.random() * dungeon.monsterPool.length)];

        await this.gameManager.combatManager.startCombat(char.id, mobId, dungeon.tier);
        // O startCombat já salva o estado, mas aqui estamos dentro de uma transição de dungeon
    }

    async processDungeonVictory(char) {
        if (!char.state.dungeon) return;

        const dungeonState = char.state.dungeon;
        dungeonState.currentRoom++;

        if (dungeonState.currentRoom > dungeonState.roomsPerLevel) {
            dungeonState.currentRoom = 1;
            dungeonState.currentLevel++;
        }

        if (dungeonState.currentLevel > dungeonState.maxLevels) {
            // Dungeon Cleared!
            const dungeon = DUNGEONS[dungeonState.id.replace('dungeon_t', '')];
            const rewards = dungeon.rewards;

            let report = `Dungeon ${dungeon.name} Cleared! `;

            // Silver Reward
            const silver = Math.floor(Math.random() * (rewards.silver[1] - rewards.silver[0] + 1)) + rewards.silver[0];
            char.state.silver = (char.state.silver || 0) + silver;
            report += `Gained ${silver} Silver. `;

            // Loot Reward
            for (const [itemId, chance] of Object.entries(rewards.loot)) {
                if (Math.random() <= chance) {
                    this.gameManager.inventoryManager.addItemToInventory(char, itemId, 1);
                    report += `Found ${itemId}. `;
                }
            }

            delete char.state.dungeon;
            delete char.state.combat; // Importante limpar o combate final do boss

            return { finished: true, message: report };
        } else {
            // Próxima sala
            dungeonState.logs.push(`Proceeding to Level ${dungeonState.currentLevel} Room ${dungeonState.currentRoom}`);
            await this.setupRoom(char);
            return { finished: false, message: "Room cleared! Moving forward..." };
        }
    }
}
