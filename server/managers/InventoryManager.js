import { ITEMS, QUALITIES, resolveItem, ITEM_LOOKUP } from '../../shared/items.js';

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
        if (metadata && metadata.craftedBy) {
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
                // Fix: Use full ID to preserve quality
                const oldId = currentEquip.id;
                state.inventory[oldId] = (state.inventory[oldId] || 0) + 1;
            }

            state.equipment[slotName] = item;
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
        if (!char?.state?.skills) return { str: 0, agi: 0, int: 0, maxHP: 100, damage: 5, defense: 0, dmgBonus: 0 };
        const skills = char.state.skills;
        const equipment = char.state.equipment || {};

        let str = 0;
        let agi = 0;
        let int = 0;

        const getLvl = (key) => (skills[key]?.level || 1);

        str += getLvl('ORE_MINER');
        str += getLvl('METAL_BAR_REFINER');
        str += getLvl('WARRIOR_CRAFTER');
        str += getLvl('COOKING');
        str += getLvl('FISHING');
        str = Math.min(100, str * 0.2);

        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');
        agi += getLvl('LUMBERJACK');
        agi += getLvl('PLANK_REFINER');
        agi = Math.min(100, agi * 0.2);

        int += getLvl('FIBER_HARVESTER');
        int += getLvl('CLOTH_REFINER');
        int += getLvl('MAGE_CRAFTER');
        int += getLvl('HERBALISM');
        int += getLvl('DISTILLATION');
        int += getLvl('ALCHEMY');
        int = Math.min(100, int * (1 / 6));

        let gearHP = 0;
        let gearDamage = 0;
        let gearDefense = 0;
        let gearDmgBonus = 0;
        let gearSpeedBonus = 0;

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

                    // Allow gear to add directly to stats
                    if (statsToUse.str) str += statsToUse.str;
                    if (statsToUse.agi) agi += statsToUse.agi;
                    if (statsToUse.int) int += statsToUse.int;
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

        // 4. Intelligence Bonus to Global Yields
        // Global XP: 1% per INT
        // Silver: 1% per INT
        // Efficiency: 0% from INT (removed)

        // 4. Intelligence Bonus to Global Yields
        // Global XP: 1% per INT
        // Silver: 1% per INT
        // Efficiency: 0% from INT (removed)

        const globals = {
            xpYield: int * 0.5, // 0.5% per INT
            silverYield: int * 0.5, // 0.5% per INT
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

        // 5. Rune Bonuses
        Object.entries(equipment).forEach(([slot, item]) => {
            if (slot.startsWith('rune_') && item) {
                // slot format: rune_{ACT}_{EFF}
                const parts = slot.split('_');
                const act = parts[1]; // WOOD, METAL, etc.
                const eff = parts[2]; // XP, COPY, SPEED, EFF

                const freshItem = this.resolveItem(item.id);
                if (freshItem) {
                    const starBonus = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 10 };
                    const bonusValue = (freshItem.tier - 1) * 5 + (starBonus[freshItem.stars] || freshItem.stars);

                    if (eff === 'XP') {
                        if (xpBonus[act] !== undefined) xpBonus[act] += bonusValue;
                    } else if (eff === 'COPY') {
                        if (duplication[act] !== undefined) duplication[act] += bonusValue;
                    } else if (eff === 'SPEED') {
                        if (autoRefine[act] !== undefined) autoRefine[act] += bonusValue;
                    } else if (eff === 'EFF') {
                        if (efficiency[act] !== undefined) efficiency[act] += bonusValue;
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
        const weaponObj = equipment.mainHand; // Renaming to avoid conflict if I really want a local handle
        const freshWeapon = weaponObj ? this.resolveItem(weaponObj.id) : null;
        const weaponSpeed = freshWeapon?.stats?.speed || 0; // No weapon = no speed bonus
        const totalSpeed = weaponSpeed + gearSpeedBonus;

        const finalAttackSpeed = Math.max(200, 2000 - totalSpeed - (agi * 2));

        return {
            str, agi, int,
            maxHP: parseFloat((100 + (str * 10) + gearHP).toFixed(1)),
            damage: parseFloat(((5 + (str * 1) + (agi * 1) + (int * 1) + gearDamage) * (1 + gearDmgBonus)).toFixed(1)),
            defense: parseFloat(gearDefense.toFixed(1)),
            attackSpeed: finalAttackSpeed,
            dmgBonus: gearDmgBonus,
            efficiency,
            duplication,
            autoRefine,
            globals, // Return globals so we can use them in GameManager/CombatManager
            xpBonus // Return detailed XP bonuses
        };
    }
}
