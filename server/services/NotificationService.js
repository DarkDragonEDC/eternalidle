export class NotificationService {
    constructor(gameManager) {
        this.gm = gameManager;
        this.supabase = gameManager.supabase;
    }

    get io() { return this.gm.io; }

    broadcast(event, data) {
        if (this.io) this.io.emit(event, data);
    }

    broadcastToUser(userId, event, data) {
        if (this.io) this.io.to(`user:${userId}`).emit(event, data);
    }

    async broadcastToCharacter(characterId, event, data) {
        if (!this.io) return;
        const { data: charData } = await this.supabase
            .from('characters')
            .select('user_id')
            .eq('id', characterId)
            .single();

        if (charData && charData.user_id) {
            this.io.to(`user:${charData.user_id}`).emit(event, data);
        }
    }

    async broadcastToGuild(guildId, event, data) {
        if (!this.io || !guildId) return;
        const { data: members } = await this.supabase
            .from('guild_members')
            .select('characters ( user_id )')
            .eq('guild_id', guildId);

        if (members) {
            members.forEach(m => {
                if (m.characters && m.characters.user_id) {
                    this.io.to(`user:${m.characters.user_id}`).emit(event, data);
                }
            });
        }
    }

    addNotification(char, type, message) {
        if (!char || !char.state) return;
        if (!char.state.notifications) char.state.notifications = [];
        
        let notification;
        if (typeof type === 'object' && type !== null) {
            notification = {
                id: Date.now() + Math.random(),
                timestamp: Date.now(),
                read: false,
                ...type
            };
        } else {
            notification = {
                id: Date.now() + Math.random(),
                type,
                message,
                timestamp: Date.now(),
                read: false
            };
        }

        char.state.notifications.unshift(notification);
        // Keep only last 10 for generic notifications to avoid bloat
        if (char.state.notifications.length > 10) {
            char.state.notifications = char.state.notifications.slice(0, 10);
        }
        
        this.gm.markDirty(char.id);
        this.broadcastToCharacter(char.id, 'new_notification', notification);
    }

    async addActionSummaryNotification(char, actionType, stats, itemSuffix = 'Summary') {
        const { itemsGained, xpGained, totalTime, kills, silverGained, elapsedTime, duplicationCount, autoRefineCount } = stats;

        let timeVal = totalTime || elapsedTime || 0;
        let timeStr = "";
        if (timeVal < 60) timeStr = `${Math.floor(timeVal)}s`;
        else if (timeVal < 3600) timeStr = `${Math.floor(timeVal / 60)}m ${Math.floor(timeVal % 60)}s`;
        else timeStr = `${Math.floor(timeVal / 3600)}h ${Math.floor((timeVal % 3600) / 60)}m`;

        let message = `📜 ${actionType} ${itemSuffix}\n`;
        message += `⌛ ${timeStr}`;

        if (duplicationCount) message += `\n🍀 x${duplicationCount} Duplication`;
        if (autoRefineCount) message += `\n⚒️ x${autoRefineCount} Auto-Refine`;

        if (kills) message += `\n💀 ${kills} Kills`;

        for (const [skill, xp] of Object.entries(xpGained || {})) {
            if (xp > 0) message += `\n✨ +${Math.floor(xp).toLocaleString()} ${skill.replace(/_/g, ' ')}`;
        }

        if (silverGained) message += `\n💰 +${Math.floor(silverGained).toLocaleString()} Silver`;

        const itemEntries = Object.entries(itemsGained || {});
        if (itemEntries.length > 0) {
            message += `\n📦 Loot:`;
            for (const [id, qty] of itemEntries) {
                message += `\n • ${qty}x ${id.replace(/_/g, ' ')}`;
            }
        }

        this.addNotification(char, 'SYSTEM', message);
    }

    scheduleMidnightTriggers() {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setUTCHours(24, 0, 1, 0); 

        const delay = nextMidnight.getTime() - now.getTime();
        console.log(`[SCHEDULER] Next midnight notifications (WB & Spin) scheduled in ${Math.floor(delay / 3600000)}h ${Math.floor((delay % 3600000) / 60000)}m.`);

        setTimeout(() => {
            this.checkMidnightTriggers();
            this.scheduleMidnightTriggers(); 
        }, delay);
    }

    async checkMidnightTriggers() {
        console.log('[PUSH] 00:00 UTC reached. Sending daily notifications...');
        try {
            const { data: subs, error } = await this.supabase
                .from('push_subscriptions')
                .select('user_id, settings');

            if (error || !subs || subs.length === 0) return;

            // 1. Daily Spin
            const spinUsers = [...new Set(subs.filter(s => s.settings?.push_daily_spin !== false).map(s => s.user_id))];
            for (const userId of spinUsers) {
                this.gm.pushManager.notifyUser(userId, 'push_daily_spin', 'Daily Spin Available! 🎡', 'Your daily reward is waiting for you in Eternal Idle.');
            }

            // 2. World Boss
            const wbUsers = [...new Set(subs.filter(s => s.settings?.push_world_boss !== false).map(s => s.user_id))];
            const bossName = "The Ancient Dragon";
            for (const userId of wbUsers) {
                this.gm.pushManager.notifyUser(userId, 'push_world_boss', 'World Boss Spawned! 🐉', `${bossName} is terrorizing the world. Join the fight!`, '/world_boss');
            }

            // 3. Guild Tasks
            const { data: guildMembers } = await this.supabase.from('guild_members').select('characters ( user_id )');
            if (guildMembers) {
                const guildUserIds = [...new Set(guildMembers.filter(m => m.characters && m.characters.user_id).map(m => m.characters.user_id))];
                const guildPushUsers = [...new Set(subs.filter(s => guildUserIds.includes(s.user_id) && s.settings?.push_guild_tasks !== false).map(s => s.user_id))];
                for (const userId of guildPushUsers) {
                    this.gm.pushManager.notifyUser(userId, 'push_guild_tasks', 'New Guild Tasks! 🛡️', 'Fresh daily tasks are available for your guild. Help your team and earn rewards!', '/guild');
                }
            }
            
            // 4. Midnight Event
            this.broadcast('midnight_trigger', { timestamp: new Date().toISOString() });
            if (this.gm.dailyRewardManager) this.gm.dailyRewardManager.resetDailyRewards();

        } catch (err) {
            console.error('[PUSH] Fatal error in checkMidnightTriggers:', err);
        }
    }
}
