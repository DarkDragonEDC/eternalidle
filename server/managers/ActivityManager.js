import { ITEMS, getSkillForItem, getLevelRequirement, ITEM_LOOKUP, QUALITIES, resolveItem, BASE_QUALITY_CHANCES } from '../../shared/items.js';

// === STARTUP DIAGNOSTIC ===
const potionKeys = Object.keys(ITEM_LOOKUP).filter(k => k.includes('POTION'));
console.log(`[ACTIVITY-INIT] ITEM_LOOKUP size: ${Object.keys(ITEM_LOOKUP).length}, POTION keys: ${potionKeys.length}`);
console.log(`[ACTIVITY-INIT] T1_POTION_DAMAGE: ${ITEM_LOOKUP['T1_POTION_DAMAGE'] ? 'PRESENT' : 'MISSING'}`);
console.log(`[ACTIVITY-INIT] T1_POTION_GATHER: ${ITEM_LOOKUP['T1_POTION_GATHER'] ? 'PRESENT' : 'MISSING'}`);
if (potionKeys.length === 0) {
    console.error('[ACTIVITY-INIT] WARNING: No POTION items in ITEM_LOOKUP! Indexing may have failed.');
    console.log('[ACTIVITY-INIT] ITEMS.GEAR.ALCHEMY_LAB keys:', Object.keys(ITEMS.GEAR.ALCHEMY_LAB || {}));
    console.log('[ACTIVITY-INIT] ITEMS.GEAR.ALCHEMY_LAB.DAMAGE:', ITEMS.GEAR.ALCHEMY_LAB?.DAMAGE ? Object.keys(ITEMS.GEAR.ALCHEMY_LAB.DAMAGE) : 'MISSING');
}
// === END DIAGNOSTIC ===

const MAX_ACTIVITY_XP = 1_000_000; // 1M per action

export class ActivityManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startActivity(userId, characterId, actionType, itemId, quantity = 1) {
        console.log(`[ACTIVITY] Start Request: User=${userId}, Type=${actionType}, Item=${itemId}`);
        const type = actionType.toUpperCase();
        const char = await this.gameManager.getCharacter(userId, characterId);
        console.log(`[ACTIVITY] Char loaded: ${char?.name}. Skills keys: ${char?.state?.skills ? Object.keys(char.state.skills).length : 0}`);
        const item = resolveItem(itemId);
        if (!item) {
            const diagMsg = `[${new Date().toISOString()}] ACTIVITY-ERROR: itemId='${itemId}', ITEM_LOOKUP size=${Object.keys(ITEM_LOOKUP).length}, T1_POTION_DAMAGE=${ITEM_LOOKUP['T1_POTION_DAMAGE'] ? 'YES' : 'NO'}, T1_POTION_GATHER=${ITEM_LOOKUP['T1_POTION_GATHER'] ? 'YES' : 'NO'}, charCodes=[${[...String(itemId)].map(c => c.charCodeAt(0)).join(',')}]\n`;
            console.error(diagMsg);
            try {
                const fs = await import('fs');
                fs.appendFileSync('activity_debug.log', diagMsg);
            } catch (e) {
                console.error("FAILED TO WRITE DEBUG LOG", e);
            }
            throw new Error(`Item not found: ${itemId}`);
        }

        const skillKey = getSkillForItem(itemId, type);
        const userLevel = char.state.skills[skillKey]?.level || 1;
        const tier = Number(item.tier) || 1;
        const requiredLevel = getLevelRequirement(tier);

