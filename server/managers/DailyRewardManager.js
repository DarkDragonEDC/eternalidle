
import { ITEMS } from '../../shared/items.js';
import { getStoreItem } from '../../shared/crownStore.js';

const LOOT_TABLE = [
    // COMMON (50%)
    { id: 'T1_RUNE_SHARD', qty: 3000, chance: 0.25, type: 'ITEM' },
    { id: 'T5_FOOD', qty: 500, chance: 0.25, type: 'ITEM' },

    // UNCOMMON (40%)
    { id: 'T3_POTION_QUALITY', qty: 1, chance: 0.133, type: 'ITEM' },
    { id: 'T3_POTION_LUCK', qty: 1, chance: 0.133, type: 'ITEM' },
    { id: 'T3_POTION_XP', qty: 1, chance: 0.134, type: 'ITEM' },

    // RARE (9%)
    { id: 'CROWNS', qty: 25, chance: 0.09, type: 'CURRENCY' },

    // LEGENDARY (1%)
    { id: 'CROWNS', qty: 100, chance: 0.005, type: 'CURRENCY' }, // 0.5%
    { id: 'MEMBERSHIP', qty: 1, chance: 0.005, type: 'STORE_ITEM' } // 0.5%
];

export class DailyRewardManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    canSpin(char) {
        if (!char.state.daily_spin) return true;

        const lastSpin = new Date(char.state.daily_spin.last_spin_date);
        const now = new Date();

        // Reset at 00:00 UTC
        // We compare the ISO Date String part (YYYY-MM-DD)
        const lastDate = lastSpin.toISOString().split('T')[0];
        const nowDate = now.toISOString().split('T')[0];

        return lastDate !== nowDate;
    }

    async spin(char) {
        if (!this.canSpin(char)) {
            return { success: false, error: "Already spun today. Come back tomorrow!" };
        }

        // Roll
        const roll = Math.random();
        let cumulative = 0;
        let reward = null;

        for (const item of LOOT_TABLE) {
            cumulative += item.chance;
            if (roll < cumulative) {
                reward = item;
                break;
            }
        }

        // Fallback
        if (!reward) reward = LOOT_TABLE[0];

        // Process Reward
        let message = "";
        let rewardData = { ...reward };

        if (reward.type === 'ITEM') {
            this.gameManager.inventoryManager.addItemToInventory(char, reward.id, reward.qty);
            // Format Friendly Name
            const friendlyName = reward.id === 'T1_RUNE_SHARD' ? 'Rune Shards' :
                reward.id === 'T5_FOOD' ? 'Food' :
                    reward.id.replace(/_/g, ' ').replace('T3 POTION ', '') + ' Potion';

            message = `Won ${reward.qty}x ${friendlyName}`;
        } else if (reward.type === 'CURRENCY') {
            this.gameManager.crownsManager.addCrowns(char, reward.qty, 'DAILY_SPIN');
            message = `Won ${reward.qty} Crowns`;
        } else if (reward.type === 'STORE_ITEM') {
            // Give Membership Item
            this.gameManager.inventoryManager.addItemToInventory(char, reward.id, reward.qty);
            message = `Won ${reward.qty}x Membership!`;
        }

        // Update State
        char.state.daily_spin = {
            last_spin_date: new Date().toISOString(),
            total_spins: (char.state.daily_spin?.total_spins || 0) + 1
        };

        await this.gameManager.saveState(char.id, char.state);

        return {
            success: true,
            reward: rewardData,
            rewardIndex: LOOT_TABLE.indexOf(reward),
            message: message
        };
    }
}
