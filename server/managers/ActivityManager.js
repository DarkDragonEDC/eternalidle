import { ITEMS } from '../../shared/items.js';

const ITEM_LOOKUP = {};
const flattenItems = (obj) => {
    for (const key in obj) {
        if (obj[key] && obj[key].id) {
            ITEM_LOOKUP[obj[key].id] = obj[key];
        } else if (typeof obj[key] === 'object') {
            flattenItems(obj[key]);
        }
    }
};
flattenItems(ITEMS);

export class ActivityManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startActivity(userId, characterId, actionType, itemId, quantity = 1) {
        console.log(`[ACTIVITY] Start Request: User=${userId}, Type=${actionType}, Item=${itemId}`);
        const type = actionType.toUpperCase();
        const char = await this.gameManager.getCharacter(userId, characterId);
        console.log(`[ACTIVITY] Char loaded: ${char?.name}. Skills keys: ${Object.keys(char.state.skills).length}`);
        const item = ITEM_LOOKUP[itemId];
        if (!item) throw new Error("Item not found");

        const skillKey = this.getSkillKeyForActivity(type, itemId);
        const userLevel = char.state.skills[skillKey]?.level || 1;
        const requiredLevel = item.tier === 1 ? 1 : (item.tier - 1) * 10;

        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires ${skillKey} Lv ${requiredLevel}`);
        }

        let baseTime = item.time || 3.0;
        // Fallbacks if item.time is missing (for legacy or safety)
        if (!item.time) {
            if (type === 'GATHERING') baseTime = 3.0;
            else if (type === 'REFINING') baseTime = 1.5;
            else if (type === 'CRAFTING') baseTime = 4.0;
            else if (type === 'COOKING') baseTime = 3.0;
        }

        // Calculate Stats to get Efficiency
        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const efficiencyMap = {
            'LUMBERJACK': 'WOOD',
            'ORE_MINER': 'ORE',
            'ANIMAL_SKINNER': 'HIDE',
            'FIBER_HARVESTER': 'FIBER',
            'FISHING': 'FISH',
            'HERBALISM': 'HERB',
            'PLANK_REFINER': 'PLANK',
            'METAL_BAR_REFINER': 'METAL',
            'LEATHER_REFINER': 'LEATHER',
            'CLOTH_REFINER': 'CLOTH',
            'DISTILLATION': 'EXTRACT',
            'WARRIOR_CRAFTER': 'WARRIOR',
            'HUNTER_CRAFTER': 'HUNTER',
            'MAGE_CRAFTER': 'MAGE',
            'ALCHEMY': 'POTION',
            'COOKING': 'COOKING'
        };

        const efficiencyKey = efficiencyMap[skillKey];
        const efficiencyVal = (efficiencyKey && stats.efficiency && stats.efficiency[efficiencyKey]) ? stats.efficiency[efficiencyKey] : 0;

        // Efficiency reduces time: 10% eff = time * 0.9
        const reductionFactor = Math.max(0.1, 1 - (efficiencyVal / 100));
        const timePerAction = Math.max(0.5, baseTime * reductionFactor); // Min 0.5s per action

        const totalDuration = timePerAction * quantity;
        if (totalDuration > 43200) {
            throw new Error("Maximum duration exceeded (Limit: 12 Hours)");
        }

        const { error } = await this.gameManager.supabase
            .from('characters')
            .update({
                current_activity: {
                    type: type,
                    item_id: itemId,
                    actions_remaining: quantity,
                    initial_quantity: quantity,
                    time_per_action: timePerAction,
                    next_action_at: Date.now() + (timePerAction * 1000),
                    req: item.req || null,
                    sessionItems: {},
                    sessionXp: 0
                },
                activity_started_at: new Date().toISOString(),
                last_saved: new Date().toISOString() // Prevent catchup from applying old offline item to NEW activity
            })
            .eq('id', char.id);

        if (error) throw error;
        return { success: true, actionType, itemId, quantity, timePerAction };
    }

    async stopActivity(userId, characterId) {
        console.log(`[DEBUG] stopActivity called. User: ${userId}, Char: ${characterId}`);
        const char = await this.gameManager.getCharacter(userId, characterId);
        console.log(`[DEBUG] Character found: ${char?.name}. Activity: ${char?.current_activity?.type || 'none'}`);

        if (char.current_activity) {
            const activity = char.current_activity;
            console.log(`[ACTIVITY] Found active ${activity.type}. Session XP: ${activity.sessionXp}`);
            if (!activity.sessionItems) activity.sessionItems = {};
            if (typeof activity.sessionXp === 'undefined') activity.sessionXp = 0;

            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
            this.gameManager.addActionSummaryNotification(char, activity.type, {
                itemsGained: activity.sessionItems,
                xpGained: { [activity.type]: activity.sessionXp },
                totalTime: elapsedSeconds
            });
        }

        const { error } = await this.gameManager.supabase
            .from('characters')
            .update({
                current_activity: null,
                activity_started_at: null,
                state: char.state
            })
            .eq('id', char.id);

        if (error) throw error;
        return { success: true, message: "Activity stopped" };
    }

    async processGathering(char, item) {
        const added = this.gameManager.inventoryManager.addItemToInventory(char, item.id, 1);
        if (!added) return { error: "Inventory Full" };

        const skillKey = this.getSkillKeyForResource(item.id);
        const xpAmount = item.xp || 5;
        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: `Gathered ${item.name}`,
            leveledUp,
            itemGained: item.id,
            amountGained: 1,
            skillKey,
            xpGained: xpAmount
        };
    }

    async processRefining(char, item) {
        if (!this.gameManager.inventoryManager.hasItems(char, item.req)) return { error: "Insufficient ingredients" };

        const added = this.gameManager.inventoryManager.addItemToInventory(char, item.id, 1);
        if (!added) return { error: "Inventory Full" };

        this.gameManager.inventoryManager.consumeItems(char, item.req);

        const skillKey = this.getSkillKeyForRefining(item.id);
        const xpAmount = item.xp || 10;
        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: `Refined ${item.name}`,
            leveledUp,
            itemGained: item.id,
            amountGained: 1,
            skillKey,
            xpGained: xpAmount
        };
    }

    async processCrafting(char, item) {
        if (!this.gameManager.inventoryManager.hasItems(char, item.req)) return { error: "Insufficient materials" };

        let finalItemId = item.id;
        let qualityName = '';
        const equippableTypes = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_PICKAXE', 'TOOL_AXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD'];

        if (equippableTypes.includes(item.type)) {
            const stats = this.gameManager.inventoryManager.calculateStats(char);
            const qualityBonus = stats.globals?.qualityChance || 0;

            const rand = Math.random() * 100; // 0 to 100
            // Base Chances: Q4 (0.1%), Q3 (1%), Q2 (10%), Q1 (20%)
            // With bonus: Increase the thresholds?
            // Simplest approach: Add bonus to the ROLL? Or reduce threshold?
            // Let's reduce thresholds.
            // Default Thresholds (descending check):
            // > 99.9 -> Q4
            // > 99.0 -> Q3
            // > 90.0 -> Q2
            // > 70.0 -> Q1

            // Bonus is percentage increase to the CHANCE.
            // e.g. +10% quality chance means 0.1% becomes 0.11%. Hard to model linearly.

            // Alternative: Add flat value to the roll?
            // If I have +50 Quality, I add 0.5 to the roll?

            // Let's stick to the Potion Plan: "Increases Quality Chance".
            // Let's map it as a multiplier to the base probabilities.
            // Q4 Chance = 0.1 * (1 + bonus/100)
            // Q3 Chance = 1.0 * (1 + bonus/100)
            // etc.

            const mult = 1 + (qualityBonus / 100);
            const q4Chance = 0.1 * mult;
            const q3Chance = 0.9 * mult; // 1.0 - 0.1
            const q2Chance = 9.0 * mult; // 10.0 - 1.0
            const q1Chance = 20.0 * mult; // 30.0 - 10.0

            // Normalized Thresholds from Top (100)
            const t4 = 100 - q4Chance;
            const t3 = t4 - q3Chance;
            const t2 = t3 - q2Chance;
            const t1 = t2 - q1Chance;

            let quality = 0;
            if (rand > t4) quality = 4;
            else if (rand > t3) quality = 3;
            else if (rand > t2) quality = 2;
            else if (rand > t1) quality = 1;

            if (quality > 0) {
                const { QUALITIES } = await import('../../shared/items.js');
                finalItemId += QUALITIES[quality].suffix;
                qualityName = `[${QUALITIES[quality].name}] `;
            }
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, finalItemId, 1);
        if (!added) return { error: "Inventory Full" };

        this.gameManager.inventoryManager.consumeItems(char, item.req);

        const skillKey = this.getSkillKeyForCrafting(item.id);
        const xpAmount = item.xp || 50;
        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: `Crafted ${qualityName}${item.name}`,
            leveledUp,
            itemGained: finalItemId,
            amountGained: 1,
            skillKey,
            xpGained: xpAmount
        };
    }

    getSkillKeyForActivity(type, itemId) {
        switch (type) {
            case 'GATHERING': return this.getSkillKeyForResource(itemId);
            case 'REFINING': return this.getSkillKeyForRefining(itemId);
            case 'CRAFTING': return this.getSkillKeyForCrafting(itemId);
            default: return null;
        }
    }

    getSkillKeyForResource(itemId) {
        if (itemId.includes('WOOD')) return 'LUMBERJACK';
        if (itemId.includes('ORE')) return 'ORE_MINER';
        if (itemId.includes('HIDE')) return 'ANIMAL_SKINNER';
        if (itemId.includes('FIBER')) return 'FIBER_HARVESTER';
        if (itemId.includes('FISH')) return 'FISHING';
        if (itemId.includes('HERB')) {
            console.log(`[ACTIVITY] Mapping ${itemId} to HERBALISM`);
            return 'HERBALISM';
        }
        return null;
    }

    getSkillKeyForRefining(itemId) {
        if (itemId.includes('PLANK')) return 'PLANK_REFINER';
        if (itemId.includes('BAR')) return 'METAL_BAR_REFINER';
        if (itemId.includes('LEATHER')) return 'LEATHER_REFINER';
        if (itemId.includes('CLOTH')) return 'CLOTH_REFINER';
        if (itemId.includes('EXTRACT')) return 'DISTILLATION';
        return null;
    }

    getSkillKeyForCrafting(itemId) {
        if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('PICKAXE') || itemId.includes('SHIELD')) return 'WARRIOR_CRAFTER';
        if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('AXE') || itemId.includes('TORCH') || itemId.includes('KNIFE')) return 'HUNTER_CRAFTER';
        if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('SICKLE') || itemId.includes('TOME') || itemId.includes('ROD') || itemId.includes('MAGE_CAPE')) return 'MAGE_CRAFTER';
        if (itemId.includes('FOOD')) return 'COOKING';
        if (itemId.includes('POTION')) return 'ALCHEMY';
        if (itemId.includes('CAPE')) return 'WARRIOR_CRAFTER'; // Fallback for Plate Cape or generic
        return null;
    }
}