        console.log(`[DEBUG-SERVER-LOCK] ${char.name} -> ${itemId}: Type=${type}, Tier=${tier}, Skill=${skillKey}, UserLv=${userLevel}, ReqLv=${requiredLevel}, LOCKED=${userLevel < requiredLevel}`);

        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires ${skillKey ? skillKey.replace('_', ' ') : 'Skill'} Lv ${requiredLevel} (Your Lv: ${userLevel})`);
        }

        // Pre-emptive Inventory Check
        if (!this.gameManager.inventoryManager.canAddItem(char, itemId)) {
            throw new Error("Inventory Full! Please free up space before starting.");
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
            'ALCHEMY': 'ALCHEMY',
            'COOKING': 'COOKING',
            'TOOL_CRAFTER': 'TOOLS'
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

        // Update Character Object (Cache)
        char.current_activity = {
            type: type,
            item_id: itemId,
            actions_remaining: quantity,
            initial_quantity: quantity,
            time_per_action: timePerAction,
            next_action_at: Date.now() + (timePerAction * 1000),
            req: item.req || null,
            sessionItems: {},
            sessionXp: 0,
            duplicationCount: 0,
            autoRefineCount: 0
        };
        char.activity_started_at = new Date().toISOString();
        char.last_saved = new Date().toISOString();

        // Mark for persistence
        await this.gameManager.saveState(char.id, char.state);

        return { success: true, actionType, itemId, quantity, timePerAction };
    }

    async stopActivity(userId, characterId) {
        console.log(`[DEBUG] stopActivity called. User: ${userId}, Char: ${characterId}`);
        const char = await this.gameManager.getCharacter(userId, characterId);
        console.log(`[DEBUG] Character found: ${char?.name}. Activity: ${char?.current_activity?.type || 'none'}`);

        if (char.current_activity && typeof char.current_activity === 'object') {
            const activity = char.current_activity;
            console.log(`[ACTIVITY] Found active ${activity.type}. Session XP: ${activity.sessionXp}`);
            if (!activity.sessionItems) activity.sessionItems = {};
            if (typeof activity.sessionXp === 'undefined') activity.sessionXp = 0;

            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
            this.gameManager.addActionSummaryNotification(char, activity.type, {
                itemsGained: activity.sessionItems,
                xpGained: { [activity.type]: activity.sessionXp },
                totalTime: elapsedSeconds,
                duplicationCount: activity.duplicationCount,
                autoRefineCount: activity.autoRefineCount
            }, 'Stopped');
        }

        // Update Character Object (Cache)
        char.current_activity = null;
        char.activity_started_at = null;

        // Mark for persistence
        await this.gameManager.saveState(char.id, char.state);

        return { success: true, message: "Activity stopped" };
    }

    async processGathering(char, item) {
        const skillKey = this.getSkillKeyForResource(item.id);
        const stats = this.gameManager.inventoryManager.calculateStats(char);

        const efficiencyMap = {
            'LUMBERJACK': 'WOOD',
            'ORE_MINER': 'ORE',
            'ANIMAL_SKINNER': 'HIDE',
            'FIBER_HARVESTER': 'FIBER',
            'FISHING': 'FISH',
            'HERBALISM': 'HERB'
        };
        const actKey = efficiencyMap[skillKey];

        // 1. Auto-Refine / Auto-Cook Logic (PRIORITY 1)
        let isAutoRefine = false;
        let refinedItemGained = null;
        let isAutoCook = false;

        if (actKey && stats.autoRefine && stats.autoRefine[actKey]) {
            const refineChance = stats.autoRefine[actKey];
            if (Math.random() * 100 < refineChance) {
                const refinedId = this.findRefinedItem(item.id);
                if (refinedId) {
                    const refinedItem = ITEM_LOOKUP[refinedId];
                    const reqAmount = (refinedItem && refinedItem.req && refinedItem.req[item.id]) ? refinedItem.req[item.id] : 2;

                    if (this.gameManager.inventoryManager.hasItems(char, { [item.id]: reqAmount })) {
                        this.gameManager.inventoryManager.consumeItems(char, { [item.id]: reqAmount });
                        this.gameManager.inventoryManager.addItemToInventory(char, refinedId, 1);
                        isAutoRefine = true;
                        refinedItemGained = refinedId;
                        if (refinedItem?.type === 'FOOD') isAutoCook = true;
                    }
                }
            }
        }

        // 2. Duplication Logic (PRIORITY 2 - Only if Auto-Refine didn't trigger)
        let amountGained = 1;
        let isDuplication = false;

        if (!isAutoRefine && actKey && stats.duplication && stats.duplication[actKey]) {
            const chance = stats.duplication[actKey];
            if (Math.random() * 100 < chance) {
                amountGained = 2;
                isDuplication = true;
            }
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, item.id, amountGained);
        if (!added) return { error: "Inventory Full", success: false, message: "Inventory Full" };

        const baseXp = item.xp || 5;

        // Multipliers (Now Additive)
        const yieldBonus = (stats.globals?.xpYield || 0); // e.g. 15 for 15%
        const specificBonus = (stats.xpBonus?.GATHERING || 0);
        const runeSkillBonus = (actKey ? (stats.xpBonus?.[actKey] || 0) : 0);

        // FORMULA: Base * (1 + (Global + Specific + Rune)/100)
        let totalBonusPc = yieldBonus + specificBonus + runeSkillBonus;
        let xpAmount = baseXp * (1 + totalBonusPc / 100);

        if (xpAmount > MAX_ACTIVITY_XP) xpAmount = MAX_ACTIVITY_XP;

        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        let message = null;
        if (isAutoCook) {
            const refinedItem = ITEM_LOOKUP[refinedItemGained];
            message = `- Auto-Cooked into ${refinedItem?.name || 'Food'}!`;
        } else if (isAutoRefine) {
            const refinedItem = ITEM_LOOKUP[refinedItemGained];
            message = `- Auto-Refined into ${refinedItem?.name || 'Refined Item'}!`;
        } else if (isDuplication) {
            message = `Gathered ${item.name} (x2!)`;
        }

        return {
            success: true,
            message,
            leveledUp,
            itemGained: item.id,
            amountGained,
            isDuplication,
            isAutoRefine,
            refinedItemGained,
            skillKey,
            xpGained: xpAmount
        };
    }

    findRefinedItem(rawId) {
        // 1. Search in Refined Materials
        for (const cat of Object.values(ITEMS.REFINED || {})) {
            for (const res of Object.values(cat)) {
                if (res.req && res.req[rawId]) {
                    return res.id;
                }
            }
        }
        // 2. Search in Food (for Fishing/Auto-Cook)
        if (rawId.includes('FISH')) {
            for (const food of Object.values(ITEMS.CONSUMABLE.FOOD || {})) {
                if (food.req && food.req[rawId]) {
                    return food.id;
                }
            }
        }
        return null;
    }

    async processRefining(char, item) {
        if (!this.gameManager.inventoryManager.hasItems(char, item.req)) return { error: "Insufficient ingredients", success: false, message: "Insufficient ingredients" };

        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const skillKey = this.getSkillKeyForRefining(item.id);

        const refiningMap = {
            'PLANK_REFINER': 'PLANK',
            'METAL_BAR_REFINER': 'METAL',
            'LEATHER_REFINER': 'LEATHER',
            'CLOTH_REFINER': 'CLOTH',
            'DISTILLATION': 'EXTRACT'
        };
        const actKey = refiningMap[skillKey];

        // 1. Duplication Logic
        let amountGained = 1;
        let isDuplication = false;
        if (actKey && stats.duplication && stats.duplication[actKey]) {
            const chance = stats.duplication[actKey];
            if (Math.random() * 100 < chance) {
                amountGained = 2;
                isDuplication = true;
            }
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, item.id, amountGained);
        if (!added) return { error: "Inventory Full", success: false, message: "Inventory Full" };

        this.gameManager.inventoryManager.consumeItems(char, item.req);

        const baseXp = item.xp || 10;

        // Multipliers (Now Additive)
        const yieldBonus = (stats.globals?.xpYield || 0);
        const specificBonus = (stats.xpBonus?.REFINING || 0);
        const runeSkillBonus = (actKey ? (stats.xpBonus?.[actKey] || 0) : 0);

        // FORMULA: Base * (1 + (Global + Specific + Rune)/100)
        let totalBonusPc = yieldBonus + specificBonus + runeSkillBonus;
        let xpAmount = baseXp * (1 + totalBonusPc / 100);


        if (xpAmount > MAX_ACTIVITY_XP) xpAmount = MAX_ACTIVITY_XP;

        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        let message = null;
        if (isDuplication) {
            message = `Refined ${item.name} (x2!)`;
        }

        return {
            success: true,
            message,
            leveledUp,
            itemGained: item.id,
            amountGained,
            isDuplication,
            skillKey,
            xpGained: xpAmount
        };
    }

    async processCrafting(char, item) {
        if (!this.gameManager.inventoryManager.hasItems(char, item.req)) return { error: "Insufficient materials", success: false, message: "Insufficient materials" };

        let finalItemId = item.id;
        let qualityName = '';
        const equippableTypes = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_PICKAXE', 'TOOL_AXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'];

        if (equippableTypes.includes(item.type)) {
            const stats = this.gameManager.inventoryManager.calculateStats(char);
            const qualityBonus = stats.globals?.qualityChance || 0;

            const rand = Math.random() * 100; // 0 to 100


            const tierStats = BASE_QUALITY_CHANCES[item.tier] || BASE_QUALITY_CHANCES[1];
            const mult = 1 + (qualityBonus / 100);

            // Calculate thresholds based on chances.
            // Chances are distinct percentages. Q4 is top, then Q3, etc.
            // Thresholds are cumulative from 100 downwards.
            // T4_Cutoff = 100 - (Q4_Chance * mult)
            // T3_Cutoff = T4_Cutoff - (Q3_Chance * mult)
            // ...

            const q4C = tierStats.q4 * mult;
            const q3C = tierStats.q3 * mult;
            const q2C = tierStats.q2 * mult;
            const q1C = tierStats.q1 * mult;

            const t4 = 100 - q4C;
            const t3 = t4 - q3C;
            const t2 = t3 - q2C;
            const t1 = t2 - q1C;

            let quality = 0;
            if (rand > t4) quality = 4;
            else if (rand > t3) quality = 3;
            else if (rand > t2) quality = 2;
            else if (rand > t1) quality = 1;

            if (quality > 0) {
                finalItemId += QUALITIES[quality].suffix;
                qualityName = `[${QUALITIES[quality].name}] `;
            }
        }

        const skillKey = this.getSkillKeyForCrafting(item.id);
        const stats = this.gameManager.inventoryManager.calculateStats(char);

        const craftingMap = {
            'WARRIOR_CRAFTER': 'WARRIOR',
            'MAGE_CRAFTER': 'MAGE',
            'ALCHEMY': 'ALCHEMY',
            'TOOL_CRAFTER': 'TOOLS',
            'COOKING': 'COOKING'
        };
        const actKey = craftingMap[skillKey];

        // 1. Duplication Logic
        let amountGained = 1;
        let isDuplication = false;
        if (actKey && stats.duplication && stats.duplication[actKey]) {
            const chance = stats.duplication[actKey];
            if (Math.random() * 100 < chance) {
                amountGained = 2;
                isDuplication = true;
            }
        }

        const metadata = {};
        // Only assign signature for Equippable Items (Weapons, Armor, Tools, etc.)
        // This excludes Food, Potions, Runes, Resources, etc.
        if (equippableTypes.includes(item.type)) {
            metadata.craftedBy = char.name;
            metadata.craftedAt = Date.now();
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, finalItemId, amountGained, metadata);
        if (!added) return { error: "Inventory Full" };

        this.gameManager.inventoryManager.consumeItems(char, item.req);

        const baseXp = item.xp || 50;

        // Multipliers (Now Additive)
        const yieldBonus = (stats.globals?.xpYield || 0);
        const specificBonus = (stats.xpBonus?.CRAFTING || 0);
        const runeSkillBonus = (actKey ? (stats.xpBonus?.[actKey] || 0) : 0);

        // FORMULA: Base * (1 + (Global + Specific + Rune)/100)
        let totalBonusPc = yieldBonus + specificBonus + runeSkillBonus;
        let xpAmount = baseXp * (1 + totalBonusPc / 100);

        if (xpAmount > MAX_ACTIVITY_XP) xpAmount = MAX_ACTIVITY_XP;

        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: isDuplication ? `Crafted ${item.name} (x2!)` : null,
            leveledUp,
            itemGained: finalItemId,
            amountGained,
            isDuplication,
            skillKey,
            xpGained: xpAmount
        };
    }

    // Simplified delegation to shared logic
    getSkillKeyForActivity(type, itemId) {
        return getSkillForItem(itemId, type);
    }

    getSkillKeyForResource(itemId) {
        return getSkillForItem(itemId, 'GATHERING');
    }

    getSkillKeyForRefining(itemId) {
        return getSkillForItem(itemId, 'REFINING');
    }

    getSkillKeyForCrafting(itemId) {
        return getSkillForItem(itemId, 'CRAFTING');
    }
}
