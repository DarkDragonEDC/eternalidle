export class UserManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.supabase = gameManager.supabase;
    }

    /**
     * Checks if a user is currently banned and returns the ban details.
     */
    async checkBan(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_bans')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error(`[BAN] Error checking ban for ${userId}:`, error);
                return null;
            }

            if (!data) return null;

            // Level 1: Warning (Never blocks login)
            if (data.ban_level === 1) return { level: 1, reason: data.reason, ack: data.ack };

            // Level 2: 24h Ban
            if (data.ban_level === 2) {
                const now = new Date();
                const bannedUntil = new Date(data.banned_until);
                if (now < bannedUntil) {
                    const remainingHours = Math.ceil((bannedUntil - now) / 3600000);
                    return {
                        level: 2,
                        reason: data.reason,
                        remaining: remainingHours,
                        banned_until: data.banned_until
                    };
                }
                return null; // Expired
            }

            // Level 3: Permanent
            if (data.ban_level === 3) return { level: 3, reason: data.reason };

            return null;
        } catch (err) {
            console.error(`[BAN] Exception in checkBan for ${userId}:`, err);
            return null;
        }
    }

    /**
     * Applies or upgrades a ban for a user.
     * Progression: 1 (Warning) -> 2 (24h) -> 3 (Permanent)
     */
    async applyBan(userId, reason, playerName = null) {
        try {
            const { data: currentBan } = await this.supabase
                .from('user_bans')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            let nextLevel = 1;
            let bannedUntil = null;

            if (currentBan) {
                nextLevel = Math.min(3, currentBan.ban_level + 1);
            }

            if (nextLevel === 2) {
                const tomorrow = new Date();
                tomorrow.setHours(tomorrow.getHours() + 24);
                bannedUntil = tomorrow.toISOString();
            }

            const { error } = await this.supabase
                .from('user_bans')
                .upsert({
                    user_id: userId,
                    player_name: playerName,
                    ban_level: nextLevel,
                    reason: reason,
                    banned_until: bannedUntil,
                    ack: false,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            console.log(`[BAN] Applied level ${nextLevel} ban to ${userId} (${playerName}). Reason: ${reason}`);
            return { success: true, level: nextLevel, bannedUntil };
        } catch (err) {
            console.error(`[BAN] Error applying ban to ${userId}:`, err);
            return { success: false, error: err.message };
        }
    }
}
