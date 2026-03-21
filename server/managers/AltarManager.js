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
            console.log(`[AltarManager] New day detected (${today}), resetting altar progress.`);
            this.globalAltar.date = today;
            this.globalAltar.totalSilver = 0;
            this.globalAltar.lastNotifiedTier = 0;
            this._saveAltar();
        }
    }

    getAltarState(char) {
        this.checkDailyReset();
        const playerState = this._getPlayerState(char);
        return {
            global: this.globalAltar,
            player: playerState,
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

            char.state.silver -= amount;
            playerState.donated += amount;
            this.globalAltar.totalSilver += amount;

            this.gm.markDirty(char.id);
            this._saveAltar();

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

            if (playerState.donated < requiredDonation) {
                throw new Error(`You must donate at least ${requiredDonation.toLocaleString()} silver to activate Tier ${tierIndex} buff.`);
            }

            const tierKey = `tier${tierIndex}EndTime`;
            if (playerState[tierKey] && Date.now() < playerState[tierKey]) {
                throw new Error(`Tier ${tierIndex} buff is already active!`);
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
                console.log(`[AltarManager] New Global Tier Goal reached: Tier ${tierNum}! Broadcasting notifications.`);
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
