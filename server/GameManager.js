import crypto from 'crypto';
import { ITEMS, ALL_RUNE_TYPES, RUNES_BY_CATEGORY, ITEM_LOOKUP, resolveItem } from '../shared/items.js';
import { CHEST_DROP_TABLE, WORLDBOSS_DROP_TABLE, getChestRuneShardRange } from '../shared/chest_drops.js';
import { INITIAL_SKILLS, calculateNextLevelXP, XP_TABLE } from '../shared/skills.js';
import { STATION_BONUS_TABLE } from '../shared/guilds.js';
import { InventoryManager } from './managers/InventoryManager.js';
import { ActivityManager } from './managers/ActivityManager.js';
import { CombatManager } from './managers/CombatManager.js';
import { MarketManager } from './managers/MarketManager.js';
import { DungeonManager } from './managers/DungeonManager.js';
import { OrbsManager } from './managers/OrbsManager.js';
import { AdminManager } from './managers/AdminManager.js';
import { DailyRewardManager } from './managers/DailyRewardManager.js';
import { TradeManager } from './managers/TradeManager.js';
import { WorldBossManager } from './managers/WorldBossManager.js';
import { SocialManager } from './managers/SocialManager.js';
import { GuildManager } from './managers/GuildManager.js';
import { PushManager } from './managers/PushManager.js';
import { pruneState, hydrateState } from './utils/statePruner.js';

// Removed local ITEM_LOOKUP generation in favor of shared source of truth


