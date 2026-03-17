import fs from 'fs';
import { ITEMS, getSkillForItem, getLevelRequirement, ITEM_LOOKUP, QUALITIES, resolveItem, BASE_QUALITY_CHANCES } from '../../shared/items.js';

// === STARTUP DIAGNOSTIC ===
const potionKeys = Object.keys(ITEM_LOOKUP).filter(k => k.includes('POTION'));
console.log(`[ACTIVITY-INIT] ITEM_LOOKUP size: ${Object.keys(ITEM_LOOKUP).length}, POTION keys: ${potionKeys.length}`);
if (potionKeys.length === 0) {
    console.error('[ACTIVITY-INIT] WARNING: No POTION items in ITEM_LOOKUP! Indexing may have failed.');
}
// === END DIAGNOSTIC ===

const MAX_ACTIVITY_XP = 1_000_000; // 1M per action

export class ActivityManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startActivity(userId, characterId, actionType, itemId, quantity = 1, startTime = null) {
        console.log(`[ACTIVITY] Start Request: User=${userId}, Type=${actionType}, Item=${itemId}`);
        const type = actionType.toUpperCase();
        const char = await this.gameManager.getCharacter(userId, characterId);
        const item = resolveItem(itemId);
        if (!item) {
            throw new Error(`Item not found: ${itemId}`);
        }

