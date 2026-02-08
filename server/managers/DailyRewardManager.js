
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

    async canSpin(char) {
        if (!char.user_id) return false;

        const { data, error } = await this.gameManager.supabase
            .from('daily_rewards')
            .select('last_spin')
            .eq('user_id', char.user_id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[DAILY] Error checking spin status:', error);
            return false; // Fail safe? Or true? Let's assume false to prevent exploit on error
        }

        if (!data) return true; // No record means never spun

        const lastSpin = new Date(data.last_spin);
        const now = new Date();
        const lastDate = lastSpin.toISOString().split('T')[0];
        const nowDate = now.toISOString().split('T')[0];
        const canSpin = lastDate !== nowDate;
        console.log(`[DAILY] User ${char.user_id} spin check: lastDate=${lastDate}, nowDate=${nowDate}, canSpin=${canSpin}`);
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
            message = `Won ${reward.qty} Orbs`;
        } else if (reward.type === 'STORE_ITEM') {
            // Give Membership Item
            this.gameManager.inventoryManager.addItemToInventory(char, reward.id, reward.qty);
            message = `Won ${reward.qty}x Membership!`;
        }

        // Update DB - Account Level
        const { error } = await this.gameManager.supabase
            .from('daily_rewards')
            .upsert({
                user_id: char.user_id,
                last_spin: new Date().toISOString()
            });

        if (error) {
            console.error('[DAILY] Error saving spin state:', error);
            // We still return success because the player got the item, but they might get to spin again if DB fails.
            // Ideally we'd transact this but we can't easily here.
        }

        // Save char state for the item changes
        await this.gameManager.saveState(char.id, char.state);

        return {
            success: true,
            reward: rewardData,
            rewardIndex: LOOT_TABLE.indexOf(reward),
            message: message
        };
    }
}