export class GameManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.inventoryManager = new InventoryManager(this);
        this.activityManager = new ActivityManager(this);
        this.combatManager = new CombatManager(this);
        this.marketManager = new MarketManager(this);
        this.dungeonManager = new DungeonManager(this);
        this.orbsManager = new OrbsManager(this);
        this.adminManager = new AdminManager(this);
        this.dailyRewardManager = new DailyRewardManager(this);
        this.tradeManager = new TradeManager(this);
        this.worldBossManager = new WorldBossManager(this);
        this.socialManager = new SocialManager(this);
        this.guildManager = new GuildManager(this);
        this.pushManager = new PushManager(this);
        this.userLocks = new Map(); // userId -> Promise (current task)
        this.cache = new Map(); // charId -> character object
        this.dirty = new Set(); // set of charIds that need persisting
        this.globalStats = null;
        this.leaderboardCache = new Map(); // type+mode -> { data, timestamp }
        this.LEADERBOARD_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms
        this.guildBonusesCache = new Map(); // guildId -> { bonuses, timestamp }

        // Load Global Stats initially (Store promise to avoid race conditions)
        this.statsPromise = this.loadGlobalStats();

        // Periodic Persistence Loop (Every 60 seconds) - REDUNDANT (Handled by index.js every 15s)
        /*
        setInterval(async () => {
            try {
                await this.flushDirtyCharacters();
                await this.loadGlobalStats(); // Keep global stats in sync
            } catch (err) {
                console.error('[DB] Error in periodic flush loop:', err);
            }
        }, 60000);
        */

        // At least keep loadGlobalStats in sync
        setInterval(async () => {
            await this.loadGlobalStats();
            if (this.onGlobalStatsUpdate && this.globalStats) {
                this.onGlobalStatsUpdate(this.globalStats);
            }
        }, 1800000); // 30 mins is enough for tax stats

        // 24h Snapshot Check (Every hour)
        setInterval(() => this.checkTaxSnapshot(), 3600000);
        setTimeout(() => this.checkTaxSnapshot(), 5000); // Check once shortly after startup

        // Push notification scheduler (Midnight UTC check)
        this.scheduleMidnightTriggers();

        this.worldBossManager.initialize();

        // All migrations are now handled per-login in getCharacter -> _migrateCharacter
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

    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    broadcastToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }

    setSocketServer(io) {
        this.io = io;
    }

    async broadcastToCharacter(characterId, event, data) {
        if (!this.io) return;

        // Find if character is online (associated with a socket)
        // Note: index.js joins sockets to 'user:userId' rooms.
        // We need to know the userId of this character.
        const { data: charData } = await this.supabase
            .from('characters')
            .select('user_id')
            .eq('id', characterId)
            .single();

        if (charData && charData.user_id) {
            this.io.to(`user:${charData.user_id}`).emit(event, data);
        }
    }

    scheduleMidnightTriggers() {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setUTCHours(24, 0, 1, 0); // Next day at 00:00:01 UTC

        const delay = nextMidnight.getTime() - now.getTime();

        console.log(`[SCHEDULER] Next midnight notifications (WB & Spin) scheduled in ${Math.floor(delay / 3600000)}h ${Math.floor((delay % 3600000) / 60000)}m.`);

        setTimeout(() => {
            this.checkMidnightTriggers();
            this.scheduleMidnightTriggers(); // Schedule for the following day
        }, delay);
    }

    async checkMidnightTriggers() {
        console.log('[PUSH] 00:00 UTC reached. Sending daily notifications...');

        try {
            const { data: subs, error } = await this.supabase
                .from('push_subscriptions')
                .select('user_id, settings');

            if (error) {
                console.error('[PUSH] Error fetching subscriptions for midnight:', error);
                return;
            }

            if (!subs || subs.length === 0) return;

            // 1. Daily Spin Notifications
            const spinUsers = [...new Set(subs
                .filter(s => s.settings?.push_daily_spin !== false)
                .map(s => s.user_id))];

            console.log(`[PUSH] Notifying ${spinUsers.length} users about Daily Spin.`);
            for (const userId of spinUsers) {
                this.pushManager.notifyUser(
                    userId,
                    'push_daily_spin',
                    'Daily Spin Available! 🎡',
                    'Your daily reward is waiting for you in Eternal Idle.'
                );
            }

            // 2. World Boss Spawn Notifications (Since it always spawns at 00:00 UTC)
            const wbUsers = [...new Set(subs
                .filter(s => s.settings?.push_world_boss !== false)
                .map(s => s.user_id))];

            console.log(`[PUSH] Notifying ${wbUsers.length} users about World Boss Spawn.`);
            const bossName = "The Ancient Dragon"; // Hardcoded for fixed notification
            for (const userId of wbUsers) {
                this.pushManager.notifyUser(
                    userId,
                    'push_world_boss',
                    'World Boss Spawned! 🐉',
                    `${bossName} is terrorizing the world. Join the fight!`,
                    '/world_boss'
                );
            }

            // 3. Guild Tasks Reset Notifications
            const { data: guildMembers } = await this.supabase
                .from('guild_members')
                .select('characters ( user_id )');

            if (guildMembers) {
                const guildUserIds = [...new Set(guildMembers
                    .filter(m => m.characters && m.characters.user_id)
                    .map(m => m.characters.user_id))];

                const guildPushUsers = [...new Set(subs
                    .filter(s => guildUserIds.includes(s.user_id) && s.settings?.push_guild_tasks !== false)
                    .map(s => s.user_id))];

                console.log(`[PUSH] Notifying ${guildPushUsers.length} users about Guild Tasks reset.`);
                for (const userId of guildPushUsers) {
                    this.pushManager.notifyUser(
                        userId,
                        'push_guild_tasks',
                        'New Guild Tasks! 🛡️',
                        'Fresh daily tasks are available for your guild. Help your team and earn rewards!',
                        '/guild'
                    );
                }
            }

        } catch (err) {
            console.error('[PUSH] Fatal error in checkMidnightTriggers:', err);
        }
    }

    async broadcastToGuild(guildId, event, data) {
        if (!this.io || !guildId) return;

        // Find all users in the guild who are online
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

    async loadGlobalStats() {
        try {
            const { data, error } = await this.supabase
                .from('global_stats')
                .select('*')
                .eq('id', 'global')
                .maybeSingle();

            if (data) {
                this.globalStats = {
                    total_market_tax: Number(data.total_market_tax) || 0,
                    market_tax_total: Number(data.market_tax_total) || 0,
                    trade_tax_total: Number(data.trade_tax_total) || 0,
                    tax_24h_ago: Number(data.tax_24h_ago) || 0,
                    history: Array.isArray(data.history) ? data.history : []
                };

                // CRITICAL: If tax_24h_ago is 0 but we have a total, initialize the baseline 
                // so "Daily Increase" doesn't show the entire historical total.
                if (this.globalStats.tax_24h_ago === 0 && this.globalStats.total_market_tax > 0) {
                    console.log(`[GameManager] Initializing tax_24h_ago baseline to: ${this.globalStats.total_market_tax}`);
                    this.globalStats.tax_24h_ago = this.globalStats.total_market_tax;

                    // User Request: Redistribute historical total into 80% Market and 20% Trades to not look strange
                    if (this.globalStats.market_tax_total < 1000 && this.globalStats.trade_tax_total === 0) {
                        const total = this.globalStats.total_market_tax;
                        this.globalStats.market_tax_total = Math.floor(total * 0.80);
                        this.globalStats.trade_tax_total = Math.floor(total * 0.20);
                        console.log(`[GameManager] Redistributing historical tax: Market=${this.globalStats.market_tax_total}, Trades=${this.globalStats.trade_tax_total}`);
                    }

                    // Notify all clients IMMEDIATELY
                    if (this.onGlobalStatsUpdate) {
                        this.onGlobalStatsUpdate(this.globalStats);
                    }

                    // Persist this baseline and redistribution immediately
                    this.supabase
                        .from('global_stats')
                        .update({
                            tax_24h_ago: this.globalStats.tax_24h_ago,
                            market_tax_total: this.globalStats.market_tax_total,
                            trade_tax_total: this.globalStats.trade_tax_total,
                            last_snapshot_at: new Date().toISOString()
                        })
                        .eq('id', 'global')
                        .then(({ error }) => {
                            if (error) console.error('[DB] Error initializing tax baseline/redistribution:', error);
                        });
                }
            } else if (!error) {
                // Record is missing completely. Initialize it.
                console.log('[GameManager] Global stats record missing in DB. Initializing default...');
                this.globalStats = {
                    total_market_tax: 0,
                    market_tax_total: 0,
                    trade_tax_total: 0,
                    tax_24h_ago: 0,
                    history: []
                };

                await this.supabase
                    .from('global_stats')
                    .insert([{
                        id: 'global',
                        total_market_tax: 0,
                        market_tax_total: 0,
                        trade_tax_total: 0,
                        tax_24h_ago: 0,
                        history: [],
                        last_snapshot_at: new Date().toISOString()
                    }]);
            }
        } catch (err) {
            console.error('[DB] Error loading global stats:', err);
        }
    }

    async updateGlobalTax(amount, source = 'MARKET') {
        if (!amount || amount <= 0) return;

        try {
            // CRITICAL: Ensure stats are loaded before updating to prevent resetting to zero
            if (this.statsPromise) await this.statsPromise;

            if (!this.globalStats) {
                console.warn('[GameManager] Cannot update tax, globalStats not initialized even after load attempt.');
                return;
            }

            const taxAmount = Math.floor(amount);
            this.globalStats.total_market_tax += taxAmount;

            if (source === 'TRADE') {
                this.globalStats.trade_tax_total = (this.globalStats.trade_tax_total || 0) + taxAmount;
            } else {
                this.globalStats.market_tax_total = (this.globalStats.market_tax_total || 0) + taxAmount;
            }

            console.log(`[GameManager] Global stats updated. Source: ${source}, Amount: ${taxAmount}`);

            // Persist to DB
            // We'll update the total and the specific source
            const updateFields = {
                total_market_tax: this.globalStats.total_market_tax,
                updated_at: new Date().toISOString()
            };

            if (source === 'TRADE') {
                updateFields.trade_tax_total = this.globalStats.trade_tax_total;
            } else {
                updateFields.market_tax_total = this.globalStats.market_tax_total;
            }

            const { error } = await this.supabase
                .from('global_stats')
                .update(updateFields)
                .eq('id', 'global');

            if (error) console.error('[DB] Error updating global tax field:', error);

        } catch (err) {
            console.error('[DB] Error updating global tax:', err);
        }
    }

    async checkTaxSnapshot() {
        try {
            // Ensure stats are loaded
            if (this.statsPromise) await this.statsPromise;

            const { data, error } = await this.supabase
                .from('global_stats')
                .select('*')
                .eq('id', 'global')
                .single();

            if (error) return;

            const now = new Date();
            const lastSnapshotAt = data.last_snapshot_at ? new Date(data.last_snapshot_at) : null;

            // Determine if it's a new day in UTC (00:00 UTC Transition)
            const isNewDay = !lastSnapshotAt || (
                now.getUTCDate() !== lastSnapshotAt.getUTCDate() ||
                now.getUTCMonth() !== lastSnapshotAt.getUTCMonth() ||
                now.getUTCFullYear() !== lastSnapshotAt.getUTCFullYear()
            );

            if (isNewDay) {
                const newTotal = Number(data.total_market_tax) || 0;
                const oldTotal = Number(data.tax_24h_ago) || 0;
                const dailyIncrease = Math.max(0, newTotal - oldTotal);

                console.log(`[GameManager] Taking 24h tax snapshot. Increase: ${dailyIncrease}`);

                let history = Array.isArray(data.history) ? data.history : [];
                history.push({
                    date: now.toISOString(),
                    amount: dailyIncrease
                });

                // Keep last 7 days
                if (history.length > 7) history = history.slice(-7);

                await this.supabase
                    .from('global_stats')
                    .update({
                        tax_24h_ago: newTotal,
                        last_snapshot_at: now.toISOString(),
                        history: history
                    })
                    .eq('id', 'global');

                this.globalStats.tax_24h_ago = newTotal;
                this.globalStats.history = history;

                // Sync UI
                if (this.onGlobalStatsUpdate) {
                    this.onGlobalStatsUpdate(this.globalStats);
                }
            }
        } catch (err) {
            console.error('[GameManager] Error in checkTaxSnapshot:', err);
        }
    }

    async flushDirtyCharacters() {
        if (this.dirty.size === 0) return;
        console.log(`[DB] Periodic flush for ${this.dirty.size} characters...`);
        const ids = Array.from(this.dirty);
        for (const id of ids) {
            await this.persistCharacter(id);
        }
    }

    async executeLocked(userId, task) {
        if (!userId) return await task();

        // Get current lock for this user (or a resolved Promise if none)
        const currentLock = this.userLocks.get(userId) || Promise.resolve();

        // Create the next lock that waits for the previous one
        const nextLock = currentLock.then(async () => {
            try {
                return await task();
            } catch (err) {
                console.error(`[LOCK] Error executing task for user ${userId}:`, err);
                throw err;
            }
        }).finally(() => {
            // If this is the last lock in the queue, clear the Map
            if (this.userLocks.get(userId) === nextLock) {
                this.userLocks.delete(userId);
            }
        });

        this.userLocks.set(userId, nextLock);
        return nextLock;
    }

    isLocked(userId) {
        return this.userLocks.has(userId);
    }

    getMaxIdleTime(char) {
        const isPremium = char.state?.isPremium || char.state?.membership?.active;
        return (isPremium ? 12 : 8) * 60 * 60 * 1000;
    }

    calculateHash(state) {
        try {
            if (!state) return '';
            return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
        } catch (err) {
            console.error(`[HASH-ERROR] Failed to calculate hash:`, err.message);
            // Return a unique changing hash so it doesn't match the DB and forces a re-sync or save
            return 'error-' + Date.now() + '-' + Math.random();
        }
    }

    /**
     * Consolidates all rune and equipment migrations into a single pass.
     * Handles:
     * 1. Slot normalization (rune_TOOL_ -> rune_TOOLS_, SPEED -> AUTO, COPY -> DUPLIC)
     * 2. Item ID normalization (COPY -> DUPLIC, SPEED -> AUTO)
     * 3. Inventory migration (normalizing keys and merging quantities)
     * 4. Safe conflict handling (moving overlapping items back to inventory)
     */
    _migrateRunes(char) {
        if (!char || !char.state) return;
        const state = char.state;
        let changed = false;

        const normalizeId = (id) => {
            if (!id || typeof id !== 'string') return id;
            if (!id.includes('_RUNE_')) return id;
            let newId = id.toUpperCase();
            if (newId.includes('_COPY')) newId = newId.replace('_COPY', '_DUPLIC');
            if (newId.includes('_SPEED') && !newId.includes('ATTACK_SPEED')) newId = newId.replace('_SPEED', '_AUTO');
            if (newId.includes('_TOOL_')) newId = newId.replace('_TOOL_', '_TOOLS_');
            return newId;
        };

        const normalizeSlot = (slot) => {
            if (!slot || !slot.startsWith('rune_')) return slot;
            let newSlot = slot;
            if (newSlot.includes('_COPY')) newSlot = newSlot.replace('_COPY', '_DUPLIC');
            if (newSlot.includes('_SPEED') && !newSlot.includes('ATTACK_SPEED')) newSlot = newSlot.replace('_SPEED', '_AUTO');
            if (newSlot.startsWith('rune_TOOL_')) newSlot = newSlot.replace('rune_TOOL_', 'rune_TOOLS_');
            return newSlot;
        };

        // 1. Inventory Migration
        if (state.inventory) {
            const inv = state.inventory;
            const keys = Object.keys(inv);
            for (const key of keys) {
                const val = inv[key];
                const newKey = normalizeId(key);
                if (newKey !== key) {
                    console.log(`[MIGRATION-RUNE] Converting Inventory Rune: ${key} -> ${newKey} for ${char.name}`);
                    if (inv[newKey]) {
                        const oldQty = (typeof val === 'object' && val !== null) ? (Number(val.amount) || 0) : (Number(val) || 0);
                        if (typeof inv[newKey] === 'object' && inv[newKey] !== null) {
                            inv[newKey].amount = (Number(inv[newKey].amount) || 0) + oldQty;
                        } else {
                            inv[newKey] = (Number(inv[newKey]) || 0) + oldQty;
                        }
                    } else {
                        inv[newKey] = val;
                    }
                    delete inv[key];
                    changed = true;
                }
            }
        }

        // 2. Equipment Migration Helper
        const migrateObject = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            const slots = Object.keys(obj);
            for (const slot of slots) {
                const item = obj[slot];
                if (!item) continue;

                // Normalize Item ID within the slot
                if (item.id) {
                    const newId = normalizeId(item.id);
                    if (newId !== item.id) {
                        item.id = newId;
                        changed = true;
                    }
                }

                // Normalize Slot Name
                const newSlot = normalizeSlot(slot);
                if (newSlot !== slot) {
                    console.log(`[MIGRATION-RUNE] Moving slot ${slot} -> ${newSlot} for ${char.name}`);
                    if (obj[newSlot]) {
                        // Conflict: move the encroached item back to inventory safely
                        console.log(`[RUNE-MIGRATION] Slot conflict at ${newSlot}. Dismantling/Moving to inventory.`);
                        this.inventoryManager.addItemToInventory(char, item.id, 1, item);
                    } else {
                        obj[newSlot] = item;
                    }
                    delete obj[slot];
                    changed = true;
                }
            }
        };

        // 3. Execute migrations
        if (state.equipment) migrateObject(state.equipment);
        if (state.equipment_sets) {
            state.equipment_sets.forEach(set => migrateObject(set));
        }

        if (changed) {
            this.markDirty(char.id);
            console.log(`[MIGRATION-RUNE] Character ${char.name} migrated to current standards.`);
        }
    }

    markDirty(charId) {
        if (charId) this.dirty.add(charId);
    }

    /**
     * Entry point for all character data migrations.
     * Guaranteed to run once per login/load.
     */
    _migrateCharacter(char) {
        if (!char || !char.state) return;

        this._migrateRunes(char);
        this._migrateTitles(char);
        this._migrateShieldToSheath(char);
    }

    _migrateTitles(char) {
        if (!char || !char.state) return;

        const NEW_TITLE = 'Pre-Alpha Player';
        const OLD_TITLE = 'Pré-alpha player';
        const state = char.state;

        if (!state.unlockedTitles) state.unlockedTitles = [];
        const before = JSON.stringify(state.unlockedTitles);

        // 1. Rename legacy title if exists
        state.unlockedTitles = state.unlockedTitles.map(t => t === OLD_TITLE ? NEW_TITLE : t);

        // 2. Grant "Pre-Alpha Player" deactivated (Out of Pre-Alpha)
        // if (!state.unlockedTitles.includes(NEW_TITLE)) {
        //     console.log(`[MIGRATION-TITLE] Granting 'Pre-Alpha Player' title to ${char.name}`);
        //     state.unlockedTitles.push(NEW_TITLE);
        // }

        // 3. De-duplicate
        state.unlockedTitles = [...new Set(state.unlockedTitles)];

        const after = JSON.stringify(state.unlockedTitles);
        if (before !== after) {
            this.markDirty(char.id);
        }
    }

    _migrateShieldToSheath(char) {
        if (!char || !char.state) return;
        const state = char.state;
        let changed = false;

        // 1. Migrate Inventory
        if (state.inventory) {
            const inv = state.inventory;
            for (const key of Object.keys(inv)) {
                if (key.includes('SHIELD')) {
                    const newKey = key.replace('SHIELD', 'SHEATH');
                    console.log(`[MIGRATION-ITEM] Converting Inventory Item: ${key} -> ${newKey} for ${char.name}`);

                    if (inv[newKey]) {
                        // Merge quantities
                        const oldVal = inv[key];
                        const newVal = inv[newKey];
                        const oldQty = (typeof oldVal === 'object' && oldVal !== null) ? (Number(oldVal.amount) || 0) : (Number(oldVal) || 0);

                        if (typeof newVal === 'object' && newVal !== null) {
                            newVal.amount = (Number(newVal.amount) || 0) + oldQty;
                        } else {
                            inv[newKey] = (Number(newVal) || 0) + oldQty;
                        }
                    } else {
                        inv[newKey] = inv[key];
                    }
                    delete inv[key];
                    changed = true;
                }
            }
        }

        // 2. Migrate Equipment
        const migrateEq = (eq) => {
            if (!eq) return;
            for (const slot of Object.keys(eq)) {
                const item = eq[slot];
                if (item && item.id && item.id.includes('SHIELD')) {
                    const oldId = item.id;
                    item.id = item.id.replace('SHIELD', 'SHEATH');
                    if (item.name) item.name = item.name.replace('Shield', 'Sheath');
                    console.log(`[MIGRATION-ITEM] Converting Equipped Item in slot ${slot}: ${oldId} -> ${item.id} for ${char.name}`);
                    changed = true;
                }
            }
        };

        migrateEq(state.equipment);
        if (state.equipment_sets) {
            state.equipment_sets.forEach(set => migrateEq(set));
        }

        if (changed) {
            this.markDirty(char.id);
        }
    }

    /**
     * Performs a unified migration and cleanup pass on character data.
     * This is intended to be run once per character load/login to ensure data consistency.
     * It consolidates various smaller migrations and data integrity checks.
     */
    _unifiedMigrationAndCleanup(char) {
        if (!char || !char.state) return;
        let changed = false;

        // 1. Ensure `active_buffs` is an object
        if (char.state.active_buffs && typeof char.state.active_buffs === 'string') {
            try {
                char.state.active_buffs = JSON.parse(char.state.active_buffs);
                changed = true;
                console.log(`[MIGRATION-CLEANUP] Parsed active_buffs string for ${char.name}`);
            } catch (e) {
                console.error(`[MIGRATION-CLEANUP] Failed to parse active_buffs for ${char.name}:`, e);
                char.state.active_buffs = {}; // Default to empty object on parse error
                changed = true;
            }
        } else if (!char.state.active_buffs) {
            char.state.active_buffs = {};
            changed = true;
        }

        // 2. Ensure `unlockedTitles` is an array
        if (!Array.isArray(char.state.unlockedTitles)) {
            console.log(`[MIGRATION-CLEANUP] Converting unlockedTitles to array for ${char.name}`);
            char.state.unlockedTitles = [];
            changed = true;
        }

        // 3. Ensure `skills` object is complete
        if (!char.state.skills) {
            char.state.skills = { ...INITIAL_SKILLS };
            changed = true;
            console.log(`[MIGRATION-CLEANUP] Initialized missing skills for ${char.name}`);
        } else {
            for (const skillKey in INITIAL_SKILLS) {
                if (!char.state.skills[skillKey]) {
                    console.log(`[MIGRATION-CLEANUP] Adding missing skill ${skillKey} to char ${char.name}`);
                    char.state.skills[skillKey] = { ...INITIAL_SKILLS[skillKey] };
                    changed = true;
                }
            }
        }

        // 4. Clean up legacy stats fields
        if (char.state.stats) {
            if ('str' in char.state.stats || 'agi' in char.state.stats || 'int' in char.state.stats) {
                delete char.state.stats.str;
                delete char.state.stats.agi;
                delete char.state.stats.int;
                changed = true;
                console.log(`[MIGRATION-CLEANUP] Removed legacy stats fields for ${char.name}`);
            }
        } else {
            char.state.stats = {}; // Ensure stats object exists
            changed = true;
        }

        // 5. Migrate Chests (runtime migration to handle server overwrites)
        if (char.state.inventory) {
            const inv = char.state.inventory;
            for (const key of Object.keys(inv)) {
                let newKey = key;
                if (key.includes('_CHEST_COMMON')) newKey = key.replace('_CHEST_COMMON', '_CHEST_NORMAL');
                else if (key.includes('_CHEST_RARE')) newKey = key.replace('_CHEST_RARE', '_CHEST_OUTSTANDING');
                else if (key.includes('_CHEST_GOLD')) newKey = key.replace('_CHEST_GOLD', '_CHEST_EXCELLENT');
                else if (key.includes('_CHEST_MYTHIC')) newKey = key.replace('_CHEST_MYTHIC', '_CHEST_MASTERPIECE');
                else if (key.includes('_DUNGEON_CHEST')) newKey = key.replace('_DUNGEON_CHEST', '_CHEST_NORMAL');

                if (newKey !== key) {
                    console.log(`[MIGRATION-CLEANUP] Converting inventory chest ${key} -> ${newKey} for ${char.name}`);
                    if (inv[newKey]) {
                        // Merge quantities
                        if (typeof inv[key] === 'number') inv[newKey] += inv[key];
                        else if (typeof inv[key] === 'object' && inv[key] !== null && 'qty' in inv[key]) inv[newKey].qty += inv[key].qty;
                    } else {
                        inv[newKey] = inv[key];
                    }
                    delete inv[key];
                    changed = true;
                }
            }
        }

        if (changed) {
            this.markDirty(char.id);
            console.log(`[MIGRATION-CLEANUP] Character ${char.name} underwent unified cleanup.`);
        }
    }

    async getCharacter(userId, characterId = null, catchup = false, bypassCache = false) {
        // Guard Clause invalid IDs (undefined string, null, etc)
        if (!characterId || characterId === 'undefined' || characterId === 'null') return null;

        // Try Cache first
        let data = null;
        let fromCache = false;
        if (characterId && this.cache.has(characterId) && !bypassCache) {
            // console.log(`[CACHE] Hit for ${characterId}`);
            data = this.cache.get(characterId);
            fromCache = true;
            if (!catchup) {
                if (data && data.state && data.state.guild_id && !data.guild_bonuses) {
                    data.guild_bonuses = await this.getGuildBonuses(data.state.guild_id);
                }
                return data;
            }
        }

        if (!data) {
            let query = this.supabase
                .from('characters')
                .select('*');

            if (characterId) {
                query = query.eq('id', characterId);
                if (userId) query = query.eq('user_id', userId);
                query = query.single();
            } else {
                // Fallback for legacy calls or first load: get the first character
                if (!userId) throw new Error("userId is required when characterId is not provided");
                query = query.eq('user_id', userId).limit(1).maybeSingle();
            }

            const { data: dbData, error } = await query;
            if (error && error.code !== 'PGRST116') throw error;

            if (dbData) {
                data = dbData;
                // Always update cache when we fetch from DB (especially for bypassCache)
                this.cache.set(data.id, data);
            }
        }



        if (data) {
            if (!fromCache) {
                // Use the shared hydration helper to ensure consistent data structures
                this._hydrateCharacterFromRaw(data);
                if (data.state && data.state.guild_id) {
                    data.guild_bonuses = await this.getGuildBonuses(data.state.guild_id);
                }

                // Perform all character data migrations upon login/load
                this._migrateCharacter(data);

                // --- RETROACTIVE ACCOUNT-WIDE MEMBERSHIP SYNC ---
                // If this character doesn't have active membership, check if any OTHER character does
                const isMember = data.state?.membership?.active && data.state.membership.expiresAt > Date.now();
                if (!isMember && userId) {
                    const { data: otherChars } = await this.supabase
                        .from('characters')
                        .select('state, info')
                        .eq('user_id', userId)
                        .neq('id', data.id);

                    if (otherChars) {
                        const activeMem = otherChars.find(c => {
                            const m = c.state?.membership || c.info?.membership;
                            return m?.active && m?.expiresAt > Date.now();
                        });

                        if (activeMem) {
                            const mInfo = activeMem.state?.membership || activeMem.info?.membership;
                            console.log(`[MEMBERSHIP-SYNC] Retroactively syncing membership for ${data.name} from another character.`);

                            if (!data.state) data.state = {};
                            data.state.membership = { ...mInfo };

                            if (!data.state.active_buffs) data.state.active_buffs = {};
                            const buffs = typeof data.state.active_buffs === 'string'
                                ? JSON.parse(data.state.active_buffs)
                                : data.state.active_buffs;

                            buffs['MEMBERSHIP_BOOST'] = {
                                xpBonus: 0.10,
                                speedBonus: 0,
                                expiresAt: mInfo.expiresAt,
                                source: 'MEMBERSHIP'
                            };
                            data.state.active_buffs = buffs;

                            // Persist this change
                            await this.saveState(data.id, data.state);
                            this.markDirty(data.id);
                        }
                    }
                }
                // ------------------------------------------------

                // SPECIAL: Auto-grant "Pre-Alpha Player" title for all current players
                const CUTOFF_DATE = new Date('2026-02-18T23:59:59Z');
                const charCreatedAt = new Date(data.created_at);
                const NEW_TITLE = 'Pre-Alpha Player';
                const OLD_TITLE = 'Pré-alpha player';

                if (data.state) {
                    if (!data.state.unlockedTitles) data.state.unlockedTitles = [];

                    const before = JSON.stringify(data.state.unlockedTitles);

                    // 1. Migration: Rename old title if present (and handle multiple)
                    data.state.unlockedTitles = data.state.unlockedTitles.map(t => t === OLD_TITLE ? NEW_TITLE : t);

                    // 2. Auto-grant: Deactivated (Out of Pre-Alpha)
                    // if (charCreatedAt < CUTOFF_DATE && !data.state.unlockedTitles.includes(NEW_TITLE)) {
                    //     data.state.unlockedTitles.push(NEW_TITLE);
                    // }

                    // 3. Unique Cleanup
                    data.state.unlockedTitles = [...new Set(data.state.unlockedTitles)];

                    const after = JSON.stringify(data.state.unlockedTitles);
                    if (before !== after) {
                        this.dirty.add(data.id); // Mark for saving to DB
                    }
                }

                // Attach a snapshot hash of the DB state to detect external changes
                data.dbHash = this.calculateHash(data.state);
            }

            let updated = false;
            // Time variables for catchup logic
            const now = new Date();
            let lastSaved = data.last_saved ? new Date(data.last_saved).getTime() : now.getTime();
            if (isNaN(lastSaved)) {
                console.error(`[DATA-FIX] Invalid last_saved date for ${data.name} (${data.last_saved}). Resetting to Now.`);
                lastSaved = now.getTime();
            }
            let elapsedSeconds = (now.getTime() - lastSaved) / 1000;

            // Silenciar logs de catchup se o tempo for irrelevante (< 60s) e não houver atividade que exija processamento imediato
            const isSignificantCatchup = elapsedSeconds >= 60 || (data.current_activity && elapsedSeconds >= (data.current_activity.time_per_action || 3));

            // Simplified report structure for potential offline gains
            let finalReport = {
                elapsedTime: elapsedSeconds,
                totalTime: 0,
                itemsGained: {},
                xpGained: {},
                combat: null,
                duplicationCount: 0,
                autoRefineCount: 0
            };









            if (!data.state.notifications) {
                data.state.notifications = [];
                updated = true;
            }

            if (!data.state.claims) {
                data.state.claims = [];
                updated = true;
            }

            if (data.state.unlockedTitles) {
                // Remove legacy hardcoded titles if present
                const hardcoded = ['Lands Explorer', 'Rune Seeker', 'Dungeon Master', 'Resource Tycoon', 'Eternal Legend'];
                const originalLength = data.state.unlockedTitles.length;
                data.state.unlockedTitles = data.state.unlockedTitles.filter(t => !hardcoded.includes(t));
                if (data.state.unlockedTitles.length !== originalLength) {
                    updated = true;
                }
            }

            try {
                const needsHealing = (data.state.health || 0) < (this.inventoryManager.calculateStats(data).maxHP || 100) && (data.state.equipment?.food?.amount > 0);
                if (catchup && (data.current_activity || data.state.combat || data.state.dungeon || needsHealing) && data.last_saved) {
                    if (isSignificantCatchup) {
                        console.log(`[CATCHUP] ${data.name}: last_saved=${data.last_saved}, elapsed=${elapsedSeconds.toFixed(1)}s, hasActivity=${!!data.current_activity}, hasCombat=${!!data.state.combat}, needsHealing=${needsHealing}`);
                    }

                    if (data.current_activity && typeof data.current_activity === 'object' && data.activity_started_at) {
                        const timePerAction = data.current_activity.time_per_action || 3;
                        console.log(`[CATCHUP] ${data.name}: timePerAction=${timePerAction}s, elapsed=${elapsedSeconds.toFixed(1)}s, needsProcessing=${elapsedSeconds >= timePerAction}`);
                        if (elapsedSeconds >= timePerAction) {
                            const actionsPossible = Math.floor(elapsedSeconds / timePerAction);
                            const actionsToProcess = Math.min(actionsPossible, data.current_activity.actions_remaining);

                            console.log(`[CATCHUP] ${data.name}: actionsPossible=${actionsPossible}, remaining=${data.current_activity.actions_remaining}, toProcess=${actionsToProcess}`);

                            if (actionsToProcess > 0) {
                                const activityReport = await this.processBatchActions(data, actionsToProcess);
                                console.log(`[CATCHUP] ${data.name}: processed=${activityReport.processed}, items=${JSON.stringify(activityReport.itemsGained)}`);
                                if (activityReport.processed > 0) {
                                    // Always update state if anything happened
                                    updated = true;

                                    // FIX: Merge gains into the active session stats so "Stopped" reports are accurate
                                    if (data.current_activity && typeof data.current_activity === 'object') {
                                        if (!data.current_activity.sessionItems) data.current_activity.sessionItems = {};
                                        if (typeof data.current_activity.sessionXp === 'undefined') data.current_activity.sessionXp = 0;

                                        // Merge Items - SAFER LOGIC
                                        for (const [id, qty] of Object.entries(activityReport.itemsGained)) {
                                            const safeQty = Number(qty) || 1;
                                            const currentVal = data.current_activity.sessionItems[id];

                                            // Ensure we are working with a number
                                            let currentQty = 0;
                                            if (typeof currentVal === 'number') currentQty = currentVal;
                                            if (typeof currentVal === 'object' && currentVal !== null) currentQty = Number(currentVal.amount) || 0;

                                            data.current_activity.sessionItems[id] = currentQty + safeQty;
                                        }

                                        // Merge XP (sum all skills for session total)
                                        let totalXp = 0;
                                        for (const xp of Object.values(activityReport.xpGained)) {
                                            totalXp += Number(xp) || 0;
                                        }
                                        data.current_activity.sessionXp += totalXp;

                                        // Merge Counters
                                        data.current_activity.duplicationCount = (Number(data.current_activity.duplicationCount) || 0) + (activityReport.duplicationCount || 0);
                                        data.current_activity.autoRefineCount = (Number(data.current_activity.autoRefineCount) || 0) + (activityReport.autoRefineCount || 0);
                                    }

                                    // Only populate the visual report if it's significant (> 10s or gains items)
                                    if (activityReport.totalTime > 10 || Object.keys(activityReport.itemsGained).length > 0) {
                                        finalReport.totalTime += activityReport.totalTime;
                                        // Merge items
                                        for (const [id, qty] of Object.entries(activityReport.itemsGained)) {
                                            finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
                                        }
                                        // Merge XP
                                        for (const [skill, qty] of Object.entries(activityReport.xpGained)) {
                                            finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
                                        }

                                        finalReport.duplicationCount = (finalReport.duplicationCount || 0) + (activityReport.duplicationCount || 0);
                                        finalReport.autoRefineCount = (finalReport.autoRefineCount || 0) + (activityReport.autoRefineCount || 0);

                                        if (activityReport.stopReason) {
                                            finalReport.stopReason = activityReport.stopReason;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // FIX: Process combat INDEPENDENTLY (not else if) so both activity and combat can be processed
                    if (data.state.combat) {
                        console.log(`[CATCHUP] ${data.name}: Processing combat offline...`);
                        const stats = this.inventoryManager.calculateStats(data);
                        const atkSpeed = Number(stats.attackSpeed) || 1000;
                        const secondsPerRound = atkSpeed / 1000;

                        if (elapsedSeconds >= secondsPerRound) {
                            const maxIdleMs = this.getMaxIdleTime(data);
                            const maxEffectSeconds = Math.min(elapsedSeconds, maxIdleMs / 1000);

                            // --- CRITICAL FIX: Save log if character reached idle limit during offline time ---
                            if (elapsedSeconds * 1000 > maxIdleMs) {
                                console.log(`[CATCHUP-LIMIT] ${data.name}: Combat idle limit exceeded during catchup. Saving log.`);
                                try {
                                    await this.combatManager.saveCombatLog(data, 'FLEE');
                                } catch (e) {
                                    console.error(`[CATCHUP-SAVE-ERROR] Failed to save combat log for ${data.name}:`, e);
                                }
                            }

                            const maxRounds = Math.floor(maxEffectSeconds / secondsPerRound);
                            console.log(`[CATCHUP] ${data.name}: Combat maxRounds=${maxRounds}, atkSpeed=${atkSpeed}ms`);

                            if (maxRounds > 0) {
                                const combatReport = await this.processBatchCombat(data, maxRounds);
                                console.log(`[CATCHUP] ${data.name}: Combat processed=${combatReport.processedRounds}, kills=${combatReport.kills}`);
                                if (combatReport.processedRounds > 0) {
                                    updated = true;

                                    if (combatReport.totalTime > 10 || Object.keys(combatReport.itemsGained).length > 0) {
                                        finalReport.totalTime += combatReport.totalTime;
                                        finalReport.combat = {
                                            ...combatReport,
                                            monsterName: combatReport.monsterName
                                        };

                                        // Merge items
                                        for (const [id, qty] of Object.entries(combatReport.itemsGained)) {
                                            finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
                                        }
                                        // Merge XP
                                        for (const [skill, qty] of Object.entries(combatReport.xpGained)) {
                                            finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Process dungeon independently as well
                    if (data.state.dungeon) {
                        const maxIdleMs = this.getMaxIdleTime(data);

                        // --- CRITICAL FIX: Save log if dungeon idle limit exceeded ---
                        if (elapsedSeconds * 1000 > maxIdleMs) {
                            console.log(`[CATCHUP-LIMIT] ${data.name}: Dungeon idle limit exceeded during catchup. Saving log.`);
                            try {
                                await this.dungeonManager.saveDungeonLog(data, 'ABANDONED');
                            } catch (e) {
                                console.error(`[CATCHUP-SAVE-ERROR] Failed to save dungeon log for ${data.name}:`, e);
                            }
                        }

                        const dungeonReport = await this.processBatchDungeon(data, elapsedSeconds);
                        if (dungeonReport && dungeonReport.totalTime > 0) {
                            finalReport.totalTime += dungeonReport.totalTime;
                            finalReport.dungeon = dungeonReport;

                            // Merge items
                            for (const [id, qty] of Object.entries(dungeonReport.itemsGained)) {
                                finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
                            }
                            // Merge XP
                            for (const [skill, qty] of Object.entries(dungeonReport.xpGained)) {
                                finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
                            }
                            updated = true;
                        }
                    }
                    // Idle Healing: If any offline time remains, use it for healing if needed
                    let remainingSeconds = elapsedSeconds - finalReport.totalTime;
                    const canHealIdle = (data.state.health || 0) < (this.inventoryManager.calculateStats(data).maxHP || 100) && (data.state.equipment?.food?.amount > 0);

                    if (remainingSeconds >= 1 && canHealIdle) {
                        if (isSignificantCatchup) console.log(`[CATCHUP] ${data.name}: Starting idle healing. remainingSeconds=${remainingSeconds.toFixed(1)}, health=${data.state.health}`);
                        const startTimeTs = lastSaved + (finalReport.totalTime * 1000);
                        const ticks = Math.floor(remainingSeconds / 5);
                        let healedAny = false;

                        let ticksProcessed = 0;
                        for (let t = 0; t < ticks; t++) {
                            ticksProcessed = t + 1;
                            const virtualTime = startTimeTs + (t * 5000);
                            const healResult = this.processFood(data, virtualTime);

                            if (healResult.used) {
                                healedAny = true;
                                updated = true;
                                if (healResult.eaten) {
                                    finalReport.foodConsumed = (finalReport.foodConsumed || 0) + healResult.eaten;
                                }
                            }

                            // Stop condition: Full health or out of food
                            const currentMax = this.inventoryManager.calculateStats(data).maxHP || 100;
                            const isFull = (data.state.health || 0) >= currentMax;
                            const hasFood = (data.state.equipment?.food?.amount > 0);

                            if (isFull || !hasFood) {
                                break;
                            }
                        }

                        // Add the actual time processed in the healing phase to the total catchup time
                        finalReport.totalTime += (ticksProcessed * 5);

                        if (healedAny) {
                            console.log(`[CATCHUP] ${data.name}: Idle healing processed. New HP: ${data.state.health}, Food consumed: ${finalReport.foodConsumed}`);
                        }
                    }

                    // Update last_saved based on ACTUAL time processed, not wall-clock time
                    finalReport.totalTime = Math.min(finalReport.totalTime, elapsedSeconds);
                    const processedMs = Math.floor(finalReport.totalTime * 1000);
                    let nextSavedTimestamp = lastSaved + processedMs;

                    if (isNaN(nextSavedTimestamp) || !isFinite(nextSavedTimestamp)) {
                        console.error(`[CATCHUP-FIX] Invalid nextSavedTimestamp detected. lastSaved=${lastSaved}, processedMs=${processedMs}`);
                        nextSavedTimestamp = Date.now();
                    }

                    data.last_saved = new Date(nextSavedTimestamp).toISOString();

                    if (finalReport.totalTime > 0) {
                        console.log(`[CATCHUP] ${data.name} finished. Processed: ${finalReport.totalTime.toFixed(1)}s, Remaining in buffer: ${(elapsedSeconds - finalReport.totalTime).toFixed(1)}s. New last_saved: ${data.last_saved}`);
                    }

                    // Sync activity_started_at with actual progress to prevent timer drift in UI
                    if (data.current_activity && typeof data.current_activity === 'object' && data.activity_started_at) {
                        const { initial_quantity, actions_remaining, time_per_action } = data.current_activity;
                        const tpa = time_per_action || 3;

                        const iqty = initial_quantity || (actions_remaining + Math.floor(finalReport.totalTime / tpa));
                        const doneQty = Math.max(0, iqty - actions_remaining);
                        const elapsedVirtual = doneQty * tpa;

                        let newStartTs = nextSavedTimestamp - (elapsedVirtual * 1000);
                        if (isNaN(newStartTs) || !isFinite(newStartTs)) {
                            console.error(`[CATCHUP-FIX] Invalid newStartTs detected. elapsedVirtual=${elapsedVirtual}, doneQty=${doneQty}`);
                            newStartTs = nextSavedTimestamp;
                        }
                        data.activity_started_at = new Date(newStartTs).toISOString();

                        // Ensure initial_quantity is persisted if it was missing
                        if (!data.current_activity.initial_quantity) {
                            data.current_activity.initial_quantity = iqty;
                        }
                    }

                    // Add wall-clock elapsed time to report for UI accuracy
                    finalReport.elapsedTime = elapsedSeconds;

                    // Shard Migration Logic (inside catchup block because it uses elapsedSeconds logic/updated flag)
                    let migrationHappened = false;
                    Object.keys(data.state.inventory).forEach(itemId => {
                        if (itemId.includes('_RUNE_SHARD') && !itemId.startsWith('T1_')) {
                            const qty = data.state.inventory[itemId];
                            if (qty > 0) {
                                data.state.inventory['T1_RUNE_SHARD'] = (data.state.inventory['T1_RUNE_SHARD'] || 0) + qty;
                                delete data.state.inventory[itemId];
                                migrationHappened = true;
                                console.log(`[MIGRATION] Converted ${qty} of ${itemId} to T1_RUNE_SHARD for ${data.name}`);
                            }
                        }
                    });

                    // Membership Migration
                    if (data.state.inventory['ETERNAL_MEMBERSHIP']) {
                        const qty = data.state.inventory['ETERNAL_MEMBERSHIP'];
                        data.state.inventory['MEMBERSHIP'] = (data.state.inventory['MEMBERSHIP'] || 0) + qty;
                        delete data.state.inventory['ETERNAL_MEMBERSHIP'];
                        migrationHappened = true;
                        console.log(`[MIGRATION] Converted ${qty} ETERNAL_MEMBERSHIP to MEMBERSHIP for ${data.name}`);
                    }

                    if (migrationHappened) {
                        updated = true;
                    }

                    // Only show the modal if total catchup was significant (based on wall-clock time)
                    // and we haven't already generated one in this session
                    const hasNotableGains = elapsedSeconds > 60;

                    // --- GUILD XP OFFLINE INTEGRATION ---
                    if (data.state.guild_id && finalReport.totalTime > 0) {
                        let totalOfflineXp = 0;
                        for (const xp of Object.values(finalReport.xpGained || {})) {
                            totalOfflineXp += (Number(xp) || 0);
                        }
                        if (totalOfflineXp > 0) {
                            const guildXpToAdd = totalOfflineXp * 0.10;
                            if (this.guildManager && this.guildManager.addPendingGuildXP) {
                                this.guildManager.addPendingGuildXP(data.state.guild_id, guildXpToAdd, data.id);
                                console.log(`[CATCHUP] ${data.name} generated ${guildXpToAdd.toFixed(2)} Guild XP while offline.`);
                            }
                        }
                    }

                    if (hasNotableGains && !data._offlineReportSent) {
                        data.offlineReport = finalReport;
                        data._offlineReportSent = true; // In-memory only now; last_saved handles re-gen safety

                        this.addActionSummaryNotification(data, 'Offline Progress', {
                            itemsGained: finalReport.itemsGained,
                            xpGained: finalReport.xpGained,
                            totalTime: finalReport.totalTime,
                            elapsedTime: elapsedSeconds,
                            kills: finalReport.combat?.kills || 0,
                            silverGained: finalReport.combat?.silverGained || 0,
                            duplicationCount: finalReport.duplicationCount,
                            autoRefineCount: finalReport.autoRefineCount
                        });
                    }

                    if (updated || isSignificantCatchup) {
                        // CRITICAL: Update last_saved in cache so subsequent catchups don't
                        // re-process the same elapsed time
                        data.last_saved = new Date().toISOString();
                        // MUST cache BEFORE persist: persistCharacter reads from cache
                        this.cache.set(data.id, data);
                        this.markDirty(data.id);
                        await this.persistCharacter(data.id);
                    }
                } // End if (catchup)
            } catch (err) {
                console.error(`[CATCHUP-CRASH] Critical error processing character ${data.name}:`, err);
                const fs = await import('fs');
                fs.appendFileSync('catchup_errors.log', `[${new Date().toISOString()}] Error for ${data.name}: ${err.message}\n${err.stack}\n---\n`);
                // Continue despite catchup error to allow login
            }
        }
        return data;
    }


    /**
     * Clears the offline report from memory for a character once the client acknowledges it.
     */
    async acknowledgeOfflineReport(charId) {
        if (!charId) return;
        const char = this.cache.get(charId);
        if (char) {
            console.log(`[CATCHUP] Offline report acknowledged and cleared for ${char.name}`);
            delete char.offlineReport;
            if (char._offlineReportSent) {
                char._offlineReportSent = false;
                // No need to markDirty as this is no longer in state
            }
        }
    }

    removeFromCache(charId) {
        this.cache.delete(charId);
        this.dirty.delete(charId);
    }

    markDirty(charId) {
        if (!charId || charId === 'undefined' || charId === 'null') return;
        this.dirty.add(charId);
    }

    async persistCharacter(charId) {
        if (!charId || charId === 'undefined' || charId === 'null') return;
        if (!this.dirty.has(charId)) {
            // console.log(`[DB] Skipping persistence for ${charId} (not dirty)`);
            return;
        }
        const char = this.cache.get(charId);
        if (!char) return;

        // --- Optimistic Locking Check (DISABLED for Performance) ---
        // This was calling a SELECT before every UPDATE. 
        // With executeLocked handling concurrency, this is usually redundant.
        /*
        const { data: remote, error: fetchError } = await this.supabase
            .from('characters')
            .select('last_saved')
            .eq('id', charId)
            .single();
     
        if (!fetchError && remote && char.last_saved) {
            const dbTime = new Date(remote.last_saved).getTime();
            const cacheTime = new Date(char.last_saved).getTime();
     
            if (dbTime > cacheTime) {
                console.warn(`[DB] PERSISTENCE CONFLICT for ${char.name}! DB has newer data (${remote.last_saved}) than Cache (${char.last_saved}). Aborting save and clearing stale cache.`);
                this.dirty.delete(charId);
                this.cache.delete(charId);
                return;
            }
        }
        */

        // Create a pruned version of the state for storage
        const stateToPrune = JSON.parse(JSON.stringify(char.state));
        const prunedState = pruneState(stateToPrune);

        // INVENTORY MIGRATION: Extract inventory to its own column and remove from state JSON
        const inventoryToSave = prunedState.inventory || {};
        delete prunedState.inventory;

        // SKILLS MIGRATION: Extract skills to its own column and remove from state JSON
        const skillsToSave = prunedState.skills || {};
        delete prunedState.skills;

        // EQUIPMENT MIGRATION: Extract equipment to its own column and remove from state JSON
        const equipmentToSave = prunedState.equipment || {};
        delete prunedState.equipment;

        // INFO MIGRATION: Extract info fields to their own column and remove from state JSON
        const infoToSave = {
            stats: prunedState.stats || {},
            health: prunedState.health || 0,
            silver: prunedState.silver || 0,
            orbs: (prunedState.orbs !== undefined) ? prunedState.orbs : 0,
            crowns: (prunedState.orbs !== undefined) ? prunedState.orbs : 0, // Dual-support for compatibility
            membership: prunedState.membership || null,
            active_buffs: prunedState.active_buffs || {},
            inventorySlots: prunedState.inventorySlots || 30,
            extraInventorySlots: prunedState.extraInventorySlots || 0,
            unlockedTitles: prunedState.unlockedTitles || []
        };
        delete prunedState.stats;
        delete prunedState.health;
        delete prunedState.silver;
        delete prunedState.orbs;
        delete prunedState.crowns; // Migration: ensure legacy key is removed from state column
        delete prunedState.membership;
        delete prunedState.active_buffs;
        delete prunedState.inventorySlots;
        delete prunedState.extraInventorySlots;
        delete prunedState.unlockedTitles;

        // COMBAT MIGRATION: Extract combat to its own column and remove from state JSON
        const combatToSave = prunedState.combat || null;
        delete prunedState.combat;

        // DUNGEON MIGRATION: Extract dungeon to its own column and remove from state JSON
        const dungeonToSave = prunedState.dungeon || null;
        delete prunedState.dungeon;

        // BANK MIGRATION: Extract bank to its own column and remove from state JSON
        const bankToSave = prunedState.bank || char.state.bank || { items: {}, slots: 10 };
        delete prunedState.bank;

        // SETTINGS MIGRATION: Extract settings to its own column and remove from state JSON
        const settingsToSave = prunedState.settings || char.state.settings || {};
        delete prunedState.settings;

        const finalPrunedState = prunedState;

        // console.log(`[DB] Persisting character ${char.name} (${charId})`);
        const saveTime = new Date().toISOString();
        const { error } = await this.supabase
            .from('characters')
            .update({
                inventory: inventoryToSave,
                skills: skillsToSave,
                equipment: equipmentToSave,
                info: infoToSave,
                combat: combatToSave,
                dungeon: dungeonToSave,
                bank: bankToSave,
                settings: settingsToSave,
                // Fix for double nesting: ensure we don't save { state: { ... } } into the state column
                // Also removed 'bank' from here as it now has its own column
                state: (finalPrunedState && finalPrunedState.state) ? finalPrunedState.state : finalPrunedState,
                current_activity: char.current_activity,
                activity_started_at: char.activity_started_at,
                last_saved: saveTime // Use saveTime, not stale char.last_saved
            })
            .eq('id', charId);

        if (!error) {
            // Update raw columns on the cached object to stay in sync with state
            char.inventory = inventoryToSave;
            char.skills = skillsToSave;
            char.equipment = equipmentToSave;
            char.info = infoToSave;
            char.combat = combatToSave;
            char.dungeon = dungeonToSave;
            char.bank = bankToSave;
            char.settings = settingsToSave;

            // Update snapshot hash and last_saved after successful save
            char.last_saved = saveTime;
            char.dbHash = this.calculateHash(char.state);
            this.dirty.delete(charId);
        } else {
            console.error(`[DB] Error persisting ${char.name}:`, error);
        }
    }

    async syncWithDatabase(charId, userId = null) {
        if (!charId || charId === 'undefined' || charId === 'null') return false;
        const char = this.cache.get(charId);
        if (!char) return await this.getCharacter(userId, charId, false, true);

        const { data: dbChar, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', charId)
            .single();

        if (!error && dbChar) {
            const currentDbHash = this.calculateHash(dbChar.state);
            if (currentDbHash !== char.dbHash) {
                console.log(`[SYNC] Refreshing character ${char.name} from DB (Manual edit detected)`);
                // Clear dirty flag and overwrite with DB data
                this.dirty.delete(charId);

                // Hydrate before assigning
                dbChar.state = hydrateState(dbChar.state || {});

                // INVENTORY MIGRATION: Inject the separate inventory column back into state for runtime
                if (dbChar.inventory) {
                    dbChar.state.inventory = dbChar.inventory;
                } else if (!dbChar.state.inventory) {
                    dbChar.state.inventory = {};
                }

                // SKILLS MIGRATION: Inject the separate skills column back into state for runtime
                if (dbChar.skills) {
                    dbChar.state.skills = dbChar.skills;
                }

                // EQUIPMENT MIGRATION: Inject the separate equipment column back into state for runtime
                if (dbChar.equipment) {
                    dbChar.state.equipment = dbChar.equipment;
                }

                Object.assign(char, dbChar);
                char.dbHash = currentDbHash;
                return true;
            }
        }
        return false;
    }

    async persistAllDirty() {
        if (this.dirty.size === 0) return;
        // console.log(`[DB] Persisting ${this.dirty.size} dirty characters...`);
        const promises = Array.from(this.dirty).map(id => this.persistCharacter(id));
        await Promise.all(promises);
    }

    async processBatchActions(char, quantity) {
        const { type } = char.current_activity;
        const item = resolveItem(char.current_activity.item_id);
        if (!item) {
            console.warn(`[OFFLINE-FAIL] Item lookup failed for ${char.current_activity.item_id} during batch processing. Qty: ${quantity}`);
            return { processed: 0, itemsGained: {}, xpGained: {} };
        }

        const invBefore = char.state.inventory[item.id] || 0;
        // FIX: Robust logging for inventory values to detect [object Object] issues
        const logInvAfter = (invBefore && typeof invBefore === 'object') ? JSON.stringify(invBefore) : invBefore;
        console.log(`[BATCH] Starting ${quantity}x ${type} for ${item.id}. Inv before: ${logInvAfter}`);

        let processed = 0;
        let leveledUp = false;
        const itemsGained = {};
        const xpGained = {};
        let duplicationCount = 0;
        let autoRefineCount = 0;

        let stopReason = null;

        for (let i = 0; i < quantity; i++) {
            let result = null;
            switch (type) {
                case 'GATHERING': result = await this.activityManager.processGathering(char, item); break;
                case 'REFINING': result = await this.activityManager.processRefining(char, item); break;
                case 'CRAFTING': result = await this.activityManager.processCrafting(char, item); break;
            }

            if (result && !result.error) {
                processed++;
                if (result.leveledUp) leveledUp = true;
                if (result.itemGained) {
                    itemsGained[result.itemGained] = (itemsGained[result.itemGained] || 0) + (result.amountGained || 1);
                }
                if (result.refinedItemGained) {
                    itemsGained[result.refinedItemGained] = (itemsGained[result.refinedItemGained] || 0) + 1;
                }
                if (result.xpGained) {
                    const stats = this.inventoryManager.calculateStats(char);
                    const globalBonus = stats.globals?.xpYield || 0;
                    const catBonus = stats.xpBonus?.[type] || 0; // type is 'GATHERING', 'REFINING', etc.

                    const finalXp = Math.floor(result.xpGained * (1 + (globalBonus + catBonus) / 100));
                    xpGained[result.skillKey] = (xpGained[result.skillKey] || 0) + finalXp;
                }

                if (result.isDuplication) duplicationCount++;
                if (result.isAutoRefine || result.refinedItemGained) autoRefineCount++;
            } else {
                stopReason = result?.error || "Stopped Early";
                break;
            }
        }

        if (processed > 0) {
            const timePerAction = char.current_activity?.time_per_action || 3;
            char.current_activity.actions_remaining -= processed;
            // Advance next_action_at to be in sync with the end of processed time
            if (char.current_activity) {
                const timeProcessedMs = processed * timePerAction * 1000;
                char.current_activity.next_action_at = (char.current_activity.next_action_at || Date.now()) + timeProcessedMs;
            }

            if (char.current_activity.actions_remaining <= 0) {
                char.current_activity = null;
                char.activity_started_at = null;
            }

            const invAfter = char.state.inventory[item.id] || 0;
            console.log(`[BATCH] Finished ${processed}/${quantity} ${type}. Inv after: ${invAfter}`);
            return { processed, leveledUp, itemsGained, xpGained, totalTime: processed * timePerAction, stopReason, duplicationCount, autoRefineCount };
        }

        return { processed: 0, leveledUp: false, itemsGained: {}, xpGained: {}, totalTime: 0, stopReason };
    }

    async processBatchCombat(char, rounds) {
        let kills = 0;
        let combatXp = 0;
        let silverGained = 0;
        const itemsGained = {};
        let died = false;
        let foodConsumed = 0;

        const stats = this.inventoryManager.calculateStats(char);
        const atkSpeed = Number(stats.attackSpeed) || 1000;
        const monsterName = char.state.combat?.mobName || "Unknown Monster";

        // FIX: Start simulation from the time the character was last saved (logout time), 
        // not from the beginning of the entire combat session.
        const startTime = char.last_saved ? new Date(char.last_saved).getTime() : Date.now();

        let roundsProcessed = 0;
        for (let i = 0; i < rounds; i++) {
            roundsProcessed = i + 1;
            // Simulated current time for this round
            const currentTime = startTime + (i * atkSpeed);

            // Check food before each round (reactive healing)
            const foodResult = this.processFood(char, currentTime);
            foodConsumed += foodResult.eaten || 0;

            const result = await this.combatManager.processCombatRound(char, currentTime);
            if (!result || !char.state.combat) {
                if (!char.state.combat && char.state.health <= 0) died = true;
                break;
            }

            // Also track food consumed DURING the round (between hits)
            if (result.details && result.details.foodEaten) {
                foodConsumed += result.details.foodEaten;
            }

            if (result.details) {
                if (result.details.victory) {
                    kills++;
                    combatXp += result.details.xpGained || 0;
                    silverGained += result.details.silverGained || 0;
                    if (result.details.lootGained) {
                        result.details.lootGained.forEach(lootEntry => {
                            // CombatManager returns loot as "Nx ITEM_ID" strings (e.g. "1x T1_WOOD")
                            const match = lootEntry.match(/^(\d+)x\s+(.+)$/);
                            if (match) {
                                const qty = parseInt(match[1]) || 1;
                                const actualId = match[2];
                                itemsGained[actualId] = (itemsGained[actualId] || 0) + qty;
                            } else {
                                // Fallback: treat the whole string as an item ID
                                itemsGained[lootEntry] = (itemsGained[lootEntry] || 0) + 1;
                            }
                        });
                    }

                    // FIX: Reset Mob Health for next fight
                    if (char.state.combat) {
                        char.state.combat.mobHealth = char.state.combat.mobMaxHealth || 100;
                    }

                    // FIX: Simulate Respawn Delay (1000ms)
                    // We skip 'N' rounds equivalent to 1s of time
                    // rounds = totalTime / atkSpeed
                    const roundsToSkip = Math.ceil(1000 / atkSpeed);
                    i += roundsToSkip;
                }
            }
        }

        // Hard limit cleanup
        const maxIdleMs = this.getMaxIdleTime(char);
        if ((roundsProcessed * atkSpeed) > maxIdleMs) {
            console.log(`[CATCHUP] Hard limit reached for ${char.name} in Combat. Clearing combat.`);
            delete char.state.combat;
        }

        // Sync next_attack_at and mob_next_attack_at to avoid instant attacks on login
        if (char.state.combat) {
            const totalTimeMs = roundsProcessed * atkSpeed;
            char.state.combat.next_attack_at = startTime + totalTimeMs;
            // Ensure mob is also synced
            if (char.state.combat.mob_next_attack_at < char.state.combat.next_attack_at) {
                char.state.combat.mob_next_attack_at = char.state.combat.next_attack_at + 500;
            }
        }

        return {
            processedRounds: roundsProcessed,
            kills,
            xpGained: { COMBAT: combatXp },
            silverGained,
            itemsGained,
            died,
            foodConsumed,
            totalTime: (roundsProcessed * atkSpeed) / 1000,
            monsterName
        };
    }

    async processBatchDungeon(char, seconds) {
        let remainingSeconds = seconds;
        const itemsGained = {};
        const xpGained = {};
        let dungeonsTotalCleared = 0;
        let died = false;

        let virtualNow = Date.now() - (seconds * 1000);

        while (remainingSeconds >= 1 && char.state.dungeon && !died) {
            const dungeonState = char.state.dungeon;

            // Optimization: If WALKING/EXPLORING, we could skip time, but processDungeonTick handles the logic now based on duration.
            // Pure duration based dungeons don't need wave-by-wave skipping anymore.


            const result = await this.dungeonManager.processDungeonTick(char, virtualNow);

            // Time consumption
            virtualNow += 1000;
            remainingSeconds -= 1;

            // Reactive Healing
            const foodResult = this.processFood(char, virtualNow);
            if (foodResult.used) {
                // Dungeon reports don't currently track food, but we should update it if it did
            }

            if (result && result.dungeonUpdate) {
                const status = result.dungeonUpdate.status;
                if (status === 'COMPLETED') {
                    dungeonsTotalCleared++;
                    const rewards = result.dungeonUpdate.rewards;
                    if (rewards) {
                        xpGained['DUNGEONEERING'] = (xpGained['DUNGEONEERING'] || 0) + (rewards.xp || 0);
                        if (rewards.items) {
                            rewards.items.forEach(itemStr => {
                                const match = itemStr.match(/^(\d+)x (.+)$/);
                                if (match) {
                                    const qty = parseInt(match[1]);
                                    const id = match[2];
                                    itemsGained[id] = (itemsGained[id] || 0) + qty;
                                } else {
                                    itemsGained[itemStr] = (itemsGained[itemStr] || 0) + 1;
                                }
                            });
                        }
                    }
                } else if (status === 'FAILED') {
                    died = true;
                }
            }
        }

        return {
            totalTime: seconds - remainingSeconds,
            itemsGained,
            xpGained,
            dungeonsTotalCleared,
            died
        };
    }

    async createCharacter(userId, name, isIronman = false) {
        console.log(`[SERVER] GameManager.createCharacter: "${name}", isIronman=${isIronman}`);
        // Check character limit
        const { data: chars, error: countError } = await this.supabase
            .from('characters')
            .select('id, state')
            .eq('user_id', userId);

        if (chars && chars.length >= 2) throw new Error("Character limit reached (max 2)");

        // Ensure only one of each mode
        if (chars) {
            const hasIronman = chars.some(c => c.state?.isIronman);
            const hasNormal = chars.some(c => !c.state?.isIronman);

            if (isIronman && hasIronman) throw new Error("You already have an Ironman character.");
            if (!isIronman && hasNormal) throw new Error("You already have a Normal character.");
        }

        // Check if name exists (case-insensitive)
        const { data: existingChar, error: nameError } = await this.supabase
            .from('characters')
            .select('id')
            .ilike('name', name.trim())
            .maybeSingle();

        if (existingChar) throw new Error("Character name already taken.");

        const initialState = {
            inventory: {},
            skills: { ...INITIAL_SKILLS },
            stats: { str: 0, agi: 0, int: 0 },
            silver: 0,
            notifications: [],
            unlockedTitles: [],
            isIronman: !!isIronman,
            tutorialStep: 'COMPLETED',
            theme: 'medieval'
        };

        // --- ACCOUNT-WIDE MEMBERSHIP INHERITANCE ---
        // Check if user has ANY other character with active membership
        const { data: existingChars, error: membershipError } = await this.supabase
            .from('characters')
            .select('state, info')
            .eq('user_id', userId);

        if (!membershipError && existingChars) {
            const activeMembershipChar = existingChars.find(c => {
                const membership = c.state?.membership || c.info?.membership;
                return membership?.active && membership?.expiresAt > Date.now();
            });
            if (activeMembershipChar) {
                const membershipInfo = activeMembershipChar.state?.membership || activeMembershipChar.info?.membership;
                initialState.membership = { ...membershipInfo };

                // Also copy the buff
                if (!initialState.active_buffs) initialState.active_buffs = {};
                initialState.active_buffs['MEMBERSHIP_BOOST'] = {
                    xpBonus: 0.10,
                    speedBonus: 0,
                    expiresAt: membershipInfo.expiresAt,
                    source: 'MEMBERSHIP'
                };
                console.log(`[CREATE-CHAR] Inheriting active membership for ${name} until ${new Date(membershipInfo.expiresAt).toLocaleDateString()}`);
            }
        }
        // ------------------------------------------

        // Add Noob Chest
        initialState.inventory['NOOB_CHEST'] = 1;

        // Calculate initial stats (HP) based on skills
        const tempChar = { state: initialState };
        const stats = this.inventoryManager.calculateStats(tempChar);

        initialState.health = stats.maxHP || 100;
        initialState.maxHealth = stats.maxHP || 100;

        console.log(`[SERVER] Final initialState.isIronman: ${initialState.isIronman}`);

        const inventory = initialState.inventory || {};
        delete initialState.inventory;

        const { data, error } = await this.supabase
            .from('characters')
            .insert({
                id: crypto.randomUUID(),
                user_id: userId,
                name: name.trim(),
                inventory: inventory,
                state: initialState,
                last_saved: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error("Character name already taken.");
            }
            throw new Error(error.message || 'Error creating character');
        }

        if (data) {
            this.cache.set(data.id, data);
        }
        return data;
    }

    async deleteCharacter(userId, characterId) {
        if (!characterId || characterId === 'undefined' || characterId === 'null') return;
        // 1. Verify existence and ownership
        const { data: char, error: fetchError } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !char) throw new Error("Character not found or access denied.");

        // 2. Cleanup related data (Fail-safe for missing CASCADE DELETE)
        await Promise.all([
            this.supabase.from('combat_history').delete().eq('character_id', characterId),
            this.supabase.from('dungeon_history').delete().eq('character_id', characterId),
            this.supabase.from('world_boss_attempts').delete().eq('character_id', characterId),
            this.supabase.from('market_listings').delete().eq('seller_id', userId).eq('seller_name', char.name)
        ]);

        // 3. Delete from database
        const { error: deleteError } = await this.supabase
            .from('characters')
            .delete()
            .eq('id', characterId)
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // 4. Remove from cache
        this.cache.delete(characterId);

        return { success: true };
    }

    async getStatus(userId, catchup = false, characterId = null, bypassCache = false) {
        // OPTIMIZATION: Interactive actions should NOT trigger catchup (it's for login/ticker)
        // to avoid race conditions and unnecessary DB load.
        const char = await this.getCharacter(userId, characterId, catchup, bypassCache);
        if (!char) return { noCharacter: true };

        // Check if resting heal is complete
        if (char.state?.resting) {
            const now = Date.now();
            if (now >= char.state.resting.endsAt) {
                // Apply heal
                const stats = this.inventoryManager.calculateStats(char);
                const maxHp = stats.maxHP || 100;
                char.state.health = Math.min(maxHp, (char.state.health || 0) + char.state.resting.healAmount);
                console.log(`[REST] ${char.name} resting complete: healed ${char.state.resting.healAmount} HP`);
                delete char.state.resting;
                this.markDirty(char.id);
            }
        }

        const stats = this.inventoryManager.calculateStats(char);

        const ban = await this.checkBan(userId);

        const status = {
            character_id: char.id,
            user_id: char.user_id,
            name: char.name,
            state: char.state,
            calculatedStats: stats,
            current_activity: char.current_activity,
            activity_started_at: char.activity_started_at,
            dungeon_state: char.state.dungeon,
            globalStats: this.globalStats,
            serverTime: Date.now(),
            guild: await this.guildManager.getCharacterGuild(characterId || char.id),
            guild_bonuses: char.guild_bonuses,
            banWarning: (ban && ban.level === 1 && !ban.ack) ? ban.reason : null
        };

        return status;
    }

    async acknowledgeBanWarning(userId) {
        try {
            const { error } = await this.supabase
                .from('user_bans')
                .update({ ack: true })
                .eq('user_id', userId);

            if (error) throw error;
            console.log(`[BAN] User ${userId} acknowledged their warning.`);
            return { success: true };
        } catch (err) {
            console.error(`[BAN] Error acknowledging warning for ${userId}:`, err);
            return { success: false, error: err.message };
        }
    }

    async clearOfflineReport(userId, characterId) {
        await this.executeLocked(userId, async () => {
            const char = await this.getCharacter(userId, characterId);
            if (char) {
                char.offlineReport = null;
                if (char.state._offlineReportSent) {
                    char.state._offlineReportSent = false;
                    this.markDirty(charId);
                }
            }
        });
    }

    async runMaintenance() {
        const nowMs = Date.now();
        console.log(`[MAINTENANCE] Starting background cleanup (Dynamic Limits 8h/12h)...`);

        try {
            // Find all characters with any active activity
            const { data: allActive, error } = await this.supabase
                .from('characters')
                .select('id, user_id, name, current_activity, state, activity_started_at, combat, dungeon, info')
                .or('current_activity.not.is.null,combat.not.is.null,dungeon.not.is.null');

            if (error) throw error;

            if (!allActive || allActive.length === 0) {
                console.log("[MAINTENANCE] No active characters found.");
                return;
            }

            // Inject combat/dungeon back into state for compatibility and hydrate info
            allActive.forEach(char => {
                this._hydrateCharacterFromRaw(char);
            });

            const toCleanup = allActive.filter(char => {
                const limitMs = this.getMaxIdleTime(char);

                // Check each activity independently — if ANY exceeds the limit, the char needs cleanup
                const combatStart = char.state.combat?.started_at ? new Date(char.state.combat.started_at).getTime() : null;
                const dungeonStart = char.state.dungeon?.started_at ? new Date(char.state.dungeon.started_at).getTime() : null;
                const activityStart = (char.current_activity && char.activity_started_at) ? new Date(char.activity_started_at).getTime() : null;

                const combatExceeded = combatStart && (nowMs - combatStart > limitMs);
                const dungeonExceeded = dungeonStart && (nowMs - dungeonStart > limitMs);
                const activityExceeded = activityStart && (nowMs - activityStart > limitMs);

                return combatExceeded || dungeonExceeded || activityExceeded;
            });

            if (toCleanup.length === 0) {
                console.log("[MAINTENANCE] No characters found exceeding their respective idle limits.");
                return;
            }

            console.log(`[MAINTENANCE] Found ${toCleanup.length} characters to clean up.`);

            for (const char of toCleanup) {
                console.log(`[MAINTENANCE] Cleaning up ${char.name} (${char.id})...`);
                // Calling getCharacter with catchup=true will process gains up to limit
                await this.executeLocked(char.user_id, async () => {
                    const fullChar = await this.getCharacter(char.user_id, char.id, true);

                    if (fullChar) {
                        const limitMs = this.getMaxIdleTime(fullChar);
                        let stopped = false;

                        // Stop ONLY the activities that individually exceeded their limit
                        if (fullChar.state.combat?.started_at) {
                            const combatAge = nowMs - new Date(fullChar.state.combat.started_at).getTime();
                            if (combatAge > limitMs) {
                                console.log(`[MAINTENANCE] Stopping combat for ${fullChar.name} (${Math.floor(combatAge / 3600000)}h exceeded limit)`);
                                await this.combatManager.stopCombat(fullChar.user_id, fullChar.id);
                                stopped = true;
                            }
                        }
                        if (fullChar.state.dungeon?.started_at) {
                            const dungeonAge = nowMs - new Date(fullChar.state.dungeon.started_at).getTime();
                            if (dungeonAge > limitMs) {
                                console.log(`[MAINTENANCE] Stopping dungeon for ${fullChar.name} (${Math.floor(dungeonAge / 3600000)}h exceeded limit)`);
                                await this.dungeonManager.stopDungeon(fullChar.user_id, fullChar.id);
                                stopped = true;
                            }
                        }
                        if (fullChar.current_activity && fullChar.activity_started_at) {
                            const activityAge = nowMs - new Date(fullChar.activity_started_at).getTime();
                            if (activityAge > limitMs) {
                                console.log(`[MAINTENANCE] Stopping activity for ${fullChar.name} (${Math.floor(activityAge / 3600000)}h exceeded limit)`);
                                await this.activityManager.stopActivity(fullChar.user_id, fullChar.id);
                                stopped = true;
                            }
                        }

                        if (stopped) {
                            console.log(`[MAINTENANCE] Character ${fullChar.name} cleanup complete.`);
                        }
                    }
                });
            }

            console.log("[MAINTENANCE] Background cleanup finished.");
        } catch (err) {
            console.error("[MAINTENANCE] Error during background cleanup:", err);
        }
    }

    async processTick(userId, characterId) {
        const char = await this.getCharacter(userId, characterId);
        if (!char) return null;

        // Sync last_saved for online characters to progress the catchup window
        char.last_saved = new Date().toISOString();

        const foodResult = this.processFood(char);
        const foodUsed = foodResult.used;

        // Don't skip processing if character needs healing (HP < max and has food)
        const needsHealing = char.state.equipment?.food?.amount > 0 &&
            (char.state.health || 0) < (this.inventoryManager.calculateStats(char).maxHP || 100);

        if (!char.current_activity && !char.state.combat && !foodUsed && !needsHealing && !char.state.dungeon && !this.worldBossManager.activeFights.has(char.id)) return null;

        const now = Date.now();
        const IDLE_LIMIT_MS = this.getMaxIdleTime(char);
        const limitHours = IDLE_LIMIT_MS / (60 * 60 * 1000);
        let hasChanges = false;

        // Independent Activity Limit Check
        if (char.current_activity && char.activity_started_at) {
            if (now - new Date(char.activity_started_at).getTime() > IDLE_LIMIT_MS) {
                console.log(`[LIMIT] ${limitHours}h activity limit reached for ${char.name}. Stopping activity.`);
                char.current_activity = null;
                char.activity_started_at = null;
                hasChanges = true;
            }
        }

        // Independent Combat Limit Check
        if (char.state.combat && char.state.combat.started_at) {
            if (now - new Date(char.state.combat.started_at).getTime() > IDLE_LIMIT_MS) {
                console.log(`[LIMIT] ${limitHours}h combat limit reached for ${char.name}. Stopping combat.`);

                // --- CRITICAL FIX: Save log before deleting state ---
                try {
                    await this.combatManager.saveCombatLog(char, 'FLEE'); // Or 'TIMEOUT' if you want a new outcome
                } catch (e) {
                    console.error(`[LIMIT-SAVE-ERROR] Failed to save combat log for ${char.name} on timeout:`, e);
                }

                delete char.state.combat;
                hasChanges = true;
            }
        }

        // Independent Dungeon Limit Check
        if (char.state.dungeon && char.state.dungeon.started_at) {
            if (now - new Date(char.state.dungeon.started_at).getTime() > IDLE_LIMIT_MS) {
                console.log(`[LIMIT] ${limitHours}h dungeon limit reached for ${char.name}. Stopping dungeon.`);

                // --- CRITICAL FIX: Save log before deleting state ---
                try {
                    await this.dungeonManager.saveDungeonLog(char, 'ABANDONED');
                } catch (e) {
                    console.error(`[LIMIT-SAVE-ERROR] Failed to save dungeon log for ${char.name} on timeout:`, e);
                }

                delete char.state.dungeon;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.markDirty(char.id);
            await this.persistCharacter(char.id);

            // If everything was stopped by the limit check, return early
            if (!char.current_activity && !char.state.combat && !char.state.dungeon) {
                return {
                    success: false,
                    message: `${limitHours}-hour idle limit reached. All actions stopped.`,
                    status: await this.getStatus(char.user_id, false, char.id)
                };
            }
        }
        let leveledUp = null;
        let itemsGained = 0;
        let lastActivityResult = null;
        let combatResult = null;
        let activityFinished = false;

        if (char.current_activity && typeof char.current_activity === 'object') {
            const { type, item_id, actions_remaining, time_per_action = 3, next_action_at } = char.current_activity;
            let targetTime = Number(next_action_at);
            if (!targetTime) {
                targetTime = now + (time_per_action * 1000);
                char.current_activity.next_action_at = targetTime;
            }

            if (now >= targetTime) {
                const item = resolveItem(item_id);
                if (!item) {
                    const diagMsg = `[${new Date().toISOString()}] PROCESSTICK-ERROR: item_id='${item_id}', ITEM_LOOKUP size=${Object.keys(ITEM_LOOKUP).length}, T1_POTION_DAMAGE=${ITEM_LOOKUP['T1_POTION_DAMAGE'] ? 'YES' : 'NO'}, charCodes=[${[...String(item_id)].map(c => c.charCodeAt(0)).join(',')}]\n`;
                    console.error(diagMsg);
                    try {
                        const fs = await import('fs');
                        fs.appendFileSync('activity_debug.log', diagMsg);
                    } catch (e) {
                        console.error("FAILED TO WRITE DEBUG LOG", e);
                    }
                    char.current_activity = null;
                    return { success: false, message: `Item not found: ${item_id}` };
                }

                if (actions_remaining > 0) {
                    let result = null;
                    try {
                        const normalizedType = type.toUpperCase();
                        switch (normalizedType) {
                            case 'GATHERING': result = await this.activityManager.processGathering(char, item); break;
                            case 'REFINING': result = await this.activityManager.processRefining(char, item); break;
                            case 'CRAFTING': result = await this.activityManager.processCrafting(char, item); break;
                        }
                        if (result && result.error) {
                            // console.log(`[ProcessTick] Activity Failed for ${char.name}: ${result.error}`);
                        } else if (result) {
                            // console.log(`[ProcessTick] Activity Success for ${char.name}: ${item.name} (${result.skillKey})`);
                        }
                    } catch (err) {
                        console.error(`[ProcessTick] Activity Error for ${char.name} (${type}, ${item_id}):`, err);
                        char.current_activity = null;
                        return { success: false, message: "Activity crashed: " + err.message };
                    }

                    char.current_activity.next_action_at = targetTime + (time_per_action * 1000);
                    if (now - char.current_activity.next_action_at > 5000) {
                        char.current_activity.next_action_at = now + (time_per_action * 1000);
                    }

                    if (result && !result.error) {
                        itemsGained++;
                        if (result.leveledUp) leveledUp = result.leveledUp;
                        lastActivityResult = result;

                        // Track session stats
                        const activity = char.current_activity;
                        if (activity) {
                            if (!activity.sessionItems) activity.sessionItems = {};
                            if (typeof activity.sessionXp === 'undefined') activity.sessionXp = 0;

                            if (result.itemGained) {
                                activity.sessionItems[result.itemGained] = (activity.sessionItems[result.itemGained] || 0) + (result.amountGained || 1);
                            }
                            if (result.refinedItemGained) {
                                activity.sessionItems[result.refinedItemGained] = (activity.sessionItems[result.refinedItemGained] || 0) + 1;
                            }
                            if (result.xpGained) {
                                const stats = this.inventoryManager.calculateStats(char);
                                const xpBonus = stats.globals?.xpYield || 0;
                                const finalXp = Math.floor(result.xpGained * (1 + xpBonus / 100));
                                activity.sessionXp = (activity.sessionXp || 0) + finalXp;
                            }
                        }

                        const newActionsRemaining = actions_remaining - 1;
                        // activity is already declared above
                        if (result.isDuplication) {
                            if (activity) activity.duplicationCount = (activity.duplicationCount || 0) + 1;
                            console.log(`[ACTIVITY-LOG] Duplication Hit! User=${char.name}, Item=${result.itemGained}, RemBefore=${actions_remaining}, RemAfter=${newActionsRemaining}`);
                        }
                        if (result.isAutoRefine || result.refinedItemGained) {
                            if (activity) activity.autoRefineCount = (activity.autoRefineCount || 0) + 1;
                        }

                        activityFinished = newActionsRemaining <= 0;
                        if (activityFinished) {
                            // Generate final report before clearing
                            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
                            this.addActionSummaryNotification(char, activity.type, {
                                itemsGained: activity.sessionItems,
                                xpGained: { [result.skillKey]: activity.sessionXp },
                                totalTime: elapsedSeconds,
                                duplicationCount: activity.duplicationCount,
                                autoRefineCount: activity.autoRefineCount
                            }, 'Summary');

                            // PUSH NOTIFICATION: Activity Finished
                            if (char.user_id) {
                                this.pushManager.notifyUser(
                                    char.user_id,
                                    'push_activity_finished',
                                    'Activity Finished! ✅',
                                    `Your ${activity.type.toLowerCase().replace('_', ' ')} activity is complete. Tap to start a new one!`,
                                    '/activities'
                                );
                            }

                            char.current_activity = null;
                            char.activity_started_at = null;
                        } else {
                            char.current_activity.actions_remaining = newActionsRemaining;
                        }
                    } else {
                        lastActivityResult = result;
                        // For failure (e.g. no ingredients), also notify if we had progress
                        const activity = char.current_activity;
                        if (activity && (activity.sessionXp > 0 || Object.keys(activity.sessionItems).length > 0)) {
                            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
                            this.addActionSummaryNotification(char, activity.type, {
                                itemsGained: activity.sessionItems,
                                xpGained: { [activity.type]: activity.sessionXp }, // Simplified key
                                totalTime: elapsedSeconds,
                                duplicationCount: activity.duplicationCount,
                                autoRefineCount: activity.autoRefineCount
                            }, 'Stopped');
                        }
                        char.current_activity = null;
                        char.activity_started_at = null;
                    }
                }
            }
        }

        if (leveledUp) {
            const skillName = leveledUp.skill.replace(/_/g, ' ');
            this.addNotification(char, 'LEVEL_UP', `Your ${skillName} skill raised to level ${leveledUp.level}!`);
        }

        let stateChanged = false;

        if (char.state.combat) {
            const combat = char.state.combat;
            let nextAttack = Number(combat.next_attack_at) || (now + 500);

            if (!combat.next_attack_at) {
                combat.next_attack_at = nextAttack;
                stateChanged = true;
            }

            const stats = this.inventoryManager.calculateStats(char);
            const atkSpeed = Math.max(200, Number(stats.attackSpeed) || 1000);

            // Respawn Delay Check
            if (combat.respawn_at) {
                if (now < combat.respawn_at) {
                    // Waiting for respawn... 
                    // No action this tick, but we continue to return the current status
                } else {
                    // Respawn time reached!
                    combat.mobHealth = combat.mobMaxHealth;
                    combat.mob_next_attack_at = now;
                    combat.player_next_attack_at = now + atkSpeed;
                    combat.next_attack_at = now; // Reset trigger timer to now
                    delete combat.respawn_at;
                    stateChanged = true;
                }
            }

            let roundsThisTick = 0;
            const MAX_ROUNDS = 20; // Allow catching up faster
            const combatRounds = [];

            while (now >= combat.next_attack_at && roundsThisTick < MAX_ROUNDS && char.state.combat) {
                try {
                    const roundResult = await this.combatManager.processCombatRound(char, combat.next_attack_at);
                    roundsThisTick++;

                    if (roundResult) {
                        combatRounds.push(roundResult);
                        // We take the last one as the primary combatResult for basic compatibility
                        combatResult = roundResult;

                        // Food is already consumed reactively inside CombatManager.processCombatRound
                        // No additional processFood call needed here
                    }

                    // Advance the timer by exactly one interval
                    combat.next_attack_at += atkSpeed;
                    stateChanged = true;

                    // If character died or combat stopped, break the loop
                    if (!char.state.combat) break;

                    // If Mob Died (Victory), apply delay and break loop
                    if (roundResult && roundResult.details && roundResult.details.victory) {
                        combat.next_attack_at += 1000; // Add 1s delay penalty
                        combat.respawn_at = now + 1000; // Set visual/logic blocker
                        stateChanged = true;
                        break; // Stop multiple kills in one tick
                    }

                } catch (e) {
                    console.error(`[COMBAT_ERROR] Error in processCombatRound for ${char.name}:`, e);
                    // Write to file for debug
                    const fs = require('fs');
                    fs.appendFileSync('server_combat_errors.log', `[${new Date().toISOString()}] ${e.message}\n${e.stack}\n---\n`);
                    break;
                }
            }

            // If we have multiple rounds, we attach them to the result
            if (combatRounds.length > 0) {
                // Fix Circular Reference: Create a new object instead of mutating one inside the array
                const primary = combatResult || combatRounds[0];
                combatResult = {
                    ...primary,
                    allRounds: combatRounds
                };

                // Sum up totals for the primary result object to keep UI counters happy
                combatResult.details = {
                    ...primary.details,
                    totalPlayerDmgThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.playerDmg || 0), 0),
                    totalMobDmgThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.mobDmg || 0), 0)
                };
            }

            // Safety: If timer is still in the past after MAX_ROUNDS, jump it forward to now
            if (char.state.combat && now >= combat.next_attack_at) {
                combat.next_attack_at = now + atkSpeed;
                stateChanged = true;
            }

            // Safety: Check for stuck timer in far future (> 10s)
            if (char.state.combat && combat.next_attack_at > now + 10000) {
                combat.next_attack_at = now;
                stateChanged = true;
            }
        }

        let dungeonResult = null;
        if (char.state.dungeon) {
            try {
                dungeonResult = await this.dungeonManager.processDungeonTick(char);
                if (dungeonResult) {
                    stateChanged = true;
                    // Merge update into state so it's visible in getStatus
                    if (dungeonResult.dungeonUpdate) {
                        Object.assign(char.state.dungeon, dungeonResult.dungeonUpdate);
                    }
                    if (dungeonResult.leveledUp) {
                        leveledUp = dungeonResult.leveledUp;
                    }
                }
            } catch (e) {
                console.error("Dungeon Error:", e);
            }
        }

        let worldBossResult = null;
        if (this.worldBossManager.activeFights.has(char.id)) {
            try {
                worldBossResult = await this.worldBossManager.processTick(char);
                if (worldBossResult) {
                    stateChanged = true;
                }
            } catch (e) {
                console.error("World Boss Error:", e);
            }
        }

        if (itemsGained > 0 || combatResult || foodUsed || activityFinished || stateChanged || dungeonResult || worldBossResult || char._stateChanged) {
            this.markDirty(char.id);
            if (char._stateChanged) delete char._stateChanged; // Reset flag after marking dirty
        }

        if (char.current_activity || char.state.combat || itemsGained > 0 || combatResult || dungeonResult || worldBossResult || foodUsed || needsHealing) {
            const returnObj = {
                success: true,
                message: lastActivityResult?.message || combatResult?.message || dungeonResult?.dungeonUpdate?.message || worldBossResult?.worldBossUpdate?.message || (foodUsed ? "Food consumed" : ""),
                leveledUp,
                activityFinished,
                combatUpdate: combatResult,
                dungeonUpdate: dungeonResult?.dungeonUpdate,
                worldBossUpdate: worldBossResult?.worldBossUpdate,
                healingUpdate: foodUsed ? { amount: foodResult.amount, source: 'FOOD' } : null,
                status: {
                    character_id: char.id,
                    user_id: char.user_id,
                    name: char.name,
                    state: char.state,
                    guild: await this.guildManager.getCharacterGuild(char.id),
                    calculatedStats: this.inventoryManager.calculateStats(char),
                    guild_bonuses: char.guild_bonuses,
                    current_activity: char.current_activity,
                    activity_started_at: char.activity_started_at,
                    dungeon_state: char.state.dungeon,
                    serverTime: Date.now()
                }
            };
            return returnObj;
        }
        return lastActivityResult || combatResult;
    }

    addXP(char, skillKey, amount) {
        if (!skillKey) return null;
        if (!char.state.skills[skillKey]) {
            if (INITIAL_SKILLS[skillKey]) {
                char.state.skills[skillKey] = JSON.parse(JSON.stringify(INITIAL_SKILLS[skillKey]));
            } else {
                return null;
            }
        }
        const skill = char.state.skills[skillKey];

        // Safety Cap & Type check
        let safeAmount = Number(amount) || 0;
        if (safeAmount > 100_000_000) safeAmount = 100_000_000;
        if (safeAmount < 0) safeAmount = 0;

        skill.xp += safeAmount;
        let leveledUp = false;
        let nextLevelXP = calculateNextLevelXP(skill.level);
        // Loop while we have enough XP and haven't hit the cap
        while (skill.xp >= nextLevelXP && skill.level < 100) {
            skill.level++;
            skill.xp -= nextLevelXP;
            leveledUp = true;
            nextLevelXP = calculateNextLevelXP(skill.level);
        }

        // FIX: Persist the nextLevelXp to the state so the client knows the target
        skill.nextLevelXp = nextLevelXP;

        // --- GUILD XP INTEGRATION (5%) ---
        // If char is in a guild, route 5% of the gained XP into the guild manager's memory buffer
        if (char.state.guild_id && safeAmount > 0) {
            const guildXpGained = safeAmount * 0.10;
            // The guild manager will handle adding to memory and flushing every 30m
            if (this.guildManager && this.guildManager.addPendingGuildXP) {
                this.guildManager.addPendingGuildXP(char.state.guild_id, guildXpGained, char.id);
            }
        }

        return leveledUp ? { skill: skillKey, level: skill.level } : null;
    }

    async saveState(charId, state) {
        this.markDirty(charId);
        await this.persistCharacter(charId);
    }

    addNotification(char, type, message) {
        if (!char.state.notifications) char.state.notifications = [];
        char.state.notifications.unshift({
            id: Date.now() + Math.random(),
            type,
            message,
            timestamp: Date.now(),
            read: false
        });
        // Keep only last 10
        if (char.state.notifications.length > 10) {
            char.state.notifications = char.state.notifications.slice(0, 10);
        }
    }

    addActionSummaryNotification(char, actionType, stats, itemSuffix = 'Summary') {
        // console.log(`[DEBUG] addActionSummaryNotification for ${char.name}. Type: ${actionType}`);
        // stats can be offlineReport or a simple gains object
        // { itemsGained: {}, xpGained: {}, totalTime: seconds, kills?: number, silverGained?: number, elapsedTime?: number }
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

        // console.log(`[NOTIF] Adding system notif for ${char.name}: ${message}`);
        this.addNotification(char, 'SYSTEM', message);
    }

    processFood(char, nowOverride = null) {
        if (!char.state.equipment || !char.state.equipment.food) return { used: false, amount: 0 };
        // Get the equipped food object (which might be stale)
        let food = char.state.equipment.food;

        // RESOLVE FRESH ITEM DATA: 
        // The equipped object might be a stale copy from the DB with old 'heal' values.
        // We must fetch the latest definition from shared/items.js to get the new 'healPercent'.
        const freshItem = this.inventoryManager.resolveItem(food.id);

        // Merge fresh stats onto the food object temporarily for calculation (preserve amount)
        if (freshItem) {
            food = { ...freshItem, amount: food.amount };
        }

        // Support both old flat heal and new percent heal
        if (!food.heal && !food.healPercent && !food.amount) return { used: false, amount: 0 };

        const inCombat = !!char.state.combat;
        const stats = this.inventoryManager.calculateStats(char, nowOverride);
        const maxHp = stats.maxHP;
        let currentHp = inCombat ? (char.state.combat.playerHealth || 0) : (char.state.health || 0);
        if (currentHp < 0) currentHp = 0; // Safety floor

        // COOLDOWN LOGIC: 5 seconds between eats
        const COOLDOWN_MS = 5000;
        const lastFoodAt = char.state.lastFoodAt || 0;
        const now = nowOverride || Date.now();

        if (now - lastFoodAt < COOLDOWN_MS) return { used: false, amount: 0 };
        if (currentHp >= maxHp) return { used: false, amount: 0 };

        const foodSaver = stats.foodSaver || 0;

        // Calculate Heal Amount per unit
        let unitHeal = 0;
        if (food.healPercent) {
            unitHeal = Math.floor(maxHp * (food.healPercent / 100));
        } else {
            unitHeal = food.heal || 0;
        }
        if (unitHeal < 1) unitHeal = 1;

        const missing = maxHp - currentHp;
        const hpPercent = (currentHp / maxHp) * 100;

        // NO WASTE RULE:
        // Eat if the heal fits entirely OR if HP is dangerously low (< 40%)
        if (food.amount > 0 && (missing >= unitHeal || hpPercent < 40)) {
            const actualHeal = Math.min(unitHeal, missing);

            // Safety break if somehow normalized to non-positive
            if (actualHeal <= 0 && hpPercent >= 40) return { used: false, amount: 0 };

            currentHp = currentHp + actualHeal;

            let savedCount = 0;
            const savedFood = foodSaver > 0 && Math.random() * 100 < foodSaver;
            if (!savedFood) {
                char.state.equipment.food.amount--;
            } else {
                savedCount++;
            }

            char.state.lastFoodAt = now;

            // Update state
            char.state.health = currentHp;
            if (inCombat) {
                char.state.combat.playerHealth = currentHp;
                char.state.combat.foodConsumed = (char.state.combat.foodConsumed || 0) + 1;
                char.state.combat.savedFoodCount = (char.state.combat.savedFoodCount || 0) + savedCount;
                char._stateChanged = true;
            }

            // Auto-remove food if empty
            if (char.state.equipment.food.amount <= 0) {
                delete char.state.equipment.food;
            }

            // PUSH NOTIFICATION: HP Fully Recovered
            if (char.state.health >= maxHp && char.user_id) {
                this.pushManager.notifyUser(
                    char.user_id,
                    'push_hp_recovered',
                    'HP Fully Recovered! ❤️',
                    'You are back to full health and ready for battle!',
                    '/combat'
                );
            }

            return { used: true, amount: actualHeal, eaten: 1, savedCount };
        }

        return { used: false, amount: 0 };
    }

    async getLeaderboard(type = 'COMBAT', requesterId = null, mode = 'NORMAL') {
        const cacheKey = `${type}_${mode}`;
        const now = Date.now();
        const cached = this.leaderboardCache.get(cacheKey);

        // Check if we have valid cached data (within TTL)
        if (cached && (now - cached.timestamp) < this.LEADERBOARD_CACHE_TTL) {
            // Still need to calculate userRank for the requester
            const sorted = cached.data;
            let userRank = null;
            if (requesterId) {
                if (type === 'GUILDS') {
                    // For guilds, we need the character's guild_id
                    const char = this.cache.get(requesterId);
                    const guildId = char?.state?.guild_id;
                    if (guildId) {
                        const index = sorted.findIndex(g => g.id === guildId);
                        if (index !== -1) {
                            userRank = { rank: index + 1, guild: sorted[index] };
                        }
                    }
                } else {
                    const index = sorted.findIndex(c => c.id === requesterId);
                    if (index !== -1) {
                        userRank = { rank: index + 1, character: sorted[index] };
                    }
                }
            }
            return { type, mode, top100: sorted.slice(0, 100), userRank };
        }

        if (type === 'GUILDS') {
            const { data, error } = await this.supabase
                .from('guilds')
                .select('id, name, tag, level, xp, icon, icon_color, bg_color, country_code, guild_hall_level, guild_members(character_id)')
                .limit(1000);

            if (error) {
                console.error("[RANKING] Guild DB Error:", error);
                return { type, top100: [], userRank: null };
            }

            const sorted = (data || []).map(guild => {
                const memberCount = guild.guild_members?.length || 0;
                const maxMembers = 10 + (guild.guild_hall_level || 0) * 2;
                // Cleanup the object for the client
                const { guild_members, ...rest } = guild;
                return { ...rest, memberCount, maxMembers };
            }).sort((a, b) => {
                if (b.level !== a.level) return (b.level || 1) - (a.level || 1);
                return (b.xp || 0) - (a.xp || 0);
            });

            this.leaderboardCache.set(cacheKey, { data: sorted, timestamp: now });

            let userRank = null;
            if (requesterId) {
                const char = this.cache.get(requesterId);
                const guildId = char?.state?.guild_id;
                if (guildId) {
                    const index = sorted.findIndex(g => g.id === guildId);
                    if (index !== -1) {
                        userRank = { rank: index + 1, guild: sorted[index] };
                    }
                }
            }

            return { type, mode, top100: sorted.slice(0, 100), userRank };
        }

        // console.log(`[RANKING] Fetching fresh leaderboard for type: ${type}, mode: ${mode}`);
        let query = this.supabase
            .from('characters')
            .select('id, name, state, skills, info, equipment') // Fetch skills, info and equipment
            .or('is_admin.is.null,is_admin.eq.false'); // Exclude admins

        // Mode Filtering
        if (mode === 'IRONMAN') {
            // Check if isIronman is true in the state JSON
            // Postgres JSONB query for boolean true
            query = query.contains('state', { isIronman: true });
        } else {
            // NORMAL mode: isIronman is false OR null/undefined
            // We use 'not' contains { isIronman: true } to cover both false and missing
        }

        // Increased limit to 2000 to allow in-memory filtering effectively
        const { data, error } = await query.limit(2000);
        if (error) {
            console.error("[RANKING] DB Error:", error);
            return { type, top100: [], userRank: null };
        }

        if (!data) return { type, top100: [], userRank: null };

        // Inject skills and info into state for backward compatibility and sorting
        data.forEach(char => {
            if (char.skills && char.state) {
                char.state.skills = char.skills;
            }
            if (char.equipment && char.state) {
                char.state.equipment = char.equipment;
            }
            // Inject membership from info column for ranking display
            if (char.info?.membership && char.state) {
                char.state.membership = char.info.membership;
            }
        });

        const sortKey = type || 'COMBAT';

        // Helper function to calculate total accumulated XP for a skill
        const getTotalXP = (skill) => {
            const level = skill.level || 1;
            const currentXP = skill.xp || 0;

            // Sum all XP from previous levels using XP_TABLE
            // XP_TABLE[level-1] gives us the total XP needed to reach current level
            const xpFromPreviousLevels = XP_TABLE[level - 1] || 0;

            // Total XP = XP spent on previous levels + current level progress
            return xpFromPreviousLevels + currentXP;
        };

        const getVal = (char, key) => {
            if (key === 'LEVEL') {
                // Total Level
                return Object.values(char.state.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
            }
            if (key === 'TOTAL_XP') {
                // Total XP across all skills (accumulated)
                return Object.values(char.state.skills || {}).reduce((acc, s) => acc + getTotalXP(s), 0);
            }
            if (key === 'ITEM_POWER') {
                // Item Power calculation - Match ProfilePanel.jsx logic
                const equipment = char.state.equipment || {};
                const hasWeapon = !!equipment.mainHand;
                const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];

                let totalIP = 0;
                combatSlots.forEach(slot => {
                    const rawItem = equipment[slot];
                    if (rawItem) {
                        // Skip if no weapon and it's a combat gear slot (except mainHand itself)
                        if (!hasWeapon && slot !== 'mainHand') return;

                        // Resolve item to get base IP + quality bonus
                        const resolved = resolveItem(rawItem.id || rawItem.item_id);
                        if (resolved) {
                            totalIP += resolved.ip || 0;
                        }
                    }
                });
                // Current profile logic: Math.floor(totalIP / 7)
                return Math.floor(totalIP / 7);
            }
            // Specific Skill
            const skill = char.state.skills?.[key] || { level: 1, xp: 0 };
            // Return a composite value for sorting: Level * 1Billion + Total Accumulated XP
            // This ensures Level is primary, Total XP is secondary (not just current level XP)
            return (skill.level * 1000000000) + getTotalXP(skill);
        };

        const sorted = data
            .filter(c => {
                if (!c || !c.state) return false;

                // In-Memory Mode Filtering
                if (mode === 'IRONMAN') {
                    // Double check (though DB query should have handled it)
                    return c.state.isIronman === true;
                } else {
                    // NORMAL: isIronman must be falsy or false
                    return !c.state.isIronman;
                }
            })
            .sort((a, b) => {
                const valA = getVal(a, sortKey);
                const valB = getVal(b, sortKey);
                return valB - valA; // DESC
            });

        let userRank = null;
        if (requesterId) {
            const index = sorted.findIndex(c => c.id === requesterId);
            if (index !== -1) {
                userRank = {
                    rank: index + 1,
                    character: sorted[index]
                };
            }
        }

        // Cache the sorted data for future requests
        this.leaderboardCache.set(cacheKey, { data: sorted, timestamp: now });

        return {
            type,
            mode,
            top100: sorted.slice(0, 100),
            userRank
        };
    }

    // Delegation Methods
    async startActivity(u, c, t, i, q) { return this.activityManager.startActivity(u, c, t, i, q); }
    async stopActivity(u, c) { return this.activityManager.stopActivity(u, c); }

    async startCombat(u, c, m, t) { return this.combatManager.startCombat(u, c, m, t); }
    async stopCombat(u, c) { return this.combatManager.stopCombat(u, c); }

    async equipItem(u, c, i, q = null) { return this.inventoryManager.equipItem(u, c, i, q); }
    async unequipItem(u, c, s) { return this.inventoryManager.unequipItem(u, c, s); }

    async getMarketListings(f) { return this.marketManager.getMarketListings(f); }
    async sellItem(u, c, i, q) {
        return this.marketManager.sellItem(u, c, i, q);
    }
    async listMarketItem(u, c, i, a, p) {
        const char = await this.getCharacter(u, c);
        if (char?.state?.isIronman) throw new Error("Ironman characters cannot use the Market.");
        return this.marketManager.listMarketItem(u, c, i, a, p);
    }
    async buyMarketItem(b, c, l, q) {
        const char = await this.getCharacter(b, c);
        if (char?.state?.isIronman) throw new Error("Ironman characters cannot use the Market.");
        return this.marketManager.buyMarketItem(b, c, l, q);
    }
    async cancelMarketListing(u, c, l) {
        const char = await this.getCharacter(u, c);
        if (char?.state?.isIronman) throw new Error("Ironman characters cannot use the Market.");
        return this.marketManager.cancelMarketListing(u, c, l);
    }
    async claimMarketItem(u, c, cl) { return this.marketManager.claimMarketItem(u, c, cl); }

    async startDungeon(u, c, d, r) { return this.dungeonManager.startDungeon(u, c, d, r); }
    async stopDungeon(u, c) { return this.dungeonManager.stopDungeon(u, c); }
    async stopDungeonQueue(u, c) { return this.dungeonManager.stopQueue(u, c); }
    async consumeItem(userId, characterId, itemId, quantity = 1) {
        console.log(`[DEBUG-POTION] consumeItem called for ${characterId}, item: ${itemId}, qty:`, quantity);
        const char = await this.getCharacter(userId, characterId);
        const itemData = this.inventoryManager.resolveItem(itemId);
        // Note: No current_activity or combat restrictions are enforced here to allow potion usage anytime.
        const safeQty = Math.max(1, parseInt(typeof quantity === 'object' ? quantity.qty : quantity) || 1);

        if (!itemData) {
            const keys = Object.keys(ITEM_LOOKUP).length;
            const hasPotion = ITEM_LOOKUP['T1_POTION_DAMAGE'] !== undefined;
            const potionKeys = Object.keys(ITEM_LOOKUP).filter(k => k.includes('POTION')).length;
            throw new Error(`Item not found | keys=${keys}, hasDmg=${hasPotion}, totalPotions=${potionKeys}`);
        }

        const invQty = char.state.inventory?.[itemId] || 0;
        if (invQty < safeQty) throw new Error(`You don't have enough ${itemData.name}`);

        let message = ""; // Neutralized message for toast suppression

        if (itemData.type === 'FOOD') {
            const stats = this.inventoryManager.calculateStats(char);
            const healAmount = (itemData.heal || 50) * safeQty;
            const currentHp = char.state.health || 0;
            const newHp = Math.min(stats.maxHP, currentHp + healAmount);

            char.state.health = newHp;
            // message += ` (Recovered ${healAmount} HP)`;
            this.inventoryManager.consumeItems(char, { [itemId]: safeQty });
        } else if (itemData.type === 'POTION') {
            const effect = itemData.effect;
            const value = itemData.value;
            const tier = itemData.tier || 1;
            const baseDuration = itemData.duration || 3600;
            const totalDuration = baseDuration * safeQty;

            // NEW: Tier Check and Confirmation Logic
            if (!char.state.active_buffs) char.state.active_buffs = {};
            const existing = char.state.active_buffs[effect];
            const isExpired = !existing || existing.expiresAt <= Date.now();

            // If trying to swap tiers and not forced, ask for confirmation
            if (!isExpired && existing.tier !== tier && !quantity.force) {
                return {
                    requiresConfirmation: true,
                    pendingItem: {
                        itemId,
                        name: itemData.name,
                        oldTier: existing.tier,
                        newTier: tier,
                        quantity: safeQty
                    }
                };
            }

            // If we reach here, either it's same tier, expired, or forced
            this.inventoryManager.consumeItems(char, { [itemId]: safeQty });
            this.applyBuff(char, effect, value, totalDuration, tier);
            // message += ` (Buff Applied: +${Math.round(value * 100)}% for ${Math.round(totalDuration / 60)}m)`;
        } else {
            // General consumption for other items
            this.inventoryManager.consumeItems(char, { [itemId]: safeQty });

            if (itemData.id === 'MEMBERSHIP' || itemData.id === 'ETERNAL_MEMBERSHIP') {
                const membershipItem = { duration: (itemData.duration || 30 * 24 * 60 * 60 * 1000) * safeQty };
                const result = await this.orbsManager.applyMembership(char, membershipItem);
                if (result.success) {
                    // message = result.message;
                } else {
                    throw new Error(result.error || "Failed to activate membership");
                }
            } else if (itemData.id === 'INVENTORY_SLOT_TICKET') {
                // Permanent Inventory Expansion
                char.state.extraInventorySlots = (parseInt(char.state.extraInventorySlots) || 0) + safeQty;
                // message = `Used ${safeQty}x Inventory Expansion Tickets! Your inventory capacity permanently increased by ${safeQty} slots.`;
            } else if (itemData.id === 'NAME_CHANGE_TOKEN') {
                if (char.state.pendingNameChange) {
                    throw new Error("You already have a pending name change!");
                }
                char.state.pendingNameChange = true;
                // message = "Name Change Unlocked! You can now change your name in the Profile panel.";
            } else if (itemData.id === 'NOOB_CHEST') {
                // NOOB CHEST LOGIC
                const rewards = [
                    { id: 'T1_FOOD', qty: 200 * safeQty },
                    { id: 'T1_SWORD', qty: 1 * safeQty },
                    { id: 'T1_BOW', qty: 1 * safeQty },
                    { id: 'T1_FIRE_STAFF', qty: 1 * safeQty },
                    { id: 'T1_RUNE_SHARD', qty: 100 * safeQty }
                ];

                // Add Silver
                const addedSilver = 5000 * safeQty;
                char.state.silver = parseInt(char.state.silver || 0) + addedSilver;

                for (const reward of rewards) {
                    this.inventoryManager.addItemToInventory(char, reward.id, reward.qty);
                }

                // Consume Chest
                this.inventoryManager.consumeItems(char, { [itemId]: safeQty });

                const message = "You opened the Noob Chest!\nReceived:\n• 5.000 Silver\n• 200x Food\n• 1x Sword\n• 1x Bow\n• 1x Fire Staff\n• 100x Rune Shards";

                await this.saveState(char.id, char.state);
                return { success: true, message, itemId, rewards: { items: rewards, silver: addedSilver } };

            } else if (itemData.id.includes('CHEST')) {
                // Chest Logic
                const tier = itemData.tier || 1;

                // Simulate adding items to check for space (Approximation)
                const tempInv = { ...char.state.inventory };
                const simulatedMax = this.inventoryManager.getMaxSlots(char);

                const totalRewards = {
                    items: {}
                };

                // 2. Loop for Quantity
                const rarityConfig = CHEST_DROP_TABLE.RARITIES[itemData.rarity] || CHEST_DROP_TABLE.RARITIES.COMMON;
                const crestChance = rarityConfig.crestChance;

                const [min, max] = getChestRuneShardRange(tier, itemData.id.includes('WORLDBOSS') ? 'COMMON' : itemData.rarity);

                // Determine Shard Type: WorldBoss Chests drop Battle Rune Shards
                const shardId = itemData.id.includes('WORLDBOSS') ? `T1_BATTLE_RUNE_SHARD` : `T1_RUNE_SHARD`;

                for (let i = 0; i < safeQty; i++) {
                    // Collect all potential new items first
                    const potentialDrops = [];

                    if (!itemData.id.includes('WORLDBOSS') && Math.random() < crestChance) {
                        const crestId = `T${tier}_CREST`;
                        totalRewards.items[crestId] = (totalRewards.items[crestId] || 0) + 1;
                    }

                    // Rune Shards
                    let shardQty;
                    if (itemData.id.includes('WORLDBOSS') && WORLDBOSS_DROP_TABLE[itemData.id]) {
                        shardQty = WORLDBOSS_DROP_TABLE[itemData.id];
                    } else {
                        // Standard Formula (Guaranteed range per chest: 80% min, 20% max)
                        shardQty = Math.random() < 0.8 ? min : max;
                    }
                    totalRewards.items[shardId] = (totalRewards.items[shardId] || 0) + shardQty;
                }

                // 3. Check Space using TOTAL rewards list
                // Calculate current used slots (excluding noInventorySpace items like Runes)
                const currentUsedSlots = Object.keys(tempInv).filter(k => {
                    const item = this.inventoryManager.resolveItem(k);
                    return item && !item.noInventorySpace;
                }).length;

                let newSlotsNeeded = 0;
                for (const [rId, qty] of Object.entries(totalRewards.items)) {
                    if (!tempInv[rId]) {
                        const item = this.inventoryManager.resolveItem(rId);
                        if (item && !item.noInventorySpace) {
                            newSlotsNeeded++;
                        }
                    }
                }

                if (currentUsedSlots + newSlotsNeeded > simulatedMax) {
                    throw new Error("Inventory Full! Cannot open all chests.");
                }

                // 4. Apply Rewards (Space Guaranteed)
                let message = ""; // Neutralized for toast simplification

                const rewards = { items: [] }; // For the UI return

                for (const [rId, qty] of Object.entries(totalRewards.items)) {
                    this.inventoryManager.addItemToInventory(char, rId, qty);
                    message += `\n${qty}x ${rId.replace(/T\d+_/, '')}`;
                    rewards.items.push({ id: rId, qty });
                }

                await this.saveState(char.id, char.state);
                await this.persistCharacter(char.id);
                return { success: true, message, itemId, rewards: rewards.items.length > 0 ? rewards : null };

            } else if (false) { // Skip old block


                await this.saveState(char.id, char.state);
                return { success: true, message, itemId, rewards };
            }
        }

        await this.saveState(char.id, char.state);
        await this.persistCharacter(char.id);
        return { success: true, message, itemId };
    }

    applyBuff(char, type, value, durationSeconds, tier = 1) {
        if (!type) {
            console.error("[DEBUG-POTION] ERROR: applyBuff called with NO TYPE!");
            return;
        }
        if (!char.state.active_buffs) char.state.active_buffs = {};

        const now = Date.now();
        const existing = char.state.active_buffs[type];
        const durationMs = durationSeconds * 1000;

        // Logic: Stacking identical buffs (same tier)
        if (existing && existing.expiresAt > now && existing.tier === tier) {
            existing.expiresAt += durationMs;
            // Value might change if we ever have quality potions, but for now we follow tier
            existing.value = value;
        } else {
            // Case: No existing, expired, or forced swap (different tier handled in consumeItem)
            char.state.active_buffs[type] = {
                value: value,
                tier: tier,
                expiresAt: now + durationMs
            };
        }
    }
    async craftRune(userId, characterId, shardId, qty = 1, category = 'GATHERING') {
        console.log(`[GameManager] craftRune called for ${characterId}, shard: ${shardId}, qty: ${qty}, category: ${category}`);
        const count = Math.max(1, parseInt(qty) || 1);
        const char = await this.getCharacter(userId, characterId);
        if (!char) return { success: false, error: "Character not found" };

        // 0. Auto-correct category based on shard type (safeguard against client mismatches)
        const activeShardIdPrecheck = shardId || 'T1_RUNE_SHARD';
        if (activeShardIdPrecheck === 'T1_BATTLE_RUNE_SHARD' || activeShardIdPrecheck.includes('BATTLE')) {
            if (category !== 'COMBAT') {
                console.log(`[GameManager] Auto-correcting category from '${category}' to 'COMBAT' (battle shard detected)`);
                category = 'COMBAT';
            }
        } else if (category === 'COMBAT') {
            console.log(`[GameManager] Auto-correcting category from 'COMBAT' to 'GATHERING' (non-battle shard used)`);
            category = 'GATHERING';
        }

        // 1. Validate Category
        const types = RUNES_BY_CATEGORY[category];
        if (!category || !types || types.length === 0) {
            return { success: false, error: "Please select a valid Rune Category (Gathering, Refining, Crafting, or Combat) before forging." };
        }

        // 2. Validate Shard ID & Category Compatibility
        const activeShardId = shardId || 'T1_RUNE_SHARD';

        if (category === 'COMBAT') {
            if (activeShardId !== 'T1_BATTLE_RUNE_SHARD') {
                return { success: false, error: "Combat runes require Battle Rune Shards!" };
            }
        } else {
            // Gathering, Refining, Crafting
            if (activeShardId !== 'T1_RUNE_SHARD') {
                return { success: false, error: `${category.charAt(0) + category.slice(1).toLowerCase()} runes require standard Rune Shards!` };
            }
        }

        // 3. Check Quantity and Silver (Need 5 * qty and 100 * qty)
        const totalNeeded = 5 * count;
        const totalSilverCost = 100 * count;
        const currentQty = char.state.inventory[activeShardId] || 0;
        const currentSilver = char.state.silver || 0;

        if (currentQty < totalNeeded) {
            return { success: false, error: `Not enough shards (Need ${totalNeeded})` };
        }
        if (currentSilver < totalSilverCost) {
            return { success: false, error: `Not enough Silver! Need ${totalSilverCost.toLocaleString()} Silver.` };
        }

        // 4. Consume Shards and Silver
        this.inventoryManager.consumeItems(char, { [activeShardId]: totalNeeded });
        char.state.silver -= totalSilverCost;

        // 5. Force Tier 1 for Forgery
        const tier = 1;

        const results = [];

        // 6. Generate Runes
        for (let i = 0; i < count; i++) {
            const randomType = types[Math.floor(Math.random() * types.length)];
            const stars = 1;
            const runeId = `T${tier}_RUNE_${randomType}_${stars}STAR`;

            this.inventoryManager.addItemToInventory(char, runeId, 1);
            results.push({ item: runeId, stars, type: randomType });
        }

        // 7. Mark Dirty & Persist Immediately
        this.markDirty(char.id);
        await this.persistCharacter(char.id);

        return {
            success: true,
            items: results,
            count: count,
            // Return last item for legacy UI compatibility if needed
            item: results[results.length - 1].item,
            stars: 1
        };
    }
    async upgradeRune(userId, characterId, runeId, qty = 1) {
        console.log(`[GameManager] upgradeRune called for ${characterId}, rune: ${runeId}, qty: ${qty}`);
        const count = Math.max(1, parseInt(qty) || 1);
        const char = await this.getCharacter(userId, characterId);
        if (!char) return { success: false, error: "Character not found" };

        // 1. Validate Rune ID
        if (!runeId || !runeId.includes('_RUNE_')) {
            return { success: false, error: "Invalid Rune ID" };
        }

        // 2. Parse ID (Format: T{tier}_RUNE_{TYPE}_{stars}STAR)
        const match = runeId.match(/^T(\d+)_RUNE_(.+)_(\d+)STAR$/);
        if (!match) return { success: false, error: "Malformed Rune ID" };

        const tier = parseInt(match[1]);
        let type = match[2];
        const stars = parseInt(match[3]);

        // Normalize for legacy support
        if (type.includes('COPY')) type = type.replace('COPY', 'DUPLIC');
        if (type.startsWith('TOOL_')) {
            // No-op, it's a tool-specific rune like TOOL_WOOD_XP
        } else if (type === 'TOOL') {
            type = 'TOOLS';
        }

        // 3. Check Max Level & Tier Transition
        let nextStars = stars + 1;
        let nextTier = tier;

        if (stars >= 3) {
            if (tier >= 10) {
                return { success: false, error: "Rune is at absolute Maximum Tier and Star Level!" };
            }
            // Evolve to Next Tier
            nextStars = 1;
            nextTier = tier + 1;
            console.log(`[GameManager] Evolving rune ${runeId} to Tier ${nextTier}`);
        }

        // 4. Check Quantity and Silver (Need 2 * qty and 2 * tier * qty)
        const totalNeeded = 2 * count;
        const totalSilverCost = 2 * tier * count;
        const currentQty = char.state.inventory[runeId] || 0;
        const currentSilver = char.state.silver || 0;

        if (currentQty < totalNeeded) {
            return { success: false, error: `Not enough runes (Need ${totalNeeded})` };
        }
        if (currentSilver < totalSilverCost) {
            return { success: false, error: `Not enough Silver! Need ${totalSilverCost.toLocaleString()} Silver (T${tier} merge).` };
        }

        // 5. Consume Runes and Silver
        this.inventoryManager.consumeItems(char, { [runeId]: totalNeeded });
        char.state.silver -= totalSilverCost;

        // 6. Generate New Runes/Next Tier
        const newRuneId = `T${nextTier}_RUNE_${type}_${nextStars}STAR`;

        // 7. Add New Runes
        this.inventoryManager.addItemToInventory(char, newRuneId, count);

        // 8. Mark Dirty & Persist Immediately
        this.markDirty(char.id);
        await this.persistCharacter(char.id);

        const results = Array.from({ length: count }).map(() => ({
            item: newRuneId,
            stars: nextStars,
            type: type
        }));

        return {
            success: true,
            items: results,
            item: newRuneId,
            count: count,
            stars: nextStars,
            type: type
        };
    }

    async dismantleItem(userId, characterId, itemId, quantity = 1) {
        const char = await this.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const result = this.inventoryManager.dismantleItem(char, itemId, quantity);
        if (result.success) {
            this.markDirty(char.id);
            await this.persistCharacter(char.id);
        }
        return result;
    }

    async autoMergeRunes(userId, characterId, filters = {}) {
        console.log(`[GameManager] autoMergeRunes called for ${characterId} with filters:`, filters);
        const char = await this.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const isMember = char.state.membership?.active && char.state.membership.expiresAt > Date.now();
        if (!isMember) {
            throw new Error("Auto Merge is a Premium feature. Active Membership required.");
        }

        const {
            categoryFilter = 'ALL',
            activityFilter = 'ALL',
            effectFilter = 'ALL',
            tierFilter = 'ALL',
            starsFilter = 'ALL',
            search = ''
        } = filters;

        // --- STEP 1: CALCULATE TOTAL MERGES (GROUPED BY BASE ID) ---
        let totalUpgrades = 0;
        let totalSilverCost = 0;
        const createdItems = [];

        // Group by base ID to handle legacy signatures (::CreatorName)
        const groupedInv = {};
        for (const [itemId, qty] of Object.entries(char.state.inventory)) {
            const baseId = itemId.includes('::') ? itemId.split('::')[0] : itemId;
            groupedInv[baseId] = (groupedInv[baseId] || 0) + (typeof qty === 'object' ? (qty.amount || 0) : (Number(qty) || 0));
        }

        const tempInv = { ...groupedInv };

        let changed = true;
        while (changed) {
            changed = false;
            for (const [itemId, qty] of Object.entries(tempInv)) {
                if (qty < 2) continue;
                if (!itemId.includes('_RUNE_') || itemId.includes('SHARD')) continue;

                const match = itemId.match(/^T(\d+)_RUNE_(.+)_(\d+)STAR/);
                if (!match) continue;

                const tier = parseInt(match[1]);
                const stars = parseInt(match[3]);

                if (stars >= 3 && tier >= 10) continue;

                // Apply Filters (same logic as below)
                const itemData = this.inventoryManager.resolveItem(itemId);
                if (!itemData) continue;
                if (search && !itemData.name.toLowerCase().includes(search.toLowerCase()) && !itemId.toLowerCase().includes(search.toLowerCase())) continue;
                if (categoryFilter !== 'ALL') {
                    const isInCategory = RUNES_BY_CATEGORY[categoryFilter]?.some(catType => itemId.includes(`_RUNE_${catType}_`));
                    if (!isInCategory) continue;
                }
                if (activityFilter !== 'ALL' && !itemId.includes(`_RUNE_${activityFilter}_`)) continue;
                if (effectFilter !== 'ALL' && !itemId.includes(`_${effectFilter}_`)) continue;
                if (tierFilter !== 'ALL' && tier !== parseInt(tierFilter)) continue;
                if (starsFilter !== 'ALL' && stars !== parseInt(starsFilter)) continue;

                const pairs = Math.floor(qty / 2);
                if (pairs > 0) {
                    const costPerPair = 2 * tier;
                    totalSilverCost += costPerPair * pairs;
                    totalUpgrades += pairs;

                    let nextStars = stars + 1;
                    let nextTier = tier;
                    if (stars >= 3) {
                        nextStars = 1;
                        nextTier = tier + 1;
                    }
                    const nextItemId = `T${nextTier}_RUNE_${match[2]}_${nextStars}STAR`;

                    tempInv[itemId] -= (pairs * 2);
                    if (tempInv[itemId] <= 0) delete tempInv[itemId];
                    tempInv[nextItemId] = (tempInv[nextItemId] || 0) + pairs;

                    // Track for result modal
                    for (let i = 0; i < pairs; i++) {
                        createdItems.push({ item: nextItemId, qty: 1 });
                    }

                    changed = true;
                }
            }
        }

        if (totalUpgrades === 0) {
            throw new Error("No runes available to merge (need at least 2 of the same type/tier).");
        }

        const currentSilver = char.state.silver || 0;
        if (currentSilver < totalSilverCost) {
            throw new Error(`Insufficient Silver! Auto-merge total cost: ${totalSilverCost.toLocaleString()} Silver. You have ${currentSilver.toLocaleString()}.`);
        }

        // --- STEP 2: APPLY MERGES AND DEDUCT SILVER ---
        char.state.silver -= totalSilverCost;

        // Create a copy of actual inventory to work with
        const currentInv = { ...char.state.inventory };
        const finalInv = {};

        // 1. Group inventory into a temporary object with base IDs but tracking source keys for deduction
        const baseGroups = {};
        for (const [key, val] of Object.entries(currentInv)) {
            const baseId = key.includes('::') ? key.split('::')[0] : key;
            if (!baseGroups[baseId]) baseGroups[baseId] = [];
            baseGroups[baseId].push({ key, val, amount: (typeof val === 'object' ? (val.amount || 0) : (Number(val) || 0)) });
        }

        // 2. Process merges using the pre-calculated tempInv (the "target" state from Step 1)
        // Actually, it's simpler to just rebuild the inventory based on tempInv
        // since we've already calculated the final state in tempInv.
        // However, we want to KEEP non-rune items and preserve metadata if possible (though runes don't have it now).

        // Rule: All items in tempInv that were merged are now standard (no signature).
        // Non-rune items or runes that weren't merged should be kept as they were.

        // Let's just update the inventory with the results from tempInv
        // and keep anything that isn't a Rune as is.

        for (const [key, val] of Object.entries(currentInv)) {
            if (!key.includes('_RUNE_') || key.includes('SHARD')) {
                finalInv[key] = val;
            }
        }

        // Add the merged/finalized runes from tempInv
        for (const [baseId, qty] of Object.entries(tempInv)) {
            if (baseId.includes('_RUNE_') && !baseId.includes('SHARD')) {
                finalInv[baseId] = qty;
            }
        }

        char.state.inventory = finalInv;
        this.markDirty(char.id);
        await this.persistCharacter(char.id);

        return {
            success: true,
            items: createdItems,
            count: createdItems.length,
            message: `Successfully performed ${totalUpgrades} merges for ${totalSilverCost.toLocaleString()} Silver!`
        };
    }

    async getPublicProfile(characterName) {
        if (!characterName) throw new Error("Character name is required");

        // 1. Try to find in cache first (case-insensitive find)
        let char = Array.from(this.cache.values()).find(c => c.name.toLowerCase() === characterName.toLowerCase());

        // 2. If not in cache, try DB
        if (!char) {
            const { data, error } = await this.supabase
                .from('characters')
                .select('*')
                .ilike('name', characterName)
                .single();

            if (error || !data) {
                // Try v2 table just in case
                const { data: dataV2, error: errorV2 } = await this.supabase
                    .from('characters_v2')
                    .select('*')
                    .ilike('name', characterName)
                    .single();

                if (errorV2 || !dataV2) throw new Error("Character not found");
                char = this._hydrateCharacterFromRaw(dataV2);
            } else {
                char = this._hydrateCharacterFromRaw(data);
            }
        }

        // 3. Prune data for public consumption
        // We only want: name, level, title, equipment, skills, stats, and guild
        const publicData = {
            id: char.id,
            name: char.name,
            level: char.state?.level || 1,
            avatar: char.state?.avatar || '/profile/1 - male.png',
            selectedBanner: char.state?.banner || char.state?.selectedBanner || '/banner/ceu-noturno.webp',
            health: char.state?.health || 0,
            selectedTitle: char.state?.selectedTitle || null,
            equipment: char.state?.equipment || {},
            skills: char.state?.skills || {},
            stats: this.inventoryManager.calculateStats(char),
            isPremium: char.state?.isPremium || char.state?.membership?.active || false,
            // Add guild if it exists in state
            guildName: char.state?.guildName || null,
            theme: char.state?.theme || 'medieval'
        };

        return publicData;
    }

    _extractRunes(inventory) {
        if (!inventory) return {};
        const runes = {};
        for (const [itemId, qty] of Object.entries(inventory)) {
            // Filter only items that look like runes (e.g. T1_RUNE_MINING_XP_1STAR)
            // exclude shards
            if (itemId.includes('_RUNE_') && !itemId.includes('_SHARD') && (typeof qty === 'number' ? qty > 0 : qty.amount > 0)) {
                runes[itemId] = qty;
            }
        }
        return runes;
    }

    _hydrateCharacterFromRaw(data) {
        if (!data) return null;
        if (!data.state) data.state = {};

        // INVENTORY MIGRATION: Inject the separate inventory column back into state for runtime
        if (data.inventory) {
            data.state.inventory = data.inventory;
        } else if (!data.state.inventory) {
            data.state.inventory = {};
        }

        // SKILLS MIGRATION: Inject the separate skills column back into state for runtime
        if (data.skills) {
            data.state.skills = data.skills;
        }

        // EQUIPMENT MIGRATION: Inject the separate equipment column back into state for runtime
        if (data.equipment) {
            data.state.equipment = data.equipment;
        }

        // --- GEAR SETS INITIALIZATION ---
        if (!data.state.equipment_sets) {
            const COMBAT_SLOTS = ['mainHand', 'offHand', 'chest', 'helmet', 'boots', 'gloves', 'cape'];
            const initialCombat = {};
            if (data.state.equipment) {
                COMBAT_SLOTS.forEach(s => { if (data.state.equipment[s]) initialCombat[s] = data.state.equipment[s]; });
            }
            data.state.equipment_sets = [initialCombat, {}, {}];
            data.state.active_set = 0;
        }
        // --------------------------------

        // INFO MIGRATION: Inject the separate info column back into state for runtime
        if (data.info) {
            // Inject each info field into state for runtime compatibility
            if (data.info.stats) data.state.stats = data.info.stats;
            if (data.info.health !== undefined) data.state.health = data.info.health;
            if (data.info.silver !== undefined) data.state.silver = data.info.silver;
            // Ensure Orbs/Crowns are migrated from all possible sources (info.orbs, info.crowns, state.orbs, state.crowns)
            // Taking Math.max is the safest way to ensure no balance is lost during this transition phase.
            const infoOrbs = Number(data.info.orbs) || 0;
            const infoCrowns = Number(data.info.crowns) || 0;
            const stateOrbs = Number(data.state.orbs) || 0;
            const stateCrowns = Number(data.state.crowns) || 0;

            const finalBalance = Math.max(infoOrbs, infoCrowns, stateOrbs, stateCrowns);
            data.state.orbs = finalBalance;
            data.state.crowns = finalBalance; // Mirror for runtime compatibility

            if (finalBalance > 0 && infoOrbs === 0) {
                console.log(`[MIGRATION-ORBS] Recovered/Migrated ${finalBalance} units for ${data.name}`);
            }
            if (data.info.membership) data.state.membership = data.info.membership;
            if (data.info.active_buffs) data.state.active_buffs = data.info.active_buffs;
            if (data.info.inventorySlots !== undefined) data.state.inventorySlots = data.info.inventorySlots;
            if (data.info.extraInventorySlots !== undefined) data.state.extraInventorySlots = data.info.extraInventorySlots;
            if (data.info.unlockedTitles) data.state.unlockedTitles = data.info.unlockedTitles;
        }

        // COMBAT MIGRATION: Inject the separate combat column back into state for runtime
        if (data.combat) {
            data.state.combat = data.combat;
        }

        // DUNGEON MIGRATION: Inject the separate dungeon column back into state for runtime
        if (data.dungeon) {
            data.state.dungeon = data.dungeon;
        }

        // BANK MIGRATION: Inject the separate bank column back into state for runtime
        if (data.bank) {
            data.state.bank = data.bank;
        } else if (!data.state.bank) {
            data.state.bank = { items: {}, slots: 10 };
        }

        // SETTINGS MIGRATION: Inject the separate settings column back into state for runtime
        if (data.settings) {
            data.state.settings = data.settings;
        } else if (!data.state.settings) {
            data.state.settings = {};
        }

        // ITEM MIGRATION: Shield -> Sheath (MUST be before hydration so resolveItem finds it)
        this._migrateShieldToSheath(data);

        // RUNE MIGRATION: SPEED -> AUTO for gathering
        this._migrateRunes(data);

        // THEME MIGRATION: Ensure 'medieval' is always unlocked for everyone
        if (!data.state.unlockedThemes) {
            data.state.unlockedThemes = ['medieval', 'dark', 'light'];
        } else if (!data.state.unlockedThemes.includes('medieval')) {
            data.state.unlockedThemes.push('medieval');
        }

        // Rehydrate the state after loading from database (AFTER injecting columns and migration)
        data.state = hydrateState(data.state || {});

        return data;
    }

    async getGuildBonuses(guildId) {
        if (!guildId) return null;

        const now = Date.now();
        const cached = this.guildBonusesCache.get(guildId);

        // Use cache for 5 minutes
        if (cached && (now - cached.timestamp < 300000)) {
            return cached.bonuses;
        }

        try {
            const { data, error } = await this.supabase
                .from('guilds')
                .select('gathering_xp_level, gathering_duplic_level, gathering_auto_level, refining_xp_level, refining_duplic_level, refining_effic_level, crafting_xp_level, crafting_duplic_level, crafting_effic_level')
                .eq('id', guildId)
                .maybeSingle();

            if (error || !data) return null;

            const bonuses = {
                gathering_xp: STATION_BONUS_TABLE[data.gathering_xp_level || 0] || 0,
                gathering_duplic: STATION_BONUS_TABLE[data.gathering_duplic_level || 0] || 0,
                gathering_auto: STATION_BONUS_TABLE[data.gathering_auto_level || 0] || 0,
                refining_xp: STATION_BONUS_TABLE[data.refining_xp_level || 0] || 0,
                refining_duplic: STATION_BONUS_TABLE[data.refining_duplic_level || 0] || 0,
                refining_effic: STATION_BONUS_TABLE[data.refining_effic_level || 0] || 0,
                crafting_xp: STATION_BONUS_TABLE[data.crafting_xp_level || 0] || 0,
                crafting_duplic: STATION_BONUS_TABLE[data.crafting_duplic_level || 0] || 0,
                crafting_effic: STATION_BONUS_TABLE[data.crafting_effic_level || 0] || 0
            };

            this.guildBonusesCache.set(guildId, {
                bonuses,
                timestamp: now
            });

            return bonuses;
        } catch (err) {
            console.error(`[GUILD-BONUS] Error fetching for ${guildId}:`, err);
            return null;
        }
    }
}
