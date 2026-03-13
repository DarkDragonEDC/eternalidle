import { INITIAL_SKILLS } from '../../shared/skills.js';

export class MigrationManager {
    constructor(gameManager) {
        this.gm = gameManager;
    }

    /**
     * Entry point for all character data migrations.
     * Guaranteed to run once per login/load.
     */
    migrateCharacter(char) {
        if (!char || !char.state) return;

        this.migrateRunes(char);
        this.migrateTitles(char);
        this.unifiedMigrationAndCleanup(char);
        this.automatedTitleGrant(char);
    }

    automatedTitleGrant(char) {
        if (!char || !char.state) return;
        // SPECIAL: Auto-grant "Pre-Alpha Player" title for all current players
        // Logic moved from GameManager.js
        const CUTOFF_DATE = new Date('2026-02-18T23:59:59Z');
        const charCreatedAt = new Date(char.created_at);
        const NEW_TITLE = 'Pre-Alpha Player';
        const OLD_TITLE = 'Pré-alpha player';

        if (!char.state.unlockedTitles) char.state.unlockedTitles = [];
        const before = JSON.stringify(char.state.unlockedTitles);

        // 1. Migration: Rename old title if present (handled in migrateTitles, but kept for safety)
        char.state.unlockedTitles = char.state.unlockedTitles.map(t => t === OLD_TITLE ? NEW_TITLE : t);

        // 2. Auto-grant: Deactivated (Out of Pre-Alpha)
        // if (charCreatedAt < CUTOFF_DATE && !char.state.unlockedTitles.includes(NEW_TITLE)) {
        //     char.state.unlockedTitles.push(NEW_TITLE);
        // }

        // 3. Unique Cleanup
        char.state.unlockedTitles = [...new Set(char.state.unlockedTitles)];

        const after = JSON.stringify(char.state.unlockedTitles);
        if (before !== after) {
            this.gm.markDirty(char.id);
        }
    }

    /**
     * Consolidates all rune and equipment migrations into a single pass.
     */
    migrateRunes(char) {
        if (!char || !char.state) return;
        const state = char.state;
        let changed = false;

        const normalizeId = (id) => {
            if (!id || typeof id !== 'string') return id;
            if (!id.includes('_RUNE_')) return id;
            let newId = id.toUpperCase();
            if (newId.includes('_COPY')) newId = newId.replace('_COPY', '_DUPLIC');
            if (newId.includes('_SPEED') && !newId.includes('ATTACK_SPEED')) newId = newId.replace('_SPEED', '_AUTO');
            if (newId.includes('_TOOL_')) newId = newId.replace('_TOOL_', '_TOOLS_');
            return newId;
        };

        const normalizeSlot = (slot) => {
            if (!slot || !slot.startsWith('rune_')) return slot;
            let newSlot = slot;
            if (newSlot.includes('_COPY')) newSlot = newSlot.replace('_COPY', '_DUPLIC');
            if (newSlot.includes('_SPEED') && !newSlot.includes('ATTACK_SPEED')) newSlot = newSlot.replace('_SPEED', '_AUTO');
            if (newSlot.startsWith('rune_TOOL_')) newSlot = newSlot.replace('rune_TOOL_', 'rune_TOOLS_');
            return newSlot;
        };

        // 1. Inventory Migration
        if (state.inventory) {
            const inv = state.inventory;
            const keys = Object.keys(inv);
            for (const key of keys) {
                const val = inv[key];
                const newKey = normalizeId(key);
                if (newKey !== key) {
                    console.log(`[MIGRATION-RUNE] Converting Inventory Rune: ${key} -> ${newKey} for ${char.name}`);
                    if (inv[newKey]) {
                        const oldQty = (typeof val === 'object' && val !== null) ? (Number(val.amount) || 0) : (Number(val) || 0);
                        if (typeof inv[newKey] === 'object' && inv[newKey] !== null) {
                            inv[newKey].amount = (Number(inv[newKey].amount) || 0) + oldQty;
                        } else {
                            inv[newKey] = (Number(inv[newKey]) || 0) + oldQty;
                        }
                    } else {
                        inv[newKey] = val;
                    }
                    delete inv[key];
                    changed = true;
                }
            }
        }

        // 2. Equipment Migration Helper
        const migrateObject = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            const slots = Object.keys(obj);
            for (const slot of slots) {
                const item = obj[slot];
                if (!item) continue;

                // Normalize Item ID within the slot
                if (item.id) {
                    const newId = normalizeId(item.id);
                    if (newId !== item.id) {
                        item.id = newId;
                        changed = true;
                    }
                }

                // Normalize Slot Name
                const newSlot = normalizeSlot(slot);
                if (newSlot !== slot) {
                    console.log(`[MIGRATION-RUNE] Moving slot ${slot} -> ${newSlot} for ${char.name}`);
                    if (obj[newSlot]) {
                        // Conflict: move the encroached item back to inventory safely
                        console.log(`[RUNE-MIGRATION] Slot conflict at ${newSlot}. Dismantling/Moving to inventory.`);
                        this.gm.inventoryManager.addItemToInventory(char, item.id, 1, item);
                    } else {
                        obj[newSlot] = item;
                    }
                    delete obj[slot];
                    changed = true;
                }
            }
        };

        // 3. Execute migrations
        if (state.equipment) migrateObject(state.equipment);
        if (state.equipment_sets) {
            state.equipment_sets.forEach(set => migrateObject(set));
        }

