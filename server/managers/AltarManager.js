export class AltarManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.supabase = gameManager.supabase;
        this.globalAltar = { date: null, totalSilver: 0, lastNotifiedTier: 0 };
        this.TIERS = [2_000_000, 5_000_000, 10_000_000];
        this.MIN_DONATIONS = [2000, 5000, 10000];
        this.init();
    }

    async init() {
        try {
            const { data, error } = await this.supabase
                .from('global_altar')
                .select('*')
                .eq('id', 'global')
                .maybeSingle();
            
            if (data) {
                this.globalAltar.date = data.target_date;
                this.globalAltar.totalSilver = Number(data.total_silver) || 0;
                this.globalAltar.lastNotifiedTier = Number(data.last_notified_tier) || 0;
            }
        } catch (err) {
            console.error('[AltarManager] Error loading global altar:', err);
        }
        this.checkDailyReset();
    }

    async _saveAltar() {
        try {
            const targetDate = this.globalAltar.date || new Date().toISOString().split('T')[0];
            await this.supabase.from('global_altar').upsert({
                id: 'global',
                target_date: targetDate,
                total_silver: this.globalAltar.totalSilver,
                last_notified_tier: this.globalAltar.lastNotifiedTier,
                last_updated: new Date().toISOString()
            });
        } catch (err) {
            console.error('[AltarManager] Error saving global altar:', err);
        }
    }

    checkDailyReset() {
        const today = new Date().toISOString().split('T')[0];
        if (this.globalAltar.date !== today) {
            this.globalAltar.date = today;
            this.globalAltar.totalSilver = 0;
            this.globalAltar.lastNotifiedTier = 0;
            // NOTE: Do NOT call _saveAltar() here.
            // The DB reset is handled atomically by increment_altar_v3 on the next donation.
            // Saving here would overwrite the real accumulated total with 0 if the server
            // restarts mid-day or if there's a timezone mismatch.
        }
    }

    getAltarState(char) {
        this.checkDailyReset();
        const playerState = this._getPlayerState(char);
        return {
            global: this.globalAltar,
            player: {
                ...playerState,
                totalDonated: Number(char.ranking_altar_donated) || 0
            },
            tiers: this.TIERS,
            minDonations: this.MIN_DONATIONS
        };
    }

    _getPlayerState(char) {
        if (!char.state.altar) {
            char.state.altar = { date: null, donated: 0, tier1EndTime: null, tier2EndTime: null, tier3EndTime: null };
        }
        
        // Clean up legacy keys if they exist
        if (char.state.altar.buffActive !== undefined) delete char.state.altar.buffActive;
        if (char.state.altar.buffEndTime !== undefined) delete char.state.altar.buffEndTime;

        const today = new Date().toISOString().split('T')[0];
        if (char.state.altar.date !== today) {
            char.state.altar.date = today;
            char.state.altar.donated = 0;
            char.state.altar.tier1EndTime = null;
            char.state.altar.tier2EndTime = null;
            char.state.altar.tier3EndTime = null;
            this.gm.markDirty(char.id);
        }
        return char.state.altar;
    }

    async donate(userId, charId, amount) {
        amount = Math.floor(Number(amount));
        if (isNaN(amount) || amount <= 0) throw new Error("Invalid donation amount");

        return await this.gm.executeLocked(userId, 'altar_donate', async () => {
            const char = await this.gm.getCharacter(userId, charId);
            if (!char) throw new Error("Character not found");

            this.checkDailyReset();
            const playerState = this._getPlayerState(char);

            if ((char.state.silver || 0) < amount) {
                throw new Error("Not enough silver!");
            }

            // ATOMIC UPDATE: Use Postgres function to increment both global and player totals safely
            const today = new Date().toISOString().split('T')[0];
            const { data: rpcData, error: rpcError } = await this.supabase.rpc('increment_altar_v3', {
                char_id: charId,
                amount: amount,
                target_date_val: today
            });

            if (rpcError) {
                // Fail silently or handle at GMA level, per rules to avoid flooding logs
                throw new Error("Failed to process donation in database.");
            }

            // Sync memory with Atomic DB result
            const newGlobalTotal = Number(rpcData.new_global_total);
            const newPlayerRankingTotal = Number(rpcData.new_player_total);

            this.globalAltar.totalSilver = newGlobalTotal;
            this.globalAltar.date = today;
            
            // Deduct silver from character
            char.state.silver -= amount;
            
            // Update daily donation in playerState (retrieved from getPlayerState)
            playerState.donated += amount;

            // Sync all-time ranking value
            char.ranking_altar_donated = newPlayerRankingTotal;
            
            // Still update daily tracking in char.state (historical redundancy)
            if (!char.state.altar_total_donated) char.state.altar_total_donated = 0;
            char.state.altar_total_donated = newPlayerRankingTotal; // Keep in sync

            this.gm.markDirty(char.id);
            // We don't call this._saveAltar() here anymore as the RPC handled the global save atomically

            // Check if we reached a new tier and notify
            this._checkTierNotification();

            // Broadcast update to all clients
            this.gm.broadcast('altar_update', this.globalAltar);

            return this.getAltarState(char);
        });
    }

    async activateBuff(userId, charId, tierIndex) {
        return await this.gm.executeLocked(userId, 'altar_activate', async () => {
            if (!tierIndex || tierIndex < 1 || tierIndex > 3) {
                throw new Error("Invalid tier specified.");
            }

            const char = await this.gm.getCharacter(userId, charId);
            if (!char) throw new Error("Character not found");

            this.checkDailyReset();
            const playerState = this._getPlayerState(char);

            const requiredGoal = this.TIERS[tierIndex - 1];
            const requiredDonation = this.MIN_DONATIONS[tierIndex - 1];

            if (this.globalAltar.totalSilver < requiredGoal) {
                throw new Error(`Global goal of ${requiredGoal.toLocaleString()} not reached yet for Tier ${tierIndex}!`);
            }

            if ((Number(playerState.donated) || 0) < requiredDonation) {
                throw new Error(`You must have donated at least ${requiredDonation.toLocaleString()} silver today to activate Tier ${tierIndex} buff.`);
            }

            const tierKey = `tier${tierIndex}EndTime`;
            if (playerState[tierKey]) {
                throw new Error(`Tier ${tierIndex} buff can only be activated once per day!`);
            }

            // Activate 12h buff (caps at next midnight UTC)
            const tomorrow = new Date();
            tomorrow.setUTCHours(24, 0, 0, 0);
            
            playerState[tierKey] = Math.min(Date.now() + (12 * 60 * 60 * 1000), tomorrow.getTime());
            
            this.gm.markDirty(char.id);

            return this.getAltarState(char);
        });
    }

    _checkTierNotification() {
        for (let i = this.TIERS.length - 1; i >= 0; i--) {
            const tierNum = i + 1;
            const threshold = this.TIERS[i];

            if (this.globalAltar.totalSilver >= threshold && this.globalAltar.lastNotifiedTier < tierNum) {
                this.globalAltar.lastNotifiedTier = tierNum;
                this._saveAltar(); // Update notified tier in DB
                
                // Trigger push notification
                if (this.gm.notificationService) {
                    this.gm.notificationService.broadcastAltarTier(tierNum);
                }
                break; // Only notify once for the highest reached tier in this call
            }
        }
    }
}
