
import { DUNGEONS } from '../../shared/dungeons.js';
import { MONSTERS } from '../../shared/monsters.js';

export class DungeonManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startDungeon(userId, dungeonId) {
        const char = await this.gameManager.getCharacter(userId);
        if (char.state.combat) throw new Error("Cannot enter dungeon while in combat");
        if (char.current_activity) throw new Error("Cannot enter dungeon while busy (stop activity first)");
        if (char.state.dungeon) throw new Error("Already in a dungeon");

        const dungeon = Object.values(DUNGEONS).find(d => d.id === dungeonId);
        if (!dungeon) throw new Error("Dungeon not found");

        const mapId = dungeon.reqItem;
        const inventory = char.state.inventory || {};
        if (!inventory[mapId] || inventory[mapId] < 1) {
            throw new Error(`Missing required item: ${mapId}`);
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
            status: 'PREPARING' // PREPARING -> FIGHTING -> WAITING_NEXT_WAVE -> BOSS -> COMPLETED
        };

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Entered ${dungeon.name}` };
    }

    async processDungeonTick(char) {
        if (!char.state.dungeon) return;
        console.log(`[DUNGEON] Processing tick for ${char.name}. Status: ${char.state.dungeon.status}`);

        const dungeonState = char.state.dungeon;
        const dungeonConfig = Object.values(DUNGEONS).find(d => d.id === dungeonState.id);

        if (!dungeonConfig) {
            console.error(`[DUNGEON] Config not found for ID: ${dungeonState.id}`);
            return;
        }

        // If combat is active, do nothing (CombatManager handles the fight)
        if (char.state.combat) return;

        // If player is dead (no combat, but dungeon is active), FAIL dungeon
        if (char.state.health <= 0) {
            console.log(`[DUNGEON] Player ${char.name} died. Failing dungeon.`);
            delete char.state.dungeon;
            return { dungeonUpdate: { status: 'FAILED', message: "You died in the dungeon!" } };
        }

        // Logic for progressing waves
        if (dungeonState.status === 'PREPARING' || dungeonState.status === 'WAITING_NEXT_WAVE') {
            console.log(`[DUNGEON] Starting wave ${dungeonState.wave} for ${char.name}`);
            return this.startNextWave(char, dungeonConfig);
        }

        // If status is FIGHTING but no combat exists, it means we won the last fight
        if (dungeonState.status === 'FIGHTING' || dungeonState.status === 'BOSS_FIGHT') {
            console.log(`[DUNGEON] Wave cleared or boss defeated for ${char.name}. Wave: ${dungeonState.wave}`);
            if (dungeonState.wave < dungeonState.maxWaves) {
                dungeonState.wave++;
                dungeonState.status = 'WAITING_NEXT_WAVE';
                return this.startNextWave(char, dungeonConfig);
            } else {
                return this.completeDungeon(char, dungeonConfig);
            }
        }
    }

    async startNextWave(char, config) {
        const isBoss = char.state.dungeon.wave === char.state.dungeon.maxWaves;
        let mobId = null;

        if (isBoss) {
            mobId = config.bossId;
            char.state.dungeon.status = 'BOSS_FIGHT';
        } else {
            const mobs = config.trashMobs;
            mobId = mobs[Math.floor(Math.random() * mobs.length)];
            char.state.dungeon.status = 'FIGHTING';
        }

        console.log(`[DUNGEON] Spawning ${mobId} for ${char.name} (Boss: ${isBoss})`);
        try {
            await this.gameManager.combatManager.startCombat(char.user_id, mobId, config.tier);
        } catch (e) {
            console.error(`[DUNGEON] Failed to start combat for ${char.name}:`, e.message);
            // If combat failed (e.g. level too low), we should probably fail the dungeon or inform the user
            char.state.dungeon.status = 'ERROR';
            return { dungeonUpdate: { status: 'ERROR', message: e.message } };
        }

        if (char.state.combat) {
            char.state.combat.isDungeon = true;
        }

        return {
            dungeonUpdate: {
                status: char.state.dungeon.status,
                wave: char.state.dungeon.wave,
                totalWaves: char.state.dungeon.maxWaves,
                message: isBoss ? "BOSS FIGHT STARTED!" : `Wave ${char.state.dungeon.wave} Started`
            }
        };
    }

    async completeDungeon(char, config) {
        // Grant Rewards
        const rewards = config.rewards;
        const loot = [];

        // XP
        this.gameManager.addXP(char, 'COMBAT', rewards.xp);

        // Silver
        char.state.silver = (char.state.silver || 0) + rewards.silver;

        // Crest (Chance)
        // Hardcore plan: 20%
        if (Math.random() <= rewards.crest.chance) {
            this.gameManager.inventoryManager.addItemToInventory(char, rewards.crest.id, 1);
            loot.push(rewards.crest.id);
        }

        // Resource (Guarantee or Chance?) - Plan said 50%
        if (Math.random() <= rewards.resource.chance) {
            const qty = Math.floor(Math.random() * (rewards.resource.max - rewards.resource.min + 1)) + rewards.resource.min;
            this.gameManager.inventoryManager.addItemToInventory(char, rewards.resource.id, qty);
            loot.push(`${qty}x ${rewards.resource.id}`);
        }

        delete char.state.dungeon;
        // Optionally fully heal player on completion?

        return {
            dungeonUpdate: {
                status: 'COMPLETED',
                message: `Dungeon Cleared! Rewards: ${loot.join(', ') || 'No rare drops'}`,
                rewards: { xp: rewards.xp, silver: rewards.silver, items: loot }
            }
        };
    }

    async stopDungeon(userId) {
        const char = await this.gameManager.getCharacter(userId);
        if (char.state.dungeon) {
            delete char.state.dungeon;
            if (char.state.combat) {
                delete char.state.combat;
            }
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true, message: "Left the dungeon" };
    }
}
