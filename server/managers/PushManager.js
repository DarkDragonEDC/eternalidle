import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

export class PushManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;
        this.scheduledPushes = new Map(); // charId -> TimeoutID

        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;

        if (publicKey && privateKey) {
            webpush.setVapidDetails(
                'mailto:admin@eternalidle.com',
                publicKey,
                privateKey
            );
            console.log('[PUSH] VAPID details set successfully');
        } else {
            console.warn('[PUSH] VAPID keys missing in .env. Push notifications will not work.');
        }
    }

    async saveSubscription(userId, subscription, settings = null) {
        if (!userId || !subscription) return;

        const { endpoint, keys } = subscription;
        if (!endpoint || !keys) return;

        const { data, error } = await this.supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                settings: settings || undefined,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, endpoint' });

        if (error) {
            console.error('[PUSH] Error saving subscription:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    async getSubscriptions(userId) {
        const { data, error } = await this.supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('[PUSH] Error fetching subscriptions:', error);
            return [];
        }

        return data || [];
    }

    async sendNotification(userId, eventType, payload) {
        const subscriptions = await this.getSubscriptions(userId);
        if (subscriptions.length === 0) return;

        const results = [];
        for (const sub of subscriptions) {
            // Check if user has this notification type enabled
            const settings = sub.settings || {};
            if (settings[eventType] === false) continue;

            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
                results.push({ success: true, endpoint: sub.endpoint });
            } catch (error) {
                console.error(`[PUSH] Error sending to ${sub.endpoint}:`, error.statusCode);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription expired or unsubscribed
                    await this.removeSubscription(sub.id);
                }
                results.push({ success: false, endpoint: sub.endpoint, error: error.message });
            }
        }
        return results;
    }

    async removeSubscription(id) {
        await this.supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', id);
    }
    
    async notifyUser(userId, eventType, title, body, url = '/') {
        const payload = {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            url: url
        };
        return await this.sendNotification(userId, eventType, payload);
    }
    
    async updateSettings(userId, settings) {
        const { error } = await this.supabase
            .from('push_subscriptions')
            .update({ settings })
            .eq('user_id', userId);
            
        if (error) {
            console.error('[PUSH] Error updating settings:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    scheduleActivityNotification(char, delayInMs) {
        if (!char || !char.id || !char.user_id || delayInMs <= 0) return;

        // Cancel existing one first if any
        this.cancelActivityNotification(char.id);

        const timeoutId = setTimeout(async () => {
            console.log(`[PUSH-SCHEDULED] Activity finished for ${char.name}. Sending notification...`);
            await this.notifyUser(
                char.user_id,
                'push_activity_finished',
                'Activity Finished! ✅',
                `Your activity is complete. Tap to start a new one!`,
                '/activities'
            );
            this.scheduledPushes.delete(char.id);
        }, delayInMs);

        this.scheduledPushes.set(char.id, timeoutId);
        console.log(`[PUSH-SCHEDULED] Notification scheduled for ${char.name} in ${Math.floor(delayInMs / 1000)}s`);
    }

    cancelActivityNotification(charId) {
        if (this.scheduledPushes.has(charId)) {
            clearTimeout(this.scheduledPushes.get(charId));
            this.scheduledPushes.delete(charId);
            console.log(`[PUSH-SCHEDULED] Notification cancelled for character ${charId}`);
        }
    }
}
