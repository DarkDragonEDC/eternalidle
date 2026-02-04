import { resolveItem } from '../../shared/items.js';

export const pruneState = (state) => {
    if (!state) return state;

    // 1. Prune Equipment
    if (state.equipment) {
        for (const slot in state.equipment) {
            const item = state.equipment[slot];
            if (item && item.id) {
                // Keep only essential properties
                state.equipment[slot] = {
                    id: item.id,
                    quality: item.quality || 0,
                    stars: item.stars || 0,
                    amount: item.amount || 1
                };
            }
        }
    }

    // 2. Prune Inventory (for items stored as objects)
    // Currently inventory is mostly ID: amount, but some runes might be objects if bugged
    // or if we decide to store quality there. We'll stick to ID: amount for now but keep it safe.
    if (state.inventory) {
        for (const id in state.inventory) {
            if (typeof state.inventory[id] === 'object' && state.inventory[id] !== null) {
                const item = state.inventory[id];
                state.inventory[id] = {
                    amount: item.amount || 1,
                    quality: item.quality || 0,
                    stars: item.stars || 0,
                    rarity: item.rarity
                };
            }
        }
    }


    // 3. Prune Skills
    if (state.skills) {
        for (const skill in state.skills) {
            if (state.skills[skill]) {
                delete state.skills[skill].nextLevelXp;
            }
        }
    }

    // 4. Prune Transactions (Keep last 20)
    if (state.crownTransactions && Array.isArray(state.crownTransactions)) {
        if (state.crownTransactions.length > 20) {
            state.crownTransactions = state.crownTransactions.slice(-20);
        }
    }

    // 5. Cleanup other redundancies
    delete state.maxHealth; // This is calculated from equipment/stats

    return state;
};

export const hydrateState = (state) => {
    if (!state) return state;

    // 1. Hydrate Equipment
    if (state.equipment) {
        for (const slot in state.equipment) {
            const pruned = state.equipment[slot];
            if (pruned && pruned.id) {
                const fullItem = resolveItem(pruned.id, pruned.quality);
                if (fullItem) {
                    state.equipment[slot] = {
                        ...fullItem,
                        stars: pruned.stars || fullItem.stars || 0,
                        amount: pruned.amount || 1
                    };
                }
            }
        }
    }

    // 2. Hydrate Skills (ensure structure)
    // nextLevelXp can remain null or be calculated if needed, 
    // but usually the client calculates it or server does it on level up.

    return state;
};
