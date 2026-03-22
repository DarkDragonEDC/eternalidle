import { ITEMS, QUALITIES, resolveItem, ITEM_LOOKUP, calculateRuneBonus, getSkillForItem, getLevelRequirement, getRequiredProficiencyGroup } from '../../shared/items.js';
import { QUEST_TYPES } from '../../shared/quests.js';
import { getProficiencyStats } from '../../shared/proficiency_stats.js';

// Removed local ITEM_LOOKUP generation in favor of shared source of truth


export class InventoryManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    resolveItem(itemOrId) {
        return resolveItem(itemOrId);
    }

    getMaxSlots(char, nowOverride = null) {
        const now = nowOverride || Date.now();
        const isPremium = char.state?.membership?.active && char.state?.membership?.expiresAt > now;
        const baseSlots = isPremium ? 50 : 30;
        const extraSlots = parseInt(char.state?.extraInventorySlots) || 0;
        return baseSlots + extraSlots;
    }

    getUsedSlots(char) {
        if (!char.state.inventory) return 0;
        return Object.keys(char.state.inventory).filter(itemId => {
            const item = this.resolveItem(itemId);
            return !item?.noInventorySpace;
        }).length;
    }

    addItemToInventory(char, itemId, amount, metadata = null) {
        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;

        // Determine storage key: BaseID::CreatorName if signature exists
        let storageKey = itemId;

        // RULE: Runes should NOT have signatures (user request)
        const isRune = storageKey.includes('_RUNE_') && !storageKey.includes('SHARD');

        if (isRune) {
            // Strip any existing signature if present (e.g. from market listings)
            if (storageKey.includes('::')) {
                storageKey = storageKey.split('::')[0];
            }
        } else if (metadata && metadata.craftedBy) {
            if (!storageKey.includes('::')) {
                storageKey += `::${metadata.craftedBy}`;
            }
        }

        if (!inv[storageKey]) {
            const item = this.resolveItem(storageKey);
            if (!item?.noInventorySpace) {
                if (this.getUsedSlots(char) >= this.getMaxSlots(char)) {
                    if (char.user_id) {
                        this.gameManager.pushManager.notifyUser(
                            char.user_id,
                            'push_inventory_full',
                            'Inventory Full! 🎒',
                            'No more space! Free some space to continue looting.',
                            '/inventory'
                        );
                    }
                    return false;
                }
            }
        }

        const safeAmount = Number(amount) || 0;

        // If we have metadata, we MUST store it as an object
        if (metadata) {
            if (typeof inv[storageKey] !== 'object' || inv[storageKey] === null) {
                const currentAmount = Number(inv[storageKey]) || 0;
                inv[storageKey] = { amount: currentAmount };
            }
            const cleanMetadata = { ...metadata };
            delete cleanMetadata.amount;
            Object.assign(inv[storageKey], cleanMetadata);
            inv[storageKey].amount = (Number(inv[storageKey].amount) || 0) + safeAmount;
        } else {
            if (typeof inv[storageKey] === 'object' && inv[storageKey] !== null) {
                inv[storageKey].amount = (Number(inv[storageKey].amount) || 0) + safeAmount;
                if (inv[storageKey].amount <= 0) delete inv[storageKey];
            } else {
                inv[storageKey] = (Number(inv[storageKey]) || 0) + safeAmount;
                if (inv[storageKey] <= 0) delete inv[storageKey];
            }
        }
        this.gameManager.markDirty(char.id);
        return true;
    }

    dismantleItem(char, storageKey, quantity = 1) {
        if (!char.state.inventory) return { success: false, error: "Inventory Empty" };
        const inv = char.state.inventory;

        const entry = inv[storageKey];
        if (!entry) return { success: false, error: "Item not found in inventory" };

        const currentQty = (entry && typeof entry === 'object') ? (Number(entry.amount) || 0) : (Number(entry) || 0);
        if (currentQty < quantity) return { success: false, error: "Not enough items" };

        const baseId = storageKey.split('::')[0];
        const item = this.resolveItem(baseId);

        if (!item) return { success: false, error: "Item definition not found" };

        // Validation: Only Weapons, Armor, and Tools (excluding food/potions)
        const allowedTypes = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND'];
        const isTool = item.type?.startsWith('TOOL_');
        if (!allowedTypes.includes(item.type) && !isTool) {
            return { success: false, error: "This item cannot be dismantled" };
        }

        const tier = item.tier || 1;
        const quality = (typeof entry === 'object' ? (entry.quality || 0) : 0);

        // Rewards Table: (tier - 1) * 5 + quality + 1
        // T1: 1/2/3/4/5, T2: 6/7/8/9/10, ... T10: 46/47/48/49/50
        const shardAmountPerUnit = (tier - 1) * 5 + quality + 1;

        const totalShards = shardAmountPerUnit * quantity;

        // Remove units from inventory
        if (typeof inv[storageKey] === 'object') {
            inv[storageKey].amount -= quantity;
            if (inv[storageKey].amount <= 0) delete inv[storageKey];
        } else {
            inv[storageKey] -= quantity;
            if (inv[storageKey] <= 0) delete inv[storageKey];
        }

        this.gameManager.markDirty(char.id);

        // Add Rune Shards T1
        this.addItemToInventory(char, 'T1_RUNE_SHARD', totalShards);

        return {
            success: true,
            message: `Dismantled ${quantity}x ${item.name} for ${totalShards} Rune Shards T1`,
            shardsGained: totalShards
        };
    }

    canAddItem(char, itemId) {
        if (!char.state.inventory) return true;
        const inv = char.state.inventory;
        if (!inv[itemId]) {
            const item = this.resolveItem(itemId);
            if (!item?.noInventorySpace) {
                if (this.getUsedSlots(char) >= this.getMaxSlots(char)) {
                    return false;
                }
            }
        }
        return true;
    }

    canAddItems(char, itemsDict) {
        if (!char.state.inventory) return true;
        const inv = char.state.inventory;
        const maxSlots = this.getMaxSlots(char);
        const usedSlots = this.getUsedSlots(char);
        
        let newSlotsNeeded = 0;
        for (const itemId of Object.keys(itemsDict)) {
            const item = this.resolveItem(itemId);
            if (item && !item.noInventorySpace) {
                // If item doesn't exist in inventory, it will need a new slot
                if (!inv[itemId] || (typeof inv[itemId] === 'object' && (inv[itemId].amount || 0) <= 0)) {
                    newSlotsNeeded++;
                }
            }
        }

        return (usedSlots + newSlotsNeeded) <= maxSlots;
    }

    hasItems(char, req) {
        if (!req) return true;
        const inv = char.state.inventory;
        if (!inv) return false;

        // Aggregate by base ID (ignoring signature suffix)
        const totals = {};
        Object.entries(inv).forEach(([key, entry]) => {
            const baseId = key.split('::')[0];
            const qty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);
            totals[baseId] = (totals[baseId] || 0) + qty;
        });

        return Object.entries(req).every(([id, amount]) => {
            return (totals[id] || 0) >= amount;
        });
    }

    getMissingItems(char, req) {
        if (!req) return [];
        const inv = char.state.inventory || {};
        
        const totals = {};
        Object.entries(inv).forEach(([key, entry]) => {
            const baseId = key.split('::')[0];
            const qty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);
            totals[baseId] = (totals[baseId] || 0) + qty;
        });

        const missing = [];
        Object.entries(req).forEach(([id, amountNeeded]) => {
            const amountOwned = totals[id] || 0;
            if (amountOwned < amountNeeded) {
                const def = this.resolveItem(id);
                missing.push({
                    id,
                    name: def?.name || id,
                    amountNeeded,
                    amountOwned
                });
            }
        });
        return missing;
    }

    consumeItems(char, req) {
        if (!req) return;
        const inv = char.state.inventory;
        Object.entries(req).forEach(([targetId, amountToConsume]) => {
            let remaining = amountToConsume;

            // Find all keys that match this targetId (base ID)
            const matchingKeys = Object.keys(inv).filter(key => key.split('::')[0] === targetId);

            for (const key of matchingKeys) {
                if (remaining <= 0) break;
                const entry = inv[key];
                const available = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);
                const toTake = Math.min(available, remaining);

                if (typeof entry === 'object' && entry !== null) {
                    entry.amount -= toTake;
                    if (entry.amount <= 0) delete inv[key];
                } else {
                    inv[key] -= toTake;
                    if (inv[key] <= 0) delete inv[key];
                }
                remaining -= toTake;
            }
        });
    }

    async equipItem(userId, characterId, itemId, quantity = null) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        const item = this.resolveItem(itemId);
        if (!item) {
            const keys = Object.keys(ITEM_LOOKUP).length;
            const hasPotion = ITEM_LOOKUP['T1_POTION_DAMAGE'] !== undefined;
            const potionKeys = Object.keys(ITEM_LOOKUP).filter(k => k.includes('POTION')).length;

            console.error(`[EQUIP-ERROR] Item not found for ID: ${itemId}`);
            throw new Error(`Item not found | keys=${keys}, hasDmg=${hasPotion}, totalPotions=${potionKeys}`);
        }

        const validSlots = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH', 'FOOD', 'RUNE'];
        if (!validSlots.includes(item.type)) {
            throw new Error("This item cannot be equipped");
        }

        const state = char.state;

        // --- WEAPON-FIRST REQUIREMENT ---
        const isWeapon = item.type === 'WEAPON';
        const isUtility = ['TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH', 'FOOD', 'RUNE'].includes(item.type);
        const hasWeapon = !!state.equipment?.mainHand;

        if (!isWeapon && !isUtility && !hasWeapon) {
            throw new Error("You must equip a weapon before other gear!");
        }
        // -------------------------------
        const inventoryEntry = state.inventory[itemId];
        const qty = typeof inventoryEntry === 'object' ? (inventoryEntry?.amount || 0) : (Number(inventoryEntry) || 0);
        if (qty < 1) {
            throw new Error("You do not have this item");
        }

        if (item.type === 'RUNE') {
            const inCombat = !!char.state?.combat || !!char.state?.dungeon;
            const isFarming = !!char.current_activity;
            const isCombatRune = item.id.includes('_ATTACK_');

            if (inCombat && isCombatRune) {
                throw new Error("Cannot change combat runes during combat/dungeon!");
            }
            if (isFarming && !isCombatRune) {
                throw new Error("Cannot change farm runes during an activity!");
            }
        }

        // --- LEVEL REQUIREMENT CHECK ---
        const requiredLevel = getLevelRequirement(item.tier);
        const profGroup = getRequiredProficiencyGroup(itemId);

        if (profGroup) {
            // Check Aggregated Proficiency (Warrior/Hunter/Mage)
            const stats = this.calculateStats(char);
            const userProfLevel = profGroup === 'warrior' ? stats.warriorProf
                : profGroup === 'hunter' ? stats.hunterProf
                    : stats.mageProf;

            if (userProfLevel < requiredLevel) {
                const groupName = profGroup.charAt(0).toUpperCase() + profGroup.slice(1);
                throw new Error(`Insufficient level! Requires ${groupName} Prof. Lv ${requiredLevel} (Your Lv: ${userProfLevel.toFixed(1)})`);
            }
        } else if (item.type !== 'FOOD' && item.type !== 'RUNE') {
            // Check Individual Skill Level (Tools, etc.)
            // Use direct type mapping for tools (more reliable than string matching on IDs)
            const TOOL_TYPE_TO_SKILL = {
                'TOOL_AXE': 'LUMBERJACK',
                'TOOL_PICKAXE': 'ORE_MINER',
                'TOOL_KNIFE': 'ANIMAL_SKINNER',
                'TOOL_SICKLE': 'FIBER_HARVESTER',
                'TOOL_ROD': 'FISHING',
                'TOOL_POUCH': 'HERBALISM'
            };
            const skillKey = TOOL_TYPE_TO_SKILL[item.type] || getSkillForItem(itemId, 'GATHERING') || getSkillForItem(itemId, 'CRAFTING');
            if (skillKey) {
                const userLevel = char.state.skills[skillKey]?.level || 1;
                if (userLevel < requiredLevel) {
                    const skillName = skillKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    throw new Error(`Insufficient level! Requires ${skillName} Lv ${requiredLevel} (Your Lv: ${userLevel})`);
                }
            }
        }
        // --- CLASS REQUIREMENT CHECK ---
        const itemClass = getRequiredProficiencyGroup(itemId);
        const currentWeaponId = state.equipment?.mainHand?.id;
        const weaponClass = currentWeaponId ? getRequiredProficiencyGroup(currentWeaponId) : null;

        if (itemClass && weaponClass && itemClass !== weaponClass && !isWeapon) {
            const itemClassName = itemClass.charAt(0).toUpperCase() + itemClass.slice(1);
            const weaponClassName = weaponClass.charAt(0).toUpperCase() + weaponClass.slice(1);
            throw new Error(`This is a ${itemClassName} item! You are using a ${weaponClassName} weapon.`);
        }
        // -------------------------------

        let slotName = '';
        if (item.type === 'RUNE') {
            // ID Format: T{tier}_RUNE_{ACT}_{EFF}_{stars}STAR
            const match = itemId.match(/^T\d+_RUNE_(.+)_(\d+)STAR$/);
            if (!match) throw new Error("Invalid Rune format");
            const runeKey = match[1];
            const runeParts = runeKey.split('_');
            let runeAct = runeParts[0];
            let runeEff = runeParts.slice(1).join('_');

            if (runeEff === 'COPY') runeEff = 'DUPLIC';
            if (runeAct === 'TOOL') runeAct = 'TOOLS';

            slotName = `rune_${runeAct}_${runeEff}`;
        } else {
            switch (item.type) {
                case 'WEAPON': slotName = 'mainHand'; break;
                case 'OFF_HAND': slotName = 'offHand'; break;
                case 'ARMOR': slotName = 'chest'; break;
                case 'HELMET': slotName = 'helmet'; break;
                case 'BOOTS': slotName = 'boots'; break;
                case 'GLOVES': slotName = 'gloves'; break;
                case 'CAPE': slotName = 'cape'; break;
                case 'TOOL': slotName = 'tool'; break;
                case 'TOOL_AXE': slotName = 'tool_axe'; break;
                case 'TOOL_PICKAXE': slotName = 'tool_pickaxe'; break;
                case 'TOOL_KNIFE': slotName = 'tool_knife'; break;
                case 'TOOL_SICKLE': slotName = 'tool_sickle'; break;
                case 'TOOL_ROD': slotName = 'tool_rod'; break;
                case 'TOOL_POUCH': slotName = 'tool_pouch'; break;
                case 'FOOD': slotName = 'food'; break;
                default: throw new Error("Unknown slot type");
            }
        }

        if (!state.equipment) state.equipment = {};

        // --- AUTO-UNEQUIP INCOMPATIBLE GEAR ---
        if (isWeapon) {
            const newWeaponClass = getRequiredProficiencyGroup(itemId);
            if (newWeaponClass) {
                const itemsToUnequip = [];
                for (const slot of Object.keys(state.equipment)) {
                    if (['mainHand', 'tool', 'tool_axe', 'tool_pickaxe', 'tool_knife', 'tool_sickle', 'tool_rod', 'tool_pouch', 'food'].includes(slot)) continue;
                    if (slot.startsWith('rune_')) continue;

                    const equippedItem = state.equipment[slot];
                    if (equippedItem && equippedItem.id) {
                        const gearClass = getRequiredProficiencyGroup(equippedItem.id);
                        if (gearClass && gearClass !== newWeaponClass) {
                            itemsToUnequip.push({ slot, ...equippedItem });
                        }
                    }
                }

                if (itemsToUnequip.length > 0) {
                    // Check if we have space. 
                    // Note: Equipping the new weapon MIGHT free a slot if it was already in inventory, 
                    // BUT we usually decrement it later. Let's be conservative.
                    const currentUsed = this.getUsedSlots(char);
                    const maxSlots = this.getMaxSlots(char);

                    // How many NEW slots will be taken?
                    let newSlotsNeeded = 0;
                    itemsToUnequip.forEach(item => {
                        if (!state.inventory[item.id]) newSlotsNeeded++;
                    });

                    if (currentUsed + newSlotsNeeded > maxSlots) {
                        throw new Error(`Not enough inventory space to unequip incompatible gear (${itemsToUnequip.length} items)!`);
                    }

                    // Perform unequip
                    for (const item of itemsToUnequip) {
                        const oldId = item.id;
                        const { slot: slotKey, id: _, stats: __, ...metadata } = item;
                        this.addItemToInventory(char, oldId, 1, Object.keys(metadata).length > 0 ? metadata : null);
                        delete state.equipment[slotKey];
                    }
                }
            }
        }
        // --------------------------------------

        // 3-Rune Combat Limit Check
        // If equipping a Combat Rune, check if we already have 3 active (excluding the target slot if occupied)
        if (slotName.startsWith('rune_ATTACK_')) {
            const activeCombatRunes = Object.keys(state.equipment).filter(k => k.startsWith('rune_ATTACK_')).length;
            const isReplacing = !!state.equipment[slotName];

            // If we are NOT replacing an existing rune (adding new to empty slot), check limit
            if (!isReplacing && activeCombatRunes >= 3) {
                throw new Error("Maximum of 3 Combat Runes active at once.");
            }
        }

        if (slotName === 'food') {
            const entry = state.inventory[itemId];
            const stackAmount = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);

            // Determine how much to equip: custom quantity or full stack
            const amountToEquip = (quantity !== null && quantity > 0) ? Math.min(quantity, stackAmount) : stackAmount;

            if (amountToEquip <= 0) throw new Error("Invalid quantity to equip");

            // Decrement/Delete from inventory
            if (typeof entry === 'object' && entry !== null) {
                entry.amount -= amountToEquip;
                if (entry.amount <= 0) delete state.inventory[itemId];
            } else {
                state.inventory[itemId] -= amountToEquip;
                if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
            }

            if (!state.equipment.food) {
                state.equipment.food = { ...item, amount: amountToEquip };
            } else {
                const currentEquip = state.equipment.food;
                if (currentEquip.id === itemId) {
                    currentEquip.amount = (Number(currentEquip.amount) || 0) + amountToEquip;
                } else {
                    // Refund current food to inventory before replacing
                    const oldId = currentEquip.id;
                    const oldAmount = Number(currentEquip.amount) || 1;
                    this.addItemToInventory(char, oldId, oldAmount);
                    state.equipment.food = { ...item, amount: amountToEquip };
                }
            }
        } else {
            // Create equipment object with metadata from inventory
            // CRITICAL: Capture metadata BEFORE we decrement/delete the entry
            const inventoryEntry = state.inventory[itemId];
            const equipmentObject = { ...item }; // item is resolved from itemId

            if (typeof inventoryEntry === 'object' && inventoryEntry !== null) {
                const { amount, ...metadata } = inventoryEntry;
                // Merge metadata but don't overwrite with falsy values for quality/stars
                Object.entries(metadata).forEach(([key, val]) => {
                    if ((key === 'quality' || key === 'stars') && !val) return;
                    equipmentObject[key] = val;
                });
            }

            // FIX: Remove new item from inventory FIRST to free a slot,
            // THEN return old item. This prevents item loss when inventory is full.
            if (typeof inventoryEntry === 'object' && inventoryEntry !== null) {
                inventoryEntry.amount--;
                if (inventoryEntry.amount <= 0) delete state.inventory[itemId];
            } else {
                state.inventory[itemId]--;
                if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
            }

            // Now return old equipped item to inventory (slot is freed above)
            const currentEquip = state.equipment[slotName];
            if (currentEquip && currentEquip.id) {
                const oldId = currentEquip.id;
                const { id: _, stats: __, ...oldMetadata } = currentEquip;
                const returned = this.addItemToInventory(char, oldId, 1, Object.keys(oldMetadata).length > 0 ? oldMetadata : null);
                if (!returned) {
                    // Safety: if inventory is STILL full, re-add the new item and abort
                    this.addItemToInventory(char, itemId, 1);
                    throw new Error("Inventory full! Cannot swap equipment.");
                }
            }

            state.equipment[slotName] = equipmentObject;

            // Sync with equipment_sets (ONLY COMBAT GEAR)
            const COMBAT_SLOTS = ['mainHand', 'offHand', 'chest', 'helmet', 'boots', 'gloves', 'cape'];
            if (COMBAT_SLOTS.includes(slotName)) {
                if (!state.equipment_sets) state.equipment_sets = [{}, {}, {}];
                const activeSet = state.active_set || 0;
                // Only store combat slots in the saved sets
                const combatGear = {};
                COMBAT_SLOTS.forEach(s => { if (state.equipment[s]) combatGear[s] = state.equipment[s]; });
                state.equipment_sets[activeSet] = combatGear;
            }

        }
        
        // Quest Progress: EQUIP
        this.gameManager.quests.handleProgress(char, QUEST_TYPES.EQUIP, { item: state.equipment[slotName], itemId: itemId });

        await this.gameManager.saveStateCritical(char.id, state);
        return { success: true };
    }

    async enhanceItem(userId, charId, itemStorageKey, stoneStorageKey) {
        const char = await this.gameManager.getCharacter(userId, charId);
        if (!char) throw new Error("Character not found");

        const inv = char.state.inventory;
        if (!inv) throw new Error("Inventory is empty");

        const itemEntry = inv[itemStorageKey];
        if (!itemEntry) throw new Error("Item not found in inventory");

        const stoneEntry = inv[stoneStorageKey];
        if (!stoneEntry) throw new Error("Stone not found in inventory");

        // Use resolveItem to get full definitions
        const item = this.resolveItem(typeof itemEntry === 'object' ? { ...itemEntry, id: itemStorageKey.split('::')[0] } : itemStorageKey.split('::')[0]);
        const stone = this.resolveItem(typeof stoneEntry === 'object' ? { ...stoneEntry, id: stoneStorageKey.split('::')[0] } : stoneStorageKey.split('::')[0]);

        if (!item) throw new Error("Invalid item");
        if (!stone || stone.type !== 'ENHANCEMENT_STONE') throw new Error("Invalid enhancement stone");

        // Validate if item is gear
        const gearTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE'];
        if (!gearTypes.includes(item.type)) throw new Error("This item cannot be enhanced");

        // Validate Class and Slot match
        // Item Class detection
        const itemClass = getRequiredProficiencyGroup(item.id)?.toUpperCase();
        // Item Slot normalized to enhancement stone format
        const slotMap = {
            'WEAPON': 'WEAPON', 'OFF_HAND': 'OFFHAND', 'ARMOR': 'ARMOR',
            'HELMET': 'HELMET', 'BOOTS': 'BOOTS', 'GLOVES': 'GLOVES', 'CAPE': 'CAPE'
        };
        const itemSlot = slotMap[item.type];

        if (stone.targetClass !== itemClass || stone.targetSlot !== itemSlot) {
            throw new Error(`Stone mismatch! Requires ${itemClass} ${itemSlot} stone.`);
        }

        // Enhancement Limits
        const tier = item.tier || 1;
        let maxEnhancement = 15;
        if (tier <= 3) maxEnhancement = 5;
        else if (tier <= 6) maxEnhancement = 10;
        else if (tier === 10) maxEnhancement = 20;

        const currentEnhancement = item.enhancement || 0;
        if (currentEnhancement >= maxEnhancement) {
            throw new Error(`Item already at maximum enhancement (+${maxEnhancement}) for Tier ${tier}`);
        }

        // Silver Cost: Tier * 3000 * (Current + 1)
        const cost = tier * 3000 * (currentEnhancement + 1);
        const currentSilver = Number(char.state.silver) || 0;
        if (currentSilver < cost) throw new Error(`Insufficient Silver! Need ${cost.toLocaleString()} (Have: ${currentSilver.toLocaleString()})`);

        // Apply Enhancement
        const newEnhancement = currentEnhancement + 1;

        // Update inventory entry
        if (typeof inv[itemStorageKey] !== 'object') {
            inv[itemStorageKey] = { amount: inv[itemStorageKey] };
        }
        inv[itemStorageKey].enhancement = newEnhancement;

        // Consume Silver and Stone
        char.state.silver -= cost;
        
        // Calculate stones required based on Tier
        let stoneCount = 1;
        if (tier >= 7 && tier <= 9) stoneCount = 2;
        else if (tier >= 10) stoneCount = 3;

        this.consumeItems(char, { [stone.id]: stoneCount });

        // Update Stats
        this.calculateStats(char);
        this.gameManager.markDirty(char.id);
        await this.gameManager.saveStateCritical(char.id, char.state);

        return {
            success: true,
            message: `Successfully enhanced ${item.name} to +${newEnhancement}!`,
            newEnhancement,
            cost
        };
    }

    async unequipItem(userId, characterId, slotName) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const state = char.state;
        if (!state.equipment || !state.equipment[slotName]) {
            throw new Error("Empty or invalid slot");
        }

        const item = state.equipment[slotName];
        if (!item) throw new Error("Item not found in slot");

        if (item.type === 'RUNE') {
            const inCombat = !!char.state?.combat || !!char.state?.dungeon;
            const isFarming = !!char.current_activity;
            const isCombatRune = item.id.includes('_ATTACK_');

            if (inCombat && isCombatRune) {
                throw new Error("Cannot change combat runes during combat/dungeon!");
            }
            if (isFarming && !isCombatRune) {
                throw new Error("Cannot change farm runes during an activity!");
            }
        }

        // --- INVENTORY SPACE CHECK ---
        const returnId = item.id;
        if (!this.canAddItem(char, returnId)) {
            throw new Error("Inventory Full! Cannot unequip item.");
        }
        // -----------------------------

        const { id: _, stats: __, amount: itemAmount, ...metadata } = item;
        const amount = Number(itemAmount) || 1;
        this.addItemToInventory(char, returnId, amount, Object.keys(metadata).length > 0 ? metadata : null);

        delete state.equipment[slotName];

        // Sync with equipment_sets (ONLY COMBAT GEAR)
        const COMBAT_SLOTS = ['mainHand', 'offHand', 'chest', 'helmet', 'boots', 'gloves', 'cape'];
        if (COMBAT_SLOTS.includes(slotName)) {
            if (!state.equipment_sets) state.equipment_sets = [{}, {}, {}];
            const activeSet = state.active_set || 0;
            const combatGear = {};
            COMBAT_SLOTS.forEach(s => { if (state.equipment[s]) combatGear[s] = state.equipment[s]; });
            state.equipment_sets[activeSet] = combatGear;
        }

        await this.gameManager.saveStateCritical(char.id, state);
        return { success: true, state };
    }

    async switchEquipmentSet(userId, characterId, setIndex) {
        if (setIndex < 0 || setIndex > 2) throw new Error("Invalid set index");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const state = char.state;

        // --- UNLOCK CHECK ---
        if (!state.unlocked_sets) state.unlocked_sets = [0]; // Set 1 is free
        if (!state.unlocked_sets.includes(setIndex)) {
            throw new Error(`Gear Set ${setIndex + 1} is locked!`);
        }
        // --------------------

        const COMBAT_SLOTS = ['mainHand', 'offHand', 'chest', 'helmet', 'boots', 'gloves', 'cape'];

        if (!state.equipment_sets) {
            // Initialize sets if missing. Only store combat gear.
            const initialCombat = {};
            COMBAT_SLOTS.forEach(s => { if (state.equipment?.[s]) initialCombat[s] = state.equipment[s]; });
            state.equipment_sets = [initialCombat, {}, {}];
        }

        // Save current combat gear to the current active set first
        const currentActive = state.active_set || 0;
        const currentCombat = {};
        COMBAT_SLOTS.forEach(s => { if (state.equipment?.[s]) currentCombat[s] = state.equipment[s]; });
        state.equipment_sets[currentActive] = currentCombat;

        // Switch active set index
        state.active_set = setIndex;

        // Update ONLY combat slots in the active equipment
        const newCombat = state.equipment_sets[setIndex] || {};

        // 1. Clear current combat slots
        COMBAT_SLOTS.forEach(s => delete state.equipment[s]);

        // 2. Load new combat slots
        Object.assign(state.equipment, newCombat);

        await this.gameManager.saveStateCritical(char.id, state);
        return { success: true, activeSet: setIndex, equipment: state.equipment };
    }

    async unlockEquipmentSet(userId, characterId, setIndex) {
        if (setIndex !== 1 && setIndex !== 2) throw new Error("Invalid set index for unlock");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const state = char.state;
        if (!state.unlocked_sets) state.unlocked_sets = [0];

        if (state.unlocked_sets.includes(setIndex)) {
            throw new Error("Set already unlocked!");
        }

        if (setIndex === 1) {
            // Unlock Slot 2 - 1,000,000 Silver
            const cost = 1000000;
            const currentSilver = Number(state.silver) || 0;
            if (currentSilver < cost) throw new Error(`Insufficient Silver! Need 1,000,000 (Have: ${currentSilver.toLocaleString()})`);

            state.silver -= cost;
            state.unlocked_sets.push(1);
        } else if (setIndex === 2) {
            // Unlock Slot 3 - 100 Orbs
            const cost = 100;
            const currentOrbs = Number(state.orbs) || 0;
            if (currentOrbs < cost) throw new Error(`Insufficient Orbs! Need 100 (Have: ${currentOrbs})`);

            state.orbs -= cost;
            state.unlocked_sets.push(2);

            // Log orb transaction if possible via orbsManager
            if (this.gameManager.orbsManager) {
                this.gameManager.orbsManager.logTransaction(char, {
                    type: 'SPEND',
                    amount: cost,
                    source: 'UNLOCK_GEAR_SET',
                    timestamp: Date.now(),
                    balanceAfter: state.orbs
                });
            }
        }

        await this.gameManager.saveStateCritical(char.id, state);
        return { success: true, unlockedSets: state.unlocked_sets, silver: state.silver, orbs: state.orbs };
    }

    calculateCharacterIP(char) {
        const equipment = char.state?.equipment || {};
        const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
        let totalIP = 0;
        const hasWeapon = !!equipment.mainHand;

        combatSlots.forEach(slot => {
            const item = equipment[slot];
            if (item) {
                const freshItem = this.resolveItem(item);
                totalIP += freshItem?.ip || item.ip || 0;
            }
        });

        return Math.floor(totalIP / 7);
    }

    calculateStats(char, nowOverride = null) {
        if (!char || !char.state || !char.state.skills) {
            return { warriorProf: 0, hunterProf: 0, mageProf: 0, maxHP: 100, damage: 5, defense: 0, dmgBonus: 0 };
        }
        const skills = char.state.skills;

        // Use equipment from state (which is the active set)
        const equipment = char.state.equipment || {};

        const getLvl = (key) => (skills[key]?.level || 1);

        // Proficiency Base Levels (Direct from Skill)
        let warriorProf = getLvl('WARRIOR_PROFICIENCY');
        let hunterProf = getLvl('HUNTER_PROFICIENCY');
        let mageProf = getLvl('MAGE_PROFICIENCY');

        let gearHP = 0;
        let gearDamage = 0;
        let gearDefense = 0;
        let gearDmgBonus = 0;
        let gearSpeedBonus = 0;
        let gearCritChance = 0;
        let potionCritChance = 0;
        let potionDmgBonus = 0;

        const hasWeapon = !!equipment.mainHand;
        const combatSlots = ['helmet', 'chest', 'gloves', 'boots', 'cape', 'offHand'];

        Object.entries(equipment).forEach(([slot, item]) => {
            if (item) {
                // Skip combat gear stats if no weapon is equipped
                if (!hasWeapon && combatSlots.includes(slot)) return;

                // HOTFIX: Re-resolve item stats to ensure balance changes apply retroactively
                const freshItem = this.resolveItem(item);
                const statsToUse = freshItem ? freshItem.stats : item.stats;

                if (statsToUse) {
                    if (statsToUse.hp) gearHP += statsToUse.hp;
                    if (statsToUse.damage) gearDamage += statsToUse.damage;
                    if (statsToUse.defense) gearDefense += statsToUse.defense;
                    if (statsToUse.dmgBonus) gearDmgBonus += statsToUse.dmgBonus;
                    if (statsToUse.speed || statsToUse.attackSpeed) gearSpeedBonus += (statsToUse.speed || statsToUse.attackSpeed);
                    if (statsToUse.critChance) gearCritChance += statsToUse.critChance;

                    // Allow gear to add directly to proficiencies
                    if (statsToUse.warriorProf) warriorProf += statsToUse.warriorProf;
                    if (statsToUse.hunterProf) hunterProf += statsToUse.hunterProf;
                    if (statsToUse.mageProf) mageProf += statsToUse.mageProf;
                }
            }
        });

        const weapon = equipment.mainHand;
        const ipBonus = weapon ? (weapon.ip || 0) / 10 : 0;
        const baseAttackSpeed = weapon?.stats?.attackSpeed || 1000;

        const efficiency = {
            WOOD: 0, ORE: 0, HIDE: 0, FIBER: 0, FISH: 0, HERB: 0,
            PLANK: 0, METAL: 0, LEATHER: 0, CLOTH: 0, EXTRACT: 0,
            WARRIOR: 0, HUNTER: 0, MAGE: 0, COOKING: 0, ALCHEMY: 0, TOOLS: 0,
            GLOBAL: 0
        };

        // 1. Tool Bonuses (Re-resolve to ensure new formula applies)
        const resolveToolEff = (tool) => {
            if (!tool) return 0;
            const fresh = this.resolveItem(tool.id);
            return fresh?.stats?.efficiency || 0;
        };

        efficiency.WOOD += resolveToolEff(equipment.tool_axe);
        efficiency.ORE += resolveToolEff(equipment.tool_pickaxe);
        efficiency.HIDE += resolveToolEff(equipment.tool_knife);
        efficiency.FIBER += resolveToolEff(equipment.tool_sickle);
        efficiency.FISH += resolveToolEff(equipment.tool_rod);
        efficiency.HERB += resolveToolEff(equipment.tool_pouch);

        // 2. Global/Other Item Bonuses (e.g., Capes)
        Object.entries(equipment).forEach(([slot, item]) => {
            if (item) {
                // Skip combat gear efficiency if no weapon is equipped
                if (!hasWeapon && combatSlots.includes(slot)) return;

                const freshItem = this.resolveItem(item.id);
                const statsToUse = freshItem ? freshItem.stats : item.stats;

                if (statsToUse?.efficiency && typeof statsToUse.efficiency === 'object') {
                    Object.entries(statsToUse.efficiency).forEach(([key, val]) => {
                        if (efficiency[key] !== undefined) {
                            efficiency[key] += val;
                        }
                    });
                }
            }
        });

        // 3. Skill Bonuses (Linear 0% to 40% from Lv 1 to 200)
        efficiency.WOOD += (getLvl('LUMBERJACK') - 1) * (40 / 199);
        efficiency.ORE += (getLvl('ORE_MINER') - 1) * (40 / 199);
        efficiency.HIDE += (getLvl('ANIMAL_SKINNER') - 1) * (40 / 199);
        efficiency.FIBER += (getLvl('FIBER_HARVESTER') - 1) * (40 / 199);
        efficiency.FISH += (getLvl('FISHING') - 1) * (40 / 199);
        efficiency.HERB += (getLvl('HERBALISM') - 1) * (40 / 199);

        efficiency.PLANK += (getLvl('PLANK_REFINER') - 1) * (40 / 199);
        efficiency.METAL += (getLvl('METAL_BAR_REFINER') - 1) * (40 / 199);
        efficiency.LEATHER += (getLvl('LEATHER_REFINER') - 1) * (40 / 199);
        efficiency.CLOTH += (getLvl('CLOTH_REFINER') - 1) * (40 / 199);
        efficiency.EXTRACT += (getLvl('DISTILLATION') - 1) * (40 / 199);


        efficiency.WARRIOR += (getLvl('WARRIOR_CRAFTER') - 1) * (40 / 199);
        efficiency.HUNTER += (getLvl('HUNTER_CRAFTER') - 1) * (40 / 199);
        efficiency.MAGE += (getLvl('MAGE_CRAFTER') - 1) * (40 / 199);
        efficiency.COOKING += (getLvl('COOKING') - 1) * (40 / 199);
        efficiency.ALCHEMY += (getLvl('ALCHEMY') - 1) * (40 / 199);
        efficiency.TOOLS += (getLvl('TOOL_CRAFTER') - 1) * (40 / 199);

        // 4. Weapon Class Detection → Proficiency Gating
        // Only the proficiency matching the equipped weapon provides combat bonuses
        const weaponObj = equipment.mainHand;
        const freshWeapon = weaponObj ? this.resolveItem(weaponObj.id) : null;
        const weaponId = (freshWeapon?.id || weaponObj?.id || '').toUpperCase();

        let activeProf = null; // null = no weapon = no proficiency bonuses
        if (weaponId.includes('SWORD')) activeProf = 'warrior';
        else if (weaponId.includes('BOW')) activeProf = 'hunter';
        else if (weaponId.includes('STAFF')) activeProf = 'mage';



        // Determine active proficiency values for combat
        const profLevel = activeProf === 'warrior' ? warriorProf
            : activeProf === 'hunter' ? hunterProf
                : activeProf === 'mage' ? mageProf
                    : 1;

        // Re-using existing helper function if available, otherwise we define stats here
        // The original code used:
        // const profData = activeProf ? getProficiencyStats(activeProf, profLevel) : ...
        // We need to make sure getProficiencyStats is available or we reimplement it.
        // Looking at the view_file history, getProficiencyStats seems to be imported or defined in this file?
        // It wasn't in the view, let's assume it's external or helper.
        // Wait, the previous view showed it being used: `const profData = activeProf ? getProficiencyStats(activeProf, profLevel) : ...`

        // Let's stick to the existing data structure consumption to imply minimal breakage
        const profData = activeProf ? getProficiencyStats(activeProf, profLevel) : { dmg: 0, hp: 0, speedBonus: 0, def: 0 };
        const activeProfDmg = profData.dmg;
        const activeHP = profData.hp;

        // Use custom non-linear speed curve from proficiency data
        const activeSpeedBonus = profData.speedBonus || 0;

        const activeProfDefense = profData.def || 0;

        const globals = {
            xpYield: 0,
            silverYield: 0,
            efficiency: 0,
            globalEfficiency: 0, // Legacy/Unused
            dropRate: 0,
            qualityChance: 0
        };

        const xpBonus = {
            GLOBAL: 0,
            GATHERING: 0,
            REFINING: 0,
            CRAFTING: 0,
            // Skill specific
            WOOD: 0, ORE: 0, HIDE: 0, FIBER: 0, FISH: 0, HERB: 0,
            PLANK: 0, METAL: 0, LEATHER: 0, CLOTH: 0, EXTRACT: 0,
            WARRIOR: 0, HUNTER: 0, MAGE: 0, ALCHEMY: 0, TOOLS: 0, COOKING: 0
        };

        const duplication = {
            WOOD: 0, ORE: 0, HIDE: 0, FIBER: 0, FISH: 0, HERB: 0,
            PLANK: 0, METAL: 0, LEATHER: 0, CLOTH: 0, EXTRACT: 0,
            WARRIOR: 0, HUNTER: 0, MAGE: 0, ALCHEMY: 0, TOOLS: 0, COOKING: 0
        };

        const autoRefine = {
            WOOD: 0, ORE: 0, HIDE: 0, FIBER: 0, FISH: 0, HERB: 0
        };

        const combatRunes = {
            ATTACK: 0,
            SAVE_FOOD: 0,
            BURST: 0,
            ATTACK_SPEED: 0
        };

        // 4.5 Guild Bonuses (Gathering Station)
        // If the character has guild bonus data attached (loaded into cache by GameManager)
        if (char.guild_bonuses) {
            const gb = char.guild_bonuses;
            // Apply XP Bonus to all Gathering activities
            if (gb.gathering_xp) {
                const gatheringActs = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
                gatheringActs.forEach(act => {
                    xpBonus[act] = (xpBonus[act] || 0) + gb.gathering_xp;
                });
            }
            // Apply Duplication Bonus
            if (gb.gathering_duplic) {
                const gatheringActs = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
                gatheringActs.forEach(act => {
                    duplication[act] = (duplication[act] || 0) + gb.gathering_duplic;
                });
            }
            // Apply Auto-Refine Bonus
            if (gb.gathering_auto) {
                const gatheringActs = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
                gatheringActs.forEach(act => {
                    if (autoRefine[act] !== undefined) {
                        autoRefine[act] = (autoRefine[act] || 0) + gb.gathering_auto;
                    }
                });
            }

            // --- REFINING STATION ---
            const refiningActs = ['PLANK', 'METAL', 'LEATHER', 'CLOTH', 'EXTRACT'];
            
            // Apply XP Bonus
            if (gb.refining_xp) {
                refiningActs.forEach(act => {
                    xpBonus[act] = (xpBonus[act] || 0) + gb.refining_xp;
                });
            }
            // Apply Duplication Bonus
            if (gb.refining_duplic) {
                refiningActs.forEach(act => {
                    duplication[act] = (duplication[act] || 0) + gb.refining_duplic;
                });
            }
            // Apply Efficiency (Time Reduction) Bonus
            if (gb.refining_effic) {
                refiningActs.forEach(act => {
                    efficiency[act] = (efficiency[act] || 0) + gb.refining_effic;
                });
            }

            // --- CRAFTING STATION ---
            const craftingActs = ['WARRIOR', 'HUNTER', 'MAGE', 'ALCHEMY', 'TOOLS', 'COOKING'];

            // Apply XP Bonus
            if (gb.crafting_xp) {
                craftingActs.forEach(act => {
                    xpBonus[act] = (xpBonus[act] || 0) + gb.crafting_xp;
                });
            }
            // Apply Duplication Bonus
            if (gb.crafting_duplic) {
                craftingActs.forEach(act => {
                    duplication[act] = (duplication[act] || 0) + gb.crafting_duplic;
                });
            }
            // Apply Efficiency Bonus
            if (gb.crafting_effic) {
                craftingActs.forEach(act => {
                    efficiency[act] = (efficiency[act] || 0) + gb.crafting_effic;
                });
            }
        }

        // 5. Rune Bonuses
        Object.entries(equipment).forEach(([slot, item]) => {
            if (slot.startsWith('rune_') && item) {
                // slot format: rune_{ACT}_{EFF}
                const parts = slot.split('_');
                let act = parts[1];
                let eff = parts.slice(2).join('_');

                // Normalize rune effect and action for consistent processing
                if (eff === 'COPY') eff = 'DUPLIC';
                if (act === 'TOOL') act = 'TOOLS';
                if (eff === 'SPEED') eff = 'AUTO';

                const freshItem = this.resolveItem(item.id);
                if (freshItem) {
                    const bonusValue = calculateRuneBonus(freshItem.tier, freshItem.stars, eff);

                    if (eff === 'XP') {
                        if (xpBonus[act] !== undefined) xpBonus[act] += bonusValue;
                    } else if (eff === 'COPY' || eff === 'DUPLIC') {
                        if (duplication[act] !== undefined) duplication[act] += bonusValue;
                    } else if (eff === 'SPEED' || eff === 'AUTO') {
                        if (autoRefine[act] !== undefined) autoRefine[act] += bonusValue;
                    } else if (eff === 'EFF') {
                        if (efficiency[act] !== undefined) efficiency[act] += bonusValue;
                    } else if (eff === 'ATTACK' || eff === 'SAVE_FOOD' || eff === 'BURST' || eff === 'ATTACK_SPEED') {
                        if (combatRunes[eff] !== undefined) combatRunes[eff] += bonusValue;
                    }
                }
            }
        });

        // 6. Active Buffs Process
        if (char.state.active_buffs) {
            const now = nowOverride || Date.now();
            const activeBuffs = typeof char.state.active_buffs === 'string'
                ? JSON.parse(char.state.active_buffs)
                : char.state.active_buffs;

            if (activeBuffs) {
                Object.entries(activeBuffs).forEach(([type, buff]) => {
                    // Ensure numeric types
                    const expiresAt = Number(buff.expiresAt);
                    const value = Number(buff.value);

                    if (expiresAt > now) {
                        const remaining = (expiresAt - now) / 1000;
                        const valPc = (value || 0) * 100;

                        switch (type) {
                            case 'GLOBAL_XP':
                                globals.xpYield += valPc;
                                break;
                            case 'SILVER':
                                globals.silverYield += valPc;
                                break;
                            case 'DROP':
                                globals.dropRate += valPc;
                                break;
                            case 'QUALITY':
                                globals.qualityChance += valPc;
                                break;
                            case 'GATHER_XP':
                                xpBonus.GATHERING += valPc;
                                break;
                            case 'REFINE_XP':
                                xpBonus.REFINING += valPc;
                                break;
                            case 'CRAFT_XP':
                                xpBonus.CRAFTING += valPc;
                                break;
                            case 'CRIT':
                                potionCritChance += valPc;
                                break;
                            case 'DAMAGE':
                                potionDmgBonus += (value || 0); // Use raw multiplier (e.g. 0.01)
                                break;
                            case 'MEMBERSHIP_BOOST':
                                // Handled below via direct membership check for improved robustness
                                break;
                        }
                    }
                });
            }
        }

        // --- ROBUST MEMBERSHIP CHECK ---
        // Always apply bonuses if membership is active in primary state (not just as a buff)
        if (char.state.membership?.active) {
            const now = nowOverride || Date.now();
            if (char.state.membership.expiresAt > now) {
                globals.xpYield += 10; // +10% XP
                globals.efficiency += 10; // +10% Efficiency
            }
        }
        // -------------------------------

        // --- ALTAR GLOBAL BUFF (EXTENDED 3-TIERS ACCUMULATED) ---
        let altarRefDouble = 0;
        let altarSilver = 0;
        let altarDropQual = 0;
        let altarXp = 0;

        if (char.state.altar) {
            const now = nowOverride || Date.now();
            if (char.state.altar.tier1EndTime > now) {
                altarRefDouble += 2.5; altarSilver += 5; altarDropQual += 2.5; altarXp += 5;
            }
            if (char.state.altar.tier2EndTime > now) {
                altarRefDouble += 5; altarSilver += 10; altarDropQual += 5; altarXp += 10;
            }
            if (char.state.altar.tier3EndTime > now) {
                altarRefDouble += 10; altarSilver += 15; altarDropQual += 10; altarXp += 15;
            }
        }

        if (altarSilver > 0 || altarDropQual > 0 || altarRefDouble > 0 || altarXp > 0) {
            globals.silverYield = (globals.silverYield || 0) + altarSilver;
            globals.dropRate = (globals.dropRate || 0) + altarDropQual;
            globals.qualityChance = (globals.qualityChance || 0) + altarDropQual; 
            globals.xpYield = (globals.xpYield || 0) + altarXp;
            
            Object.keys(duplication).forEach(k => duplication[k] += altarRefDouble);
            Object.keys(autoRefine).forEach(k => autoRefine[k] += altarRefDouble);
        }
        // ------------------------------------

        // Apply Global and Membership efficiency to all specific categories
        const keys = Object.keys(efficiency).filter(k => k !== 'GLOBAL');
        keys.forEach(k => {
            efficiency[k] += efficiency.GLOBAL + (globals.efficiency || 0);
            efficiency[k] = parseFloat(efficiency[k].toFixed(2));
        });
        efficiency.GLOBAL = parseFloat((efficiency.GLOBAL + (globals.efficiency || 0)).toFixed(2));

        // --- NEW SPEED FORMULA (H/S) ---
        // Base Global = 0.5 H/S
        // Total Bonus % = Gear + Proficiency + Runes
        const totalBonusPercent = gearSpeedBonus + activeSpeedBonus + (combatRunes.ATTACK_SPEED || 0);
        
        // H/S = 0.5 * (1 + bonus/100)
        const finalHPS = 0.5 * (1 + (totalBonusPercent / 100));
        
        // Intervalo em ms = 1000 / HPS
        // Global safety cap at 200ms (5 H/S)
        let finalAttackSpeed = Math.max(200, Math.floor(1000 / finalHPS));

        const stats = {
            warriorProf, hunterProf, mageProf,
            activeProf, // 'warrior' | 'hunter' | 'mage' | null
            maxHP: parseFloat((100 + activeHP + gearHP).toFixed(1)),
            damage: parseFloat(((activeProfDmg + gearDamage + combatRunes.ATTACK) * (1 + potionDmgBonus)).toFixed(1)),
            defense: parseFloat((gearDefense + activeProfDefense).toFixed(1)),
            attackSpeed: finalAttackSpeed,
            hitsPerSecond: parseFloat(finalHPS.toFixed(2)),
            totalSpeedBonus: totalBonusPercent,
            dmgBonus: gearDmgBonus,
            runeAttackBonus: combatRunes.ATTACK,
            runeAtkSpdBonus: combatRunes.ATTACK_SPEED,
            foodSaver: combatRunes.SAVE_FOOD,
            potionDmgBonus,
            burstChance: parseFloat(((combatRunes.BURST || 0) + gearCritChance + potionCritChance).toFixed(2)),
            potionCritChance,
            efficiency,
            duplication,
            autoRefine,
            globals, // Return globals so we can use them in GameManager/CombatManager
            xpBonus // Return detailed XP bonuses
        };

        // Debug NaN values
        Object.entries(stats).forEach(([k, v]) => {
            if (typeof v === 'number' && isNaN(v)) {
                console.error(`[STATS-DEBUG] NaN detected in ${k}!`, {
                    activeProfDmg, gearDamage, gearDmgBonus, combatRunes, potionDmgBonus,
                    activeHP, gearHP,
                    activeProfDefense, gearDefense,
                    activeSpeedBonus, gearSpeedBonus,
                    finalAttackSpeed
                });
                stats[k] = 0; // Fallback to avoid crash
            }
        });

        return stats;
    }

    async unequipAllRunes(userId, characterId, type) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const state = char.state;
        if (!state.equipment) return { success: true };

        const typeMap = {
            'GATHERING': ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'],
            'REFINING': ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'],
            'CRAFTING': ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'],
            'COMBAT': ['ATTACK']
        };

        const targetActs = typeMap[type];
        if (!targetActs) throw new Error("Invalid Rune Type");

        const slotsToUnequip = [];

        Object.keys(state.equipment).forEach(slot => {
            if (slot.startsWith('rune_')) {
                // slot: rune_{ACT}_{EFF}
                const parts = slot.split('_');
                const act = parts[1]; // WOOD, ORE, ATTACK, etc.
                if (targetActs.includes(act)) {
                    slotsToUnequip.push(slot);
                }
            }
        });

        // Use standard unequipItem logic to ensure inventory space checks and state saving
        // We do this sequentially to avoid race conditions on inventory state
        for (const slot of slotsToUnequip) {
            try {
                // We could optimize by batching, but reusing unequipItem is safer
                // However, unequipItem saves state every time. 
                // Optimization: We manually move items here and save ONCE.
                if (state.equipment[slot]) {
                    const item = state.equipment[slot];
                    const { id: returnId, stats: _, amount: itemAmount, ...metadata } = item;
                    const amount = Number(itemAmount) || 1;

                    // We can reuse addItemToInventory, checks space there
                    const added = this.addItemToInventory(char, returnId, amount, Object.keys(metadata).length > 0 ? metadata : null);
                    if (added) {
                        delete state.equipment[slot];
                    } else {
                        console.warn(`[RUNE-UNEQUIP] Inventory full for ${returnId}`);
                        // If full, we stop unequipping to prevent loss, simply break
                        break;
                    }
                }
            } catch (err) {
                console.error(`[RUNE-UNEQUIP] Error unequipping ${slot}:`, err);
            }
        }

        await this.gameManager.saveState(char.id, state);
        return { success: true };
    }

    async autoEquipRunes(userId, characterId, type) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        // 1. Unequip current runes of this type to free up best runes if they are currently equipped
        await this.unequipAllRunes(userId, characterId, type);

        // Reload char state after unequip (though objects are ref passed, explicit save was called)
        // char.state is modified in place by unequipAllRunes (mostly), but let's trust the reference.

        const state = char.state;
        const inv = state.inventory || {};

        const typeMap = {
            'GATHERING': ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'],
            'REFINING': ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'],
            'CRAFTING': ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'],
            'COMBAT': ['ATTACK']
        };

        const targetActs = typeMap[type];
        if (!targetActs) throw new Error("Invalid Rune Type");

        // 2. Find all relevant runes in inventory
        // We need to group them by their target slot capability.
        // ID format: T{tier}_RUNE_{ACT}_{EFF}_{stars}STAR

        const availableRunes = [];
        Object.entries(inv).forEach(([key, entry]) => {
            const baseId = key.split('::')[0];
            const item = this.resolveItem(baseId);

            if (item && item.type === 'RUNE') {
                const match = baseId.match(/^T(\d+)_RUNE_(.+)_(\d+)STAR$/);
                if (match) {
                    const tier = parseInt(match[1]);
                    const rest = match[2]; // ACT_EFF, e.g. WOOD_XP or ATTACK_ATTACK
                    const stars = parseInt(match[3]);

                    // complex parsing for ACT and EFF
                    // ACT is variable length (WOOD vs ATTACK), EFF is suffix
                    // Standard types: WOOD_XP, WOOD_COPY, WOOD_SPEED
                    // Combat: ATTACK_ATTACK, ATTACK_ATTACK_SPEED, ATTACK_SAVE_FOOD, ATTACK_BURST

                    // Let's try to match known Acts
                    let act = null;
                    let eff = null;

                    for (const knownAct of targetActs) {
                        if (rest.startsWith(knownAct + '_')) {
                            act = knownAct;
                            eff = rest.substring(knownAct.length + 1);

                            // Normalize eff for legacy support
                            if (eff === 'COPY') eff = 'DUPLIC';
                            if (eff === 'SPEED') eff = 'AUTO';

                            break;
                        }
                    }

                    if (act && eff) {
                        const qty = typeof entry === 'object' ? (entry.amount || 0) : (Number(entry) || 0);
                        if (qty > 0) {
                            availableRunes.push({
                                id: baseId,
                                act,
                                eff,
                                tier,
                                stars,
                                qty,
                                fullKey: key
                            });
                        }
                    }
                }
            }
        });

        // Sort by power: Tier Desc, Stars Desc
        availableRunes.sort((a, b) => {
            if (b.tier !== a.tier) return b.tier - a.tier;
            return b.stars - a.stars;
        });

        // 3. Equip logic
        if (type === 'COMBAT') {
            // Combat Limit: 3 Max
            // Priority: ATTACK > ATTACK_SPEED > BURST > SAVE_FOOD
            const priority = ['ATTACK', 'ATTACK_SPEED', 'BURST', 'SAVE_FOOD'];
            let equippedCount = 0;
            const MAX_COMBAT = 3;

            for (const eff of priority) {
                if (equippedCount >= MAX_COMBAT) break;

                // Find best rune for this effect
                const bestRune = availableRunes.find(r => r.act === 'ATTACK' && r.eff === eff && r.qty > 0);

                if (bestRune) {
                    const slotName = `rune_ATTACK_${eff}`;
                    // Equip it
                    // Manual equip to avoid "item not found" due to async race or multiple calls

                    // Remove 1 from inventory
                    const invEntry = inv[bestRune.fullKey];
                    if (typeof invEntry === 'object') {
                        invEntry.amount--;
                        if (invEntry.amount <= 0) delete inv[bestRune.fullKey];
                    } else {
                        inv[bestRune.fullKey]--;
                        if (inv[bestRune.fullKey] <= 0) delete inv[bestRune.fullKey];
                    }
                    bestRune.qty--;

                    // Add to equipment
                    const itemDef = this.resolveItem(bestRune.id);
                    state.equipment[slotName] = { ...itemDef };

                    equippedCount++;
                }
            }
        } else {
            // Standard types (Gathering, etc.) - One slot per Act+Eff combo
            // Target slots: rune_{ACT}_{EFF}
            // For each Act in this type, we have specific Effects
            // Gathering: XP, COPY, SPEED (Auto-Refine)
            // Refining: XP, COPY, EFF (Efficiency)
            // Crafting: XP, COPY, EFF

            // We iterate all available runes and fill slots if empty
            // Since they are sorted by best, the first one usage logic works naturally 
            // BUT we must ensure we don't try to equip same rune to multiple slots if we only have 1 qty?
            // Actually, we iterate defined slots and find best rune for that slot.

            const effects = type === 'GATHERING' ? ['XP', 'DUPLIC', 'AUTO']
                : ['XP', 'DUPLIC', 'EFF'];

            targetActs.forEach(act => {
                effects.forEach(eff => {
                    const slotName = `rune_${act}_${eff}`;
                    // Find best rune for this slot
                    const bestRune = availableRunes.find(r => r.act === act && r.eff === eff && r.qty > 0);

                    if (bestRune) {
                        // Remove 1 from inventory
                        const invEntry = inv[bestRune.fullKey];
                        if (typeof invEntry === 'object') {
                            invEntry.amount--;
                            if (invEntry.amount <= 0) delete inv[bestRune.fullKey];
                        } else {
                            inv[bestRune.fullKey]--;
                            if (inv[bestRune.fullKey] <= 0) delete inv[bestRune.fullKey];
                        }
                        bestRune.qty--;

                        // Add to equipment
                        const itemDef = this.resolveItem(bestRune.id);
                        state.equipment[slotName] = { ...itemDef };
                    }
                });
            });
        }

        await this.gameManager.saveState(char.id, state);
        return { success: true };

    }
}