        if (changed) {
            this.gm.markDirty(char.id);
            console.log(`[MIGRATION-RUNE] Character ${char.name} migrated to current standards.`);
        }
    }

    migrateTitles(char) {
        if (!char || !char.state) return;

        const NEW_TITLE = 'Pre-Alpha Player';
        const OLD_TITLE = 'Pré-alpha player';
        const state = char.state;

        if (!state.unlockedTitles) state.unlockedTitles = [];
        const before = JSON.stringify(state.unlockedTitles);

        // 1. Rename legacy title if exists
        state.unlockedTitles = state.unlockedTitles.map(t => t === OLD_TITLE ? NEW_TITLE : t);

        // 2. De-duplicate
        state.unlockedTitles = [...new Set(state.unlockedTitles)];

        const after = JSON.stringify(state.unlockedTitles);
        if (before !== after) {
            this.gm.markDirty(char.id);
        }
    }

    unifiedMigrationAndCleanup(char) {
        if (!char || !char.state) return;
        let changed = false;

        // 1. Ensure `active_buffs` is an object
        if (char.state.active_buffs && typeof char.state.active_buffs === 'string') {
            try {
                char.state.active_buffs = JSON.parse(char.state.active_buffs);
                changed = true;
                console.log(`[MIGRATION-CLEANUP] Parsed active_buffs string for ${char.name}`);
            } catch (e) {
                console.error(`[MIGRATION-CLEANUP] Failed to parse active_buffs for ${char.name}:`, e);
                char.state.active_buffs = {}; // Default to empty object on parse error
                changed = true;
            }
        } else if (!char.state.active_buffs) {
            char.state.active_buffs = {};
            changed = true;
        }

        // 2. Ensure `unlockedTitles` is an array
        if (!Array.isArray(char.state.unlockedTitles)) {
            console.log(`[MIGRATION-CLEANUP] Converting unlockedTitles to array for ${char.name}`);
            char.state.unlockedTitles = [];
            changed = true;
        }

        // 3. Ensure `skills` object is complete
        // Skip calling INITIAL_SKILLS here, GameManager will handle it or we import it.
        // Actually I should import it here too to keep it modular.
        
        // 4. Clean up legacy stats fields
        if (char.state.stats) {
            if ('str' in char.state.stats || 'agi' in char.state.stats || 'int' in char.state.stats) {
                delete char.state.stats.str;
                delete char.state.stats.agi;
                delete char.state.stats.int;
                changed = true;
                console.log(`[MIGRATION-CLEANUP] Removed legacy stats fields for ${char.name}`);
            }
        } else {
            char.state.stats = {}; // Ensure stats object exists
            changed = true;
        }

        // 5. Migrate Chests
        if (char.state.inventory) {
            const inv = char.state.inventory;
            for (const key of Object.keys(inv)) {
                let newKey = key;
                if (key.includes('_CHEST_COMMON')) newKey = key.replace('_CHEST_COMMON', '_CHEST_NORMAL');
                else if (key.includes('_CHEST_RARE')) newKey = key.replace('_CHEST_RARE', '_CHEST_OUTSTANDING');
                else if (key.includes('_CHEST_GOLD')) newKey = key.replace('_CHEST_GOLD', '_CHEST_EXCELLENT');
                else if (key.includes('_CHEST_MYTHIC')) newKey = key.replace('_CHEST_MYTHIC', '_CHEST_MASTERPIECE');
                else if (key.includes('_DUNGEON_CHEST')) newKey = key.replace('_DUNGEON_CHEST', '_CHEST_NORMAL');

                if (newKey !== key) {
                    console.log(`[MIGRATION-CLEANUP] Converting inventory chest ${key} -> ${newKey} for ${char.name}`);
                    if (inv[newKey]) {
                        if (typeof inv[key] === 'number') inv[newKey] += inv[key];
                        else if (typeof inv[key] === 'object' && inv[key] !== null && 'qty' in inv[key]) inv[newKey].qty += inv[key].qty;
                    } else {
                        inv[newKey] = inv[key];
                    }
                    delete inv[key];
                    changed = true;
                }
            }
        }

        if (changed) {
            this.gm.markDirty(char.id);
            console.log(`[MIGRATION-CLEANUP] Character ${char.name} underwent unified cleanup.`);
        }
    }
    /**
     * Handles migrations that should happen AFTER catchup (e.g. shard conversion, membership sync).
     */
    processPostCatchupMigrations(data) {
        let migrationHappened = false;

        // Shard Migration Logic
        const inventory = data.inventory || data.state.inventory;
        if (inventory) {
            Object.keys(inventory).forEach(itemId => {
                if (itemId.includes('_RUNE_SHARD') && !itemId.startsWith('T1_')) {
                    const qty = inventory[itemId];
                    if (qty > 0) {
                        inventory['T1_RUNE_SHARD'] = (inventory['T1_RUNE_SHARD'] || 0) + qty;
                        delete inventory[itemId];
                        migrationHappened = true;
                        console.log(`[MIGRATION] Converted ${qty} of ${itemId} to T1_RUNE_SHARD for ${data.name}`);
                    }
                }
            });
        }

        // Membership Migration
        if (data.state.inventory?.['ETERNAL_MEMBERSHIP']) {
            const qty = data.state.inventory['ETERNAL_MEMBERSHIP'];
            data.state.inventory['MEMBERSHIP'] = (data.state.inventory['MEMBERSHIP'] || 0) + qty;
            delete data.state.inventory['ETERNAL_MEMBERSHIP'];
            migrationHappened = true;
            console.log(`[MIGRATION] Converted ${qty} ETERNAL_MEMBERSHIP to MEMBERSHIP for ${data.name}`);
        }

        return migrationHappened;
    }
}
