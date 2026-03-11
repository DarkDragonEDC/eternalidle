export class BanManager {
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

            // Level 2: Temporary Ban
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

            // Level 3: Permanent Ban
            if (data.ban_level === 3) return { level: 3, reason: data.reason };

            return null;
        } catch (err) {
            console.error(`[BAN] Exception in checkBan for ${userId}:`, err);
            return null;
        }
    }

    async applyBan(userId, level, reason, durationHours = null) {
        try {
            const bannedUntil = durationHours ? new Date(Date.now() + durationHours * 3600000).toISOString() : null;
            
            const { error } = await this.supabase
                .from('user_bans')
                .upsert({
                    user_id: userId,
                    ban_level: level,
                    reason: reason,
                    banned_until: bannedUntil,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log(`[BAN] Applied level ${level} ban to user ${userId}. Reason: ${reason}`);
            return true;
        } catch (err) {
            console.error(`[BAN] Error applying ban to ${userId}:`, err);
            return false;
        }
    }
}