        const skillKey = getSkillForItem(itemId, type);
        const userLevel = char.state.skills[skillKey]?.level || 1;
        const tier = Number(item.tier) || 1;
        const requiredLevel = getLevelRequirement(tier);

        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires ${skillKey ? skillKey.replace('_', ' ') : 'Skill'} Lv ${requiredLevel} (Your Lv: ${userLevel})`);
        }

        // Pre-emptive Inventory Check
        if (!this.gameManager.inventoryManager.canAddItem(char, itemId)) {
            throw new Error("Inventory Full! Please free up space before starting.");
        }

        let baseTime = item.time || 3.0;
        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const efficiencyMap = {
            'LUMBERJACK': 'WOOD', 'ORE_MINER': 'ORE', 'ANIMAL_SKINNER': 'HIDE',
            'FIBER_HARVESTER': 'FIBER', 'FISHING': 'FISH', 'HERBALISM': 'HERB',
            'PLANK_REFINER': 'PLANK', 'METAL_BAR_REFINER': 'METAL', 'LEATHER_REFINER': 'LEATHER',
            'CLOTH_REFINER': 'CLOTH', 'DISTILLATION': 'EXTRACT', 'WARRIOR_CRAFTER': 'WARRIOR',
            'HUNTER_CRAFTER': 'HUNTER', 'MAGE_CRAFTER': 'MAGE', 'ALCHEMY': 'ALCHEMY',
            'COOKING': 'COOKING', 'TOOL_CRAFTER': 'TOOLS'
        };

        const efficiencyKey = efficiencyMap[skillKey];
        const efficiencyVal = (efficiencyKey && stats.efficiency && stats.efficiency[efficiencyKey]) ? stats.efficiency[efficiencyKey] : 0;
        const reductionFactor = Math.max(0.1, 1 - (efficiencyVal / 100));
        const timePerAction = Math.max(0.5, baseTime * reductionFactor); 

        const totalDuration = timePerAction * quantity;
        const maxIdleSeconds = this.gameManager.getMaxIdleTime(char) / 1000;
        if (totalDuration > maxIdleSeconds) {
            throw new Error(`Maximum duration exceeded (Limit: ${maxIdleSeconds / 3600} Hours)`);
        }

        char.current_activity = {
            type: type,
            item_id: itemId,
            skillKey: skillKey,
            actions_remaining: quantity,
            initial_quantity: quantity,
            time_per_action: timePerAction,
            next_action_at: (startTime ? new Date(startTime).getTime() : Date.now()) + (timePerAction * 1000),
            req: item.req || null,
            sessionItems: {},
            sessionXp: 0,
            duplicationCount: 0,
            autoRefineCount: 0
        };
        char.activity_started_at = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
        char.last_saved = new Date().toISOString();

        if (this.gameManager.pushManager) {
            this.gameManager.pushManager.scheduleActivityNotification(char, totalDuration * 1000);
        }

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, actionType, itemId, quantity, timePerAction };
    }

    async enqueueActivity(userId, characterId, actionType, itemId, quantity = 1) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        const isPremium = char.state?.membership?.active || char.state?.isPremium;

        if (!isPremium) {
            throw new Error("Action Queue is a Member-only feature!");
        }

        const type = actionType.toUpperCase();
        const item = resolveItem(itemId);
        if (!item) throw new Error(`Item not found: ${itemId}`);

        const skillKey = getSkillForItem(itemId, type);
        const userLevel = char.state.skills[skillKey]?.level || 1;
        const requiredLevel = getLevelRequirement(Number(item.tier) || 1);
        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires ${skillKey.replace('_', ' ')} Lv ${requiredLevel}`);
        }

        if (!char.state.actionQueue) char.state.actionQueue = [];

        // Validate Materials for Refining/Crafting
        if (item.req) {
            const totalReq = {};
            Object.entries(item.req).forEach(([ingId, amt]) => {
                totalReq[ingId] = amt * quantity;
            });
            if (!this.gameManager.inventoryManager.hasItems(char, totalReq)) {
                throw new Error(`Insufficient materials to queue ${quantity}x ${item.name || itemId}`);
            }
        }

        // If nothing is running, start immediately
        const isFarming = char.current_activity && Object.keys(char.current_activity).length > 0;
        if (!isFarming) {
            return this.startActivity(userId, characterId, actionType, itemId, quantity);
        }

        // Limit check
        const baseSlots = 2;
        const upgrades = char.state.upgrades?.extraQueueSlots || 0;
        const maxSlots = baseSlots + upgrades;

        if (char.state.actionQueue.length >= maxSlots) {
            throw new Error(`Queue full! Maximum ${maxSlots} actions can be queued.`);
        }

        // Duration check
        let baseTime = item.time || 3.0;
        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const efficiencyMap = {
            'LUMBERJACK': 'WOOD', 'ORE_MINER': 'ORE', 'ANIMAL_SKINNER': 'HIDE', 'FIBER_HARVESTER': 'FIBER', 'FISHING': 'FISH', 'HERBALISM': 'HERB',
            'PLANK_REFINER': 'PLANK', 'METAL_BAR_REFINER': 'METAL', 'LEATHER_REFINER': 'LEATHER', 'CLOTH_REFINER': 'CLOTH', 'DISTILLATION': 'EXTRACT',
            'WARRIOR_CRAFTER': 'WARRIOR', 'HUNTER_CRAFTER': 'HUNTER', 'MAGE_CRAFTER': 'MAGE', 'ALCHEMY': 'ALCHEMY', 'COOKING': 'COOKING', 'TOOL_CRAFTER': 'TOOLS'
        };
        const efficiencyKey = efficiencyMap[skillKey];
        const efficiencyVal = (efficiencyKey && stats.efficiency && stats.efficiency[efficiencyKey]) ? stats.efficiency[efficiencyKey] : 0;
        const reductionFactor = Math.max(0.1, 1 - (efficiencyVal / 100));
        const timePerAction = Math.max(0.5, baseTime * reductionFactor);

        const currentQueueTime = char.state.actionQueue.reduce((acc, a) => acc + (a.time_per_action * a.quantity), 0);
        const runningTime = char.current_activity ? (char.current_activity.actions_remaining * char.current_activity.time_per_action) : 0;
        const totalProjected = currentQueueTime + runningTime + (timePerAction * quantity);
        const maxIdle = this.gameManager.getMaxIdleTime(char) / 1000;

        if (totalProjected > maxIdle) {
            throw new Error(`Queue duration would exceed idle limit! (Remaining: ${Math.floor((maxIdle - runningTime - currentQueueTime) / 60)} min)`);
        }

        char.state.actionQueue.push({
            type,
            item_id: itemId,
            skillKey,
            quantity,
            time_per_action: timePerAction
        });

        if (this.gameManager.notifications) {
            this.gameManager.notifications.addNotification(char, 'SYSTEM', `Queued: ${quantity}x ${item.name || itemId}`);
        }

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, queued: true, queueLength: char.state.actionQueue.length };
    }

    async stopActivity(userId, characterId, isQueueTransition = false, startTime = null) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) return { success: false };

        if (char.current_activity) {
            const activity = char.current_activity;
            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
            
            // Accumulate results into queueSummary instead of immediate notification
            if (!char.state.queueSummary) {
                char.state.queueSummary = { 
                    itemsGained: {}, 
                    xpGained: {}, 
                    totalTime: 0, 
                    duplicationCount: 0, 
                    autoRefineCount: 0,
                    activities: []
                };
            }

            const summary = char.state.queueSummary;
            summary.totalTime += elapsedSeconds;
            summary.duplicationCount += (activity.duplicationCount || 0);
            summary.autoRefineCount += (activity.autoRefineCount || 0);
            
            // Merge items
            for (const [id, qty] of Object.entries(activity.sessionItems || {})) {
                summary.itemsGained[id] = (summary.itemsGained[id] || 0) + qty;
            }

            // Merge XP
            summary.xpGained[activity.type] = (summary.xpGained[activity.type] || 0) + (activity.sessionXp || 0);
            
            // Add activity name if not present
            if (!summary.activities.includes(activity.type)) summary.activities.push(activity.type);

            // If it's a manual STOP (not a queue transition), or if the queue is empty next, we'll notify soon
        }

        char.current_activity = null;
        char.activity_started_at = null;

        if (this.gameManager.pushManager) {
            this.gameManager.pushManager.cancelActivityNotification(char.id);
        }

        // If NOT a queue transition (manual stop), show what we have so far
        if (!isQueueTransition) {
            await this.finalizeQueueSummary(char);
        } else {
            // Check Queue for auto-start
            await this.checkQueueAndStartNext(char, startTime);
        }

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: "Activity stopped" };
    }

    async checkQueueAndStartNext(char, startTime = null) {
        if (char.state.actionQueue && char.state.actionQueue.length > 0) {
            const next = char.state.actionQueue.shift();
            try {
                await this.startActivity(char.user_id, char.id, next.type, next.item_id, next.quantity, startTime);
                console.log(`[QUEUE] Auto-started next action for ${char.name}: ${next.item_id}`);
                
                if (this.gameManager.notifications) {
                    const itemName = resolveItem(next.item_id)?.name || next.item_id;
                    this.gameManager.notifications.addNotification(char, 'SYSTEM', `Starting queued task: ${next.quantity}x ${itemName}`);
                }
            } catch (err) {
                console.error(`[QUEUE] Failed to auto-start next action: ${err.message}`);
                if (this.gameManager.notifications) {
                    this.gameManager.notifications.addNotification(char, 'ERROR', `Failed to start queued action: ${err.message}`);
                }
                await this.finalizeQueueSummary(char);
            }
        } else {
            // Queue truly finished
            await this.finalizeQueueSummary(char);
        }
    }

    async finalizeQueueSummary(char) {
        if (char.state.queueSummary && (char.state.queueSummary.totalTime > 0 || Object.keys(char.state.queueSummary.itemsGained).length > 0)) {
            const summary = char.state.queueSummary;
            const title = summary.activities.length > 1 ? "Queue Finished" : summary.activities[0] || "Activity";
            
            this.gameManager.notifications.addActionSummaryNotification(char, title, {
                itemsGained: summary.itemsGained,
                xpGained: summary.xpGained,
                totalTime: summary.totalTime,
                duplicationCount: summary.duplicationCount,
                autoRefineCount: summary.autoRefineCount
            }, summary.activities.length > 1 ? "" : "Summary");

            char.state.queueSummary = null; // Clear it
        }
    }

    async reorderQueue(userId, characterId, indexOrNewQueue, direction) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        
        // Handle full array (from reorder drag-and-drop)
        if (Array.isArray(indexOrNewQueue)) {
            char.state.actionQueue = indexOrNewQueue.slice(0, 10);
        } else {
            // Handle single step up/down
            const index = indexOrNewQueue;
            if (!char.state.actionQueue || !char.state.actionQueue[index]) throw new Error("Invalid index");
            
            const item = char.state.actionQueue.splice(index, 1)[0];
            const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(char.state.actionQueue.length, index + 1);
            char.state.actionQueue.splice(newIndex, 0, item);
        }

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, queue: char.state.actionQueue };
    }

    async removeFromQueue(userId, characterId, index) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char.state.actionQueue && char.state.actionQueue[index]) {
            char.state.actionQueue.splice(index, 1);
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true, queue: char.state.actionQueue };
    }

    async clearQueue(userId, characterId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        char.state.actionQueue = [];
        if (this.gameManager.notifications) {
            this.gameManager.notifications.addNotification(char, 'SYSTEM', `Action Queue cleared.`);
        }
        await this.gameManager.saveState(char.id, char.state);
        return { success: true };
    }

    async processGathering(char, item) {
        const skillKey = this.getSkillKeyForResource(item.id);
        const stats = this.gameManager.inventoryManager.calculateStats(char);

        const efficiencyMap = {
            'LUMBERJACK': 'WOOD', 'ORE_MINER': 'ORE', 'ANIMAL_SKINNER': 'HIDE',
            'FIBER_HARVESTER': 'FIBER', 'FISHING': 'FISH', 'HERBALISM': 'HERB'
        };
        const actKey = efficiencyMap[skillKey];

        let isAutoRefine = false;
        let refinedItemGained = null;
        let isAutoCook = false;

        if (actKey && stats.autoRefine && stats.autoRefine[actKey]) {
            const refineChance = stats.autoRefine[actKey];
            if (Math.random() * 100 < refineChance) {
                const refinedId = this.findRefinedItem(item.id);
                if (refinedId) {
                    const refinedItem = ITEM_LOOKUP[refinedId];
                    const reqAmount = (refinedItem?.req && refinedItem.req[item.id]) ? refinedItem.req[item.id] : 2;

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

        let amountGained = 1;
        let isDuplication = false;

        if (!isAutoRefine && actKey && stats.duplication && stats.duplication[actKey]) {
            if (Math.random() * 100 < stats.duplication[actKey]) {
                amountGained = 2;
                isDuplication = true;
            }
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, item.id, amountGained);
        if (!added) return { error: "Inventory Full", success: false };

        const yieldBonus = (stats.globals?.xpYield || 0) + (stats.xpBonus?.GATHERING || 0) + (actKey ? (stats.xpBonus?.[actKey] || 0) : 0);
        let xpAmount = (item.xp || 5) * (1 + yieldBonus / 100);
        if (xpAmount > MAX_ACTIVITY_XP) xpAmount = MAX_ACTIVITY_XP;

        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
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
        for (const cat of Object.values(ITEMS.REFINED || {})) {
            for (const res of Object.values(cat)) {
                if (res.req && res.req[rawId]) return res.id;
            }
        }
        if (rawId.includes('FISH')) {
            for (const food of Object.values(ITEMS.CONSUMABLE.FOOD || {})) {
                if (food.req && food.req[rawId]) return food.id;
            }
        }
        return null;
    }

    async processRefining(char, item) {
        if (!this.gameManager.inventoryManager.hasItems(char, item.req)) return { error: "Insufficient ingredients", success: false };

        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const skillKey = this.getSkillKeyForRefining(item.id);
        const refiningMap = {
            'PLANK_REFINER': 'PLANK', 'METAL_BAR_REFINER': 'METAL', 'LEATHER_REFINER': 'LEATHER',
            'CLOTH_REFINER': 'CLOTH', 'DISTILLATION': 'EXTRACT'
        };
        const actKey = refiningMap[skillKey];

        let amountGained = 1;
        let isDuplication = false;
        if (actKey && stats.duplication && stats.duplication[actKey]) {
            if (Math.random() * 100 < stats.duplication[actKey]) {
                amountGained = 2;
                isDuplication = true;
            }
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, item.id, amountGained);
        if (!added) return { error: "Inventory Full", success: false };

        this.gameManager.inventoryManager.consumeItems(char, item.req);

        const yieldBonus = (stats.globals?.xpYield || 0) + (stats.xpBonus?.REFINING || 0) + (actKey ? (stats.xpBonus?.[actKey] || 0) : 0);
        let xpAmount = (item.xp || 10) * (1 + yieldBonus / 100);
        if (xpAmount > MAX_ACTIVITY_XP) xpAmount = MAX_ACTIVITY_XP;

        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            leveledUp,
            itemGained: item.id,
            amountGained,
            isDuplication,
            skillKey,
            xpGained: xpAmount
        };
    }

    async processCrafting(char, item) {
        if (!this.gameManager.inventoryManager.hasItems(char, item.req)) return { error: "Insufficient materials", success: false };

        let finalItemId = item.id;
        const equippableTypes = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_PICKAXE', 'TOOL_AXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'];

        if (equippableTypes.includes(item.type)) {
            const stats = this.gameManager.inventoryManager.calculateStats(char);
            const qualityBonus = stats.globals?.qualityChance || 0;
            const rand = Math.random() * 100;
            const tierStats = BASE_QUALITY_CHANCES[item.tier] || BASE_QUALITY_CHANCES[1];
            const mult = 1 + (qualityBonus / 100);

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

            if (quality > 0) finalItemId += QUALITIES[quality].suffix;
        }

        const skillKey = this.getSkillKeyForCrafting(item.id);
        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const craftingMap = { 'WARRIOR_CRAFTER': 'WARRIOR', 'MAGE_CRAFTER': 'MAGE', 'ALCHEMY': 'ALCHEMY', 'TOOL_CRAFTER': 'TOOLS', 'COOKING': 'COOKING' };
        const actKey = craftingMap[skillKey];

        let amountGained = 1;
        let isDuplication = false;
        if (actKey && stats.duplication && stats.duplication[actKey]) {
            if (Math.random() * 100 < stats.duplication[actKey]) {
                amountGained = 2;
                isDuplication = true;
            }
        }

        const metadata = {};
        if (equippableTypes.includes(item.type)) {
            metadata.craftedBy = char.name;
            metadata.craftedAt = Date.now();
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, finalItemId, amountGained, metadata);
        if (!added) return { error: "Inventory Full" };

        this.gameManager.inventoryManager.consumeItems(char, item.req);

        const yieldBonus = (stats.globals?.xpYield || 0) + (stats.xpBonus?.CRAFTING || 0) + (actKey ? (stats.xpBonus?.[actKey] || 0) : 0);
        let xpAmount = (item.xp || 50) * (1 + yieldBonus / 100);
        if (xpAmount > MAX_ACTIVITY_XP) xpAmount = MAX_ACTIVITY_XP;

        const leveledUp = this.gameManager.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            leveledUp,
            itemGained: finalItemId,
            amountGained,
            isDuplication,
            skillKey,
            xpGained: xpAmount
        };
    }

    getSkillKeyForResource(itemId) { return getSkillForItem(itemId, 'GATHERING'); }
    getSkillKeyForRefining(itemId) { return getSkillForItem(itemId, 'REFINING'); }
    getSkillKeyForCrafting(itemId) { return getSkillForItem(itemId, 'CRAFTING'); }
}
