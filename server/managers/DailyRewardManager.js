import { ITEMS } from '../../shared/items.js';
import { getStoreItem } from '../../shared/orbStore.js';

const LOOT_TABLE = [
    // COMMON (60.30%)
    { id: 'T3_POTION_GOLD', qty: 2, chance: 0.3015, type: 'ITEM' },
    { id: 'T3_POTION_XP', qty: 2, chance: 0.3015, type: 'ITEM' },

    // UNCOMMON (34.00%)
    { id: 'T1_RUNE_SHARD', qty: 500, chance: 0.17, type: 'ITEM' },
    { id: 'T5_FOOD', qty: 100, chance: 0.17, type: 'ITEM' },

    // RARE (5.00%)
    { id: 'ORBS', qty: 25, chance: 0.05, type: 'CURRENCY' },

    // LEGENDARY (0.70%)
    { id: 'T1_BATTLE_RUNE_SHARD', qty: 50, chance: 0.005, type: 'ITEM' },
    { id: 'ORBS', qty: 100, chance: 0.001, type: 'CURRENCY' },
    { id: 'MEMBERSHIP', qty: 1, chance: 0.001, type: 'STORE_ITEM' }
];

export class DailyRewardManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async canSpin(char) {
        if (!char.user_id) return false;
        if (char.state?.isIronman) return false;

        const { data, error } = await this.gameManager.supabase
            .from('daily_rewards')
            .select('last_spin')
            .eq('user_id', char.user_id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[DAILY] Error checking spin status:', error);
            return false;
        }

        if (!data) return true;

        const lastSpin = new Date(data.last_spin);
        const now = new Date();
        const lastDate = lastSpin.toISOString().split('T')[0];
        const nowDate = now.toISOString().split('T')[0];
        const canSpin = lastDate !== nowDate;
        return canSpin;
    }

    async spin(char) {
        const canSpin = await this.canSpin(char);
        if (!canSpin) {
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

        if (!reward) reward = LOOT_TABLE[0];

        // Process Reward
        let message = "";
        let rewardData = { ...reward };

        if (reward.type === 'ITEM') {
            this.gameManager.inventoryManager.addItemToInventory(char, reward.id, reward.qty);

            // Refined Friendly Name Logic
            let friendlyName = reward.id;
            if (reward.id === 'T1_RUNE_SHARD') friendlyName = 'Rune Shards';
            else if (reward.id === 'T1_BATTLE_RUNE_SHARD') friendlyName = 'Combat Shards';
            else if (reward.id === 'T5_FOOD') friendlyName = 'Food';
            else if (reward.id === 'T3_POTION_GOLD') friendlyName = 'Silver Potion';
            else {
                friendlyName = reward.id
                    .replace(/^T\d+_/, '') // Remove T1_
                    .replace(/_/g, ' ')    // Replace _ with space
                    .toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            message = `Won ${reward.qty}x ${friendlyName}`;
        } else if (reward.type === 'CURRENCY') {
            this.gameManager.orbsManager.addOrbs(char, reward.qty, 'DAILY_SPIN');
            message = `Won ${reward.qty} Orbs`;
        } else if (reward.type === 'STORE_ITEM') {
            this.gameManager.inventoryManager.addItemToInventory(char, reward.id, reward.qty);
            message = `Won ${reward.qty}x Membership!`;
        }

        // Update DB
        await this.gameManager.supabase
            .from('daily_rewards')
            .upsert({
                user_id: char.user_id,
                last_spin: new Date().toISOString()
            });

        await this.gameManager.saveState(char.id, char.state);

        return {
            success: true,
            reward: rewardData,
            rewardIndex: LOOT_TABLE.indexOf(reward),
            message: message
        };
    }
}
