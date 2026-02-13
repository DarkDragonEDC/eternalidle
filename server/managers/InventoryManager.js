import { ITEMS, QUALITIES, resolveItem, ITEM_LOOKUP, calculateRuneBonus, getSkillForItem, getLevelRequirement, getRequiredProficiencyGroup } from '../../shared/items.js';
import { getProficiencyStats } from '../../shared/proficiency_stats.js';

// Removed local ITEM_LOOKUP generation in favor of shared source of truth


export class InventoryManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    resolveItem(id) {
        return resolveItem(id);
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
            inv[storageKey].amount = (inv[storageKey].amount || 0) + safeAmount;
        } else {
            if (typeof inv[storageKey] === 'object' && inv[storageKey] !== null) {
                inv[storageKey].amount = (inv[storageKey].amount || 0) + safeAmount;
                if (inv[storageKey].amount <= 0) delete inv[storageKey];
            } else {
                inv[storageKey] = (Number(inv[storageKey]) || 0) + safeAmount;
                if (inv[storageKey] <= 0) delete inv[storageKey];
            }
        }
        return true;
    }

    dismantleItem(char, storageKey, quantity = 1) {
        if (!char.state.inventory) return { success: false, error: "Inventory Empty" };
        const inv = char.state.inventory;

        const entry = inv[storageKey];
        if (!entry) return { success: false, error: "Item not found in inventory" };

        const currentQty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
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

        // Rewards Table Logic (per unit)
        let shardAmountPerUnit = 0;
        switch (quality) {
            case 0: shardAmountPerUnit = tier * 10; break;
            case 1: shardAmountPerUnit = Math.ceil(tier * 12.5); break;
            case 2: shardAmountPerUnit = tier * 15; break;
            case 3: shardAmountPerUnit = Math.ceil(tier * 17.5); break;
            case 4: shardAmountPerUnit = tier * 20; break;
            default: shardAmountPerUnit = tier * 10;
        }

        const totalShards = shardAmountPerUnit * quantity;

        // Remove units from inventory
        if (typeof inv[storageKey] === 'object') {
            inv[storageKey].amount -= quantity;
            if (inv[storageKey].amount <= 0) delete inv[storageKey];
        } else {
            inv[storageKey] -= quantity;
            if (inv[storageKey] <= 0) delete inv[storageKey];
        }

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

    async equipItem(userId, characterId, itemId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        const item = this.resolveItem(itemId);
        if (!item) throw new Error("Item not found");

        const validSlots = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH', 'FOOD', 'RUNE'];
        if (!validSlots.includes(item.type)) {
            throw new Error("This item cannot be equipped");
        }

        const state = char.state;
        const inventoryEntry = state.inventory[itemId];
        const qty = typeof inventoryEntry === 'object' ? (inventoryEntry?.amount || 0) : (Number(inventoryEntry) || 0);
        if (qty < 1) {
            throw new Error("You do not have this item");
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
            const skillKey = getSkillForItem(itemId, 'GATHERING') || getSkillForItem(itemId, 'CRAFTING');
            if (skillKey) {
                const userLevel = char.state.skills[skillKey]?.level || 1;
                if (userLevel < requiredLevel) {
                    const skillName = skillKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    throw new Error(`Insufficient level! Requires ${skillName} Lv ${requiredLevel} (Your Lv: ${userLevel})`);
                }
            }
        }
        // -------------------------------

        let slotName = '';
        if (item.type === 'RUNE') {
            // ID Format: T{tier}_RUNE_{ACT}_{EFF}_{stars}STAR
            const match = itemId.match(/^T\d+_RUNE_(.+)_(\d+)STAR$/);
            if (!match) throw new Error("Invalid Rune format");
            slotName = `rune_${match[1]}`; // e.g., rune_WOOD_XP
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
            const amount = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);
            delete state.inventory[itemId];

            if (!state.equipment.food) {
                state.equipment.food = { ...item, amount: amount };
            } else {
                const currentEquip = state.equipment.food;
                if (currentEquip.id === itemId) {
                    currentEquip.amount = (Number(currentEquip.amount) || 0) + amount;
                } else {
                    // Refund current food to inventory
                    const oldId = currentEquip.id;
                    const oldAmount = Number(currentEquip.amount) || 1;
                    this.addItemToInventory(char, oldId, oldAmount);
                    state.equipment.food = { ...item, amount: amount };
                }
            }
        } else {
            // Non-food items (decrement 1)
            const entry = state.inventory[itemId];
            if (typeof entry === 'object' && entry !== null) {
                entry.amount--;
                if (entry.amount <= 0) delete state.inventory[itemId];
            } else {
                state.inventory[itemId]--;
                if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
            }

            const currentEquip = state.equipment[slotName];
            if (currentEquip && currentEquip.id) {
                // Return old item to inventory with its metadata
                const oldId = currentEquip.id;
                // If it was an object (has metadata), pass it back
                const { id: _, stats: __, ...metadata } = currentEquip;
                this.addItemToInventory(char, oldId, 1, Object.keys(metadata).length > 0 ? metadata : null);
            }

            // Create equipment object with metadata from inventory
            const inventoryEntry = state.inventory[itemId];
            const equipmentObject = { ...item }; // item is resolved from itemId (has stats, name, etc)

            if (typeof inventoryEntry === 'object' && inventoryEntry !== null) {
                const { amount, ...metadata } = inventoryEntry;
                Object.assign(equipmentObject, metadata);
            }

            state.equipment[slotName] = equipmentObject;
        }

        await this.gameManager.saveState(char.id, state);
        return { success: true };
    }

    async unequipItem(userId, characterId, slotName) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const state = char.state;
        if (!state.equipment || !state.equipment[slotName]) {
            throw new Error("Empty or invalid slot");
        }

        const item = state.equipment[slotName];
        const amount = Number(item.amount) || 1;
        // Fix: Use full ID to preserve quality
        const returnId = item.id;
        this.addItemToInventory(char, returnId, amount);

        delete state.equipment[slotName];

        await this.gameManager.saveState(char.id, state);
        return { success: true, state };
    }

    calculateStats(char, nowOverride = null) {
        if (!char?.state?.skills) return { warriorProf: 0, hunterProf: 0, mageProf: 0, maxHP: 100, damage: 5, defense: 0, dmgBonus: 0 };
        const skills = char.state.skills;
        const equipment = char.state.equipment || {};

        let warriorProf = 0;
        let hunterProf = 0;
        let mageProf = 0;

        const getLvl = (key) => (skills[key]?.level || 1);

        warriorProf += getLvl('ORE_MINER');
        warriorProf += getLvl('METAL_BAR_REFINER');
        warriorProf += getLvl('WARRIOR_CRAFTER');
        warriorProf += getLvl('COOKING');
        warriorProf += getLvl('FISHING');
        warriorProf = Math.min(100, warriorProf * 0.2);

        hunterProf += getLvl('ANIMAL_SKINNER');
        hunterProf += getLvl('LEATHER_REFINER');
        hunterProf += getLvl('HUNTER_CRAFTER');
        hunterProf += getLvl('LUMBERJACK');
        hunterProf += getLvl('PLANK_REFINER');
        hunterProf = Math.min(100, hunterProf * 0.2);

        mageProf += getLvl('FIBER_HARVESTER');
        mageProf += getLvl('CLOTH_REFINER');
        mageProf += getLvl('MAGE_CRAFTER');
        mageProf += getLvl('HERBALISM');
        mageProf += getLvl('DISTILLATION');
        mageProf += getLvl('ALCHEMY');
        mageProf = Math.min(100, mageProf * (1 / 6));

        let gearHP = 0;
        let gearDamage = 0;
        let gearDefense = 0;
        let gearDmgBonus = 0;
        let gearSpeedBonus = 0;
        let gearCritChance = 0;

        Object.values(equipment).forEach(item => {
            if (item) {
                // HOTFIX: Re-resolve item stats to ensure balance changes apply retroactively
                // This prevents "snapshot" stats from persisting after code updates
                const freshItem = this.resolveItem(item.id);
                const statsToUse = freshItem ? freshItem.stats : item.stats;

                if (statsToUse) {
                    if (statsToUse.hp) gearHP += statsToUse.hp;
                    if (statsToUse.damage) gearDamage += statsToUse.damage;
                    if (statsToUse.defense) gearDefense += statsToUse.defense;
                    if (statsToUse.dmgBonus) gearDmgBonus += statsToUse.dmgBonus;
                    if (statsToUse.speed && item.type !== 'WEAPON') gearSpeedBonus += statsToUse.speed;
                    if (statsToUse.critChance) gearCritChance += statsToUse.critChance;

                    // Allow gear to add directly to proficiencies
                    if (statsToUse.str) warriorProf += statsToUse.str;
                    if (statsToUse.warriorProf) warriorProf += statsToUse.warriorProf;
                    if (statsToUse.agi) hunterProf += statsToUse.agi;
                    if (statsToUse.hunterProf) hunterProf += statsToUse.hunterProf;
                    if (statsToUse.int) mageProf += statsToUse.int;
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
        Object.values(equipment).forEach(item => {
            if (item) {
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

        // 3. Skill Bonuses (Level * 0.2 per level => Max 20% at Lvl 100)
        efficiency.WOOD += getLvl('LUMBERJACK') * 0.2;
        efficiency.ORE += getLvl('ORE_MINER') * 0.2;
        efficiency.HIDE += getLvl('ANIMAL_SKINNER') * 0.2;
        efficiency.FIBER += getLvl('FIBER_HARVESTER') * 0.2;
        efficiency.FISH += getLvl('FISHING') * 0.2;
        efficiency.HERB += getLvl('HERBALISM') * 0.2;

        efficiency.PLANK += getLvl('PLANK_REFINER') * 0.2;
        efficiency.METAL += getLvl('METAL_BAR_REFINER') * 0.2;
        efficiency.LEATHER += getLvl('LEATHER_REFINER') * 0.2;
        efficiency.CLOTH += getLvl('CLOTH_REFINER') * 0.2;
        efficiency.EXTRACT += getLvl('DISTILLATION') * 0.2;

        efficiency.WARRIOR += getLvl('WARRIOR_CRAFTER') * 0.2;
        efficiency.HUNTER += getLvl('HUNTER_CRAFTER') * 0.2;
        efficiency.MAGE += getLvl('MAGE_CRAFTER') * 0.2;
        efficiency.COOKING += getLvl('COOKING') * 0.2;
        efficiency.ALCHEMY += getLvl('ALCHEMY') * 0.2;
        efficiency.TOOLS += getLvl('TOOL_CRAFTER') * 0.2;

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
        const profData = activeProf ? getProficiencyStats(activeProf, char[activeProf]) : { dmg: 0, hp: 0 };
        const activeProfDmg = profData.dmg;
        const activeHP = profData.hp;

        // Hunter at 100 needs approx 360ms reduction from 2000ms.
        // User clarified: Max reduction at 100 is 360ms.
        // 360 / 100 = 3.6 per level.
        // Mage at 100 needs approx 333ms reduction from 2000ms.
        // 333 / 100 = 3.33 per level.
        // Warrior at 100 needs approx 333ms reduction from 2000ms.
        // 333 / 100 = 3.33 per level.
        const activeSpeedBonus = activeProf === 'hunter' ? hunterProf * 3.6
            : activeProf === 'mage' ? mageProf * 3.33
                : activeProf === 'warrior' ? warriorProf * 3.33 : 0;

        const activeProfDefense = activeProf === 'hunter' ? hunterProf * 25
            : activeProf === 'mage' ? mageProf * 12.5
                : activeProf === 'warrior' ? warriorProf * 37.5 : 0;


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

        // 5. Rune Bonuses
        Object.entries(equipment).forEach(([slot, item]) => {
            if (slot.startsWith('rune_') && item) {
                // slot format: rune_{ACT}_{EFF}
                const parts = slot.split('_');
                const act = parts[1];
                const eff = parts.slice(2).join('_');

                const freshItem = this.resolveItem(item.id);
                if (freshItem) {
                    const bonusValue = calculateRuneBonus(freshItem.tier, freshItem.stars, eff);

                    if (eff === 'XP') {
                        if (xpBonus[act] !== undefined) xpBonus[act] += bonusValue;
                    } else if (eff === 'COPY') {
                        if (duplication[act] !== undefined) duplication[act] += bonusValue;
                    } else if (eff === 'SPEED') {
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
                        // console.log(`[DEBUG-BUFFS] Applying: ${type}, val: ${value}, rem: ${remaining.toFixed(0)}s`);
                        const valPc = value * 100; // 0.05 -> 5

                        switch (type) {
                            case 'GLOBAL_XP':
                                globals.xpYield += valPc;
                                break;
                            case 'GOLD':
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
                            case 'MEMBERSHIP_BOOST':
                                // 10% XP Bonus
                                globals.xpYield += (buff.xpBonus || 0.10) * 100;
                                // 10% Silver Bonus
                                globals.silverYield += 10;
                                // 10% Efficiency Bonus
                                globals.efficiency += 10;
                                // Speed bonus removed
                                break;
                        }
                    }
                });
            }
        }

        // Apply Global and Membership efficiency to all specific categories
        const keys = Object.keys(efficiency).filter(k => k !== 'GLOBAL');
        keys.forEach(k => {
            efficiency[k] += efficiency.GLOBAL + (globals.efficiency || 0);
            efficiency[k] = parseFloat(efficiency[k].toFixed(2));
        });
        efficiency.GLOBAL = parseFloat((efficiency.GLOBAL + (globals.efficiency || 0)).toFixed(2));

        // Total Speed = WeaponSpeed + GearSpeed
        // weaponObj and freshWeapon already defined above in weapon class detection
        const weaponSpeed = freshWeapon?.stats?.speed || 0; // No weapon = no speed bonus
        const totalSpeed = weaponSpeed + gearSpeedBonus;

        let finalAttackSpeed = Math.max(200, 2000 - totalSpeed - activeSpeedBonus);

        // Handle Attack Speed Rune (Percentage boost on final speed)
        // If rune gives +30% Speed, we divide the interval by 1.30
        if (combatRunes.ATTACK_SPEED > 0) {
            finalAttackSpeed = finalAttackSpeed / (1 + (combatRunes.ATTACK_SPEED / 100));
            // Re-apply cap just in case
            finalAttackSpeed = Math.max(200, finalAttackSpeed);
        }

        return {
            warriorProf, hunterProf, mageProf,
            activeProf, // 'warrior' | 'hunter' | 'mage' | null
            maxHP: parseFloat((100 + activeHP + gearHP).toFixed(1)),
            damage: parseFloat(((5 + activeProfDmg + gearDamage) * (1 + gearDmgBonus) * (1 + (combatRunes.ATTACK / 100))).toFixed(1)),
            defense: parseFloat((gearDefense + activeProfDefense).toFixed(1)),
            attackSpeed: finalAttackSpeed,
            dmgBonus: gearDmgBonus,
            runeAttackBonus: combatRunes.ATTACK,
            runeAtkSpdBonus: combatRunes.ATTACK_SPEED,
            foodSaver: combatRunes.SAVE_FOOD,
            burstChance: parseFloat(((combatRunes.BURST || 0) + gearCritChance).toFixed(2)),
            efficiency,
            duplication,
            autoRefine,
            globals, // Return globals so we can use them in GameManager/CombatManager
            xpBonus // Return detailed XP bonuses
        };
    }
}
