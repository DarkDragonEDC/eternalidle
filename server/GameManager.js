import crypto from 'crypto';
import fs from 'fs';
import { ITEMS, ALL_RUNE_TYPES, RUNES_BY_CATEGORY, ITEM_LOOKUP, resolveItem } from '../shared/items.js';
import { CHEST_DROP_TABLE, WORLDBOSS_DROP_TABLE, getChestRuneShardRange } from '../shared/chest_drops.js';
import { INITIAL_SKILLS, calculateNextLevelXP, XP_TABLE } from '../shared/skills.js';
import { STATION_BONUS_TABLE } from '../shared/guilds.js';
import { DEFAULT_PLAYER_ATTACK_SPEED, RESPAWN_DELAY_MS } from '../shared/combat.js';
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
import { MigrationManager } from './managers/MigrationManager.js';
import { UserManager } from './managers/UserManager.js';
import { StatsManager } from './managers/StatsManager.js';
import { CatchupManager } from './managers/CatchupManager.js';
import { PersistenceService } from './services/PersistenceService.js';
import { SocketService } from './services/SocketService.js';
import { NotificationService } from './services/NotificationService.js';
import { BanManager } from './managers/BanManager.js';
import { QuestManager } from './managers/QuestManager.js';
import { QUEST_TYPES } from '../shared/quests.js';
import { pruneState, hydrateState } from './utils/statePruner.js';

// Removed local ITEM_LOOKUP generation in favor of shared source of truth


export class GameManager {
    constructor(supabase) {
        this.supabase = supabase;
        // New extracted services
        this.persistence = new PersistenceService(supabase, this);
        this.socket = new SocketService(supabase);

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
        this.migrationManager = new MigrationManager(this);
        this.userManager = new UserManager(this);
        this.statsManager = new StatsManager(this);
        this.catchupManager = new CatchupManager(this);
        this.banManager = new BanManager(this);
        this.quests = new QuestManager(this);
        this.notifications = new NotificationService(this);
        
        // Delegated to PersistenceService
        this.leaderboardCache = new Map(); // type+mode -> { data, timestamp }
        this.LEADERBOARD_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms
        this.guildBonusesCache = new Map(); // guildId -> { bonuses, timestamp }

        // Load Global Stats initially (Delegated to persistence)
        this.statsPromise = this.persistence.statsPromise;

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
            await this.persistence.loadGlobalStats();
            if (this.onGlobalStatsUpdate && this.persistence.globalStats) {
                this.onGlobalStatsUpdate(this.persistence.globalStats);
            }
        }, 1800000); // 30 mins is enough for tax stats

        // 24h Snapshot Check (Every hour)
        setInterval(() => this.persistence.checkTaxSnapshot(), 3600000);
        setTimeout(() => this.persistence.checkTaxSnapshot(), 5000); // Check once shortly after startup

        // Push notification scheduler (Midnight UTC check)
        this.notifications.scheduleMidnightTriggers();

        this.worldBossManager.initialize();

        // All migrations are now handled per-login in getCharacter -> _migrateCharacter
    }

    get userLocks() { return this.persistence.userLocks; }
    get cache() { return this.persistence.cache; }
    get dirty() { return this.persistence.dirty; }
    get globalStats() { return this.persistence.globalStats; }

    markDirty(charId) { return this.persistence.markDirty(charId); }
    async persistCharacter(charId) { return this.persistence.persistCharacter(charId); }
    async persistAllDirty() { return this.persistence.flushDirtyCharacters(); }
    async syncWithDatabase(charId, userId = null) { return this.persistence.syncWithDatabase(charId, userId); }

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
        return this.notifications.broadcast(event, data);
    }

    broadcastToUser(userId, event, data) {
        return this.notifications.broadcastToUser(userId, event, data);
    }

    setSocketServer(io) {
        this.io = io;
        this.socket.setIo(io);
    }

    async getUserIP(userId) {
        try {
            // Check active sockets
            if (this.io) {
                const sockets = await this.io.fetchSockets();
                for (const s of sockets) {
                    if (s.data?.user?.id === userId) {
                        return s.handshake.headers["x-forwarded-for"] || s.handshake.address;
                    }
                }
            }
            // Fallback to DB
            const { data } = await this.supabase
                .from('user_sessions')
                .select('ip_address')
                .eq('user_id', userId)
                .order('last_active_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            return data?.ip_address || 'unknown';
        } catch (err) {
            console.error("[GM-IP] Error fetching user IP:", err);
            return 'unknown';
        }
    }

    async broadcastToCharacter(characterId, event, data) {
        return this.notifications.broadcastToCharacter(characterId, event, data);
    }

    async addActionSummaryNotification(char, title, details) {
        return this.notifications.addActionSummaryNotification(char, title, details);
    }

    async broadcastToGuild(guildId, event, data) {
        return this.notifications.broadcastToGuild(guildId, event, data);
    }

    async updateGlobalTax(amount, source = 'MARKET') {
        return this.persistence.updateGlobalTax(amount, source);
    }

    async flushDirtyCharacters() {
        return this.persistence.flushDirtyCharacters();
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

    async getCharacter(userId, characterId, catchup = false, bypassCache = false) {
        // Guard Clause invalid IDs (undefined string, null, etc)
        if (!characterId || characterId === 'undefined' || characterId === 'null') return null;

        const data = await this.persistence.getCharacter(userId, characterId, bypassCache);
        if (!data) return null;

        if (catchup) {
            try {
                const now = Date.now();
                const lastSaved = data.last_saved ? new Date(data.last_saved).getTime() : now;
                const elapsedSeconds = (now - lastSaved) / 1000;
                
                // Significant if > 1 minute or activity time reached
                const isSignificant = elapsedSeconds >= 60 || 
                    (data.current_activity && elapsedSeconds >= (data.current_activity.time_per_action || 3));

                await this.catchupManager.processCatchup(data, elapsedSeconds, lastSaved, isSignificant);
            } catch (err) {
                console.error(`[CATCHUP-CRASH] Critical error processing character ${data.name}:`, err);
                const fs = await import('fs');
                fs.appendFileSync('catchup_errors.log', `[${new Date().toISOString()}] Error for ${data.name}: ${err.message}\n${err.stack}\n---\n`);
                // Continue despite catchup error to allow login
            }
        }

        if (data.state?.guild_id) {
            data.guild_bonuses = await this.getGuildBonuses(data.state.guild_id);
        }

        return data;
    }

    /**
     * Checks for and applies any rewards from the pending_rewards table.
     */
    async applyPendingRewards(char) {
        if (!char || !char.id) return;
        try {
            const { data: rewards, error } = await this.supabase
                .from('pending_rewards')
                .select('*')
                .eq('character_id', char.id)
                .eq('applied', false);

            if (error) throw error;
            if (!rewards || rewards.length === 0) return;

            console.log(`[REWARDS] Applying ${rewards.length} pending rewards to ${char.name}...`);
            for (const reward of rewards) {
                if (reward.silver_gained) {
                    char.state.silver = (char.state.silver || 0) + Number(reward.silver_gained);
                }
                if (reward.xp_gained) {
                    for (const [skill, amount] of Object.entries(reward.xp_gained)) {
                        this.addXP(char, skill.toUpperCase(), amount);
                    }
                }
                if (reward.loot_gained) {
                    for (const [itemId, qty] of Object.entries(reward.loot_gained)) {
                        this.inventoryManager.addItemToInventory(char, itemId, qty);
                    }
                }
                await this.supabase.from('pending_rewards').update({ applied: true }).eq('id', reward.id);
            }
            this.markDirty(char.id);
        } catch (err) {
            console.error(`[REWARDS-ERROR] Failed to apply rewards for ${char.name}:`, err.message);
        }
    }

    /**
     * Convenience wrapper around getCharacter with re-ordered parameters.
     * Used by all socket handlers.
     * @param {string} userId
     * @param {boolean} catchup - Whether to process offline progress
     * @param {string} characterId
     * @param {boolean} bypassCache - Whether to force a DB fetch
     */
    async getStatus(userId, catchup = false, characterId = null, bypassCache = false) {
        return this.getCharacter(userId, characterId, catchup, bypassCache);
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

        // Add Noob Chest (Moved to Quest reward)
        // initialState.inventory['NOOB_CHEST'] = 1;

        // Calculate initial stats (HP) based on skills
        const tempChar = { state: initialState };
        
        // Initialize Quest System
        if (this.quests) {
            this.quests.initQuestState(tempChar);
        }

        const stats = this.inventoryManager.calculateStats(tempChar);

        initialState.health = stats.maxHP || 100;
        initialState.maxHealth = stats.maxHP || 100;

        console.log(`[SERVER] Final initialState.isIronman: ${initialState.isIronman}`);

        const inventory = initialState.inventory || {};
        delete initialState.inventory;

        const skills = { ...initialState.skills };
        delete initialState.skills;

        const equipment = { ...initialState.equipment } || {};
        delete initialState.equipment;

        const info = {
            stats: initialState.stats || { str: 0, agi: 0, int: 0 },
            health: initialState.health || 100,
            silver: initialState.silver || 0,
            orbs: initialState.orbs || 0,
            crowns: initialState.orbs || 0,
            membership: initialState.membership || null,
            active_buffs: initialState.active_buffs || {},
            inventorySlots: initialState.inventorySlots || 30,
            extraInventorySlots: initialState.extraInventorySlots || 0,
            unlockedTitles: initialState.unlockedTitles || []
        };
        // Remove these from state as they go to 'info' column
        delete initialState.stats;
        delete initialState.health;
        delete initialState.silver;
        delete initialState.orbs;
        delete initialState.crowns;
        delete initialState.membership;
        delete initialState.active_buffs;
        delete initialState.inventorySlots;
        delete initialState.extraInventorySlots;
        delete initialState.unlockedTitles;

        const bank = { items: {}, slots: 10 };
        const settings = {};

        const newId = crypto.randomUUID();

        const { data, error } = await this.supabase
            .from('characters')
            .insert({
                id: newId,
                user_id: userId,
                name: name.trim(),
                inventory: inventory,
                skills: skills,
                equipment: equipment,
                info: info,
                bank: bank,
                settings: settings,
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
            const char = this._hydrateCharacterFromRaw(data);
            this.cache.set(char.id, char);
            return char;
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

        // --- PENDING REWARDS CHECK ---
        // If character is already in cache (bypassCache was false), we might need to check
        // for rewards if they were added while the character was online.
        // For performance, we could add a cooldown or trigger here, but getCharacter
        // already handles it for fresh loads.
        // -----------------------------

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
            isAdmin: !!char.is_admin,
            state: char.state,
            calculatedStats: stats,
            current_activity: char.current_activity,
            activity_started_at: char.activity_started_at,
            dungeon_state: char.state.dungeon,
            globalStats: this.globalStats,
            serverTime: Date.now(),
            guild: await this.guildManager.getCharacterGuild(characterId || char.id),
            guild_bonuses: char.guild_bonuses,
            banWarning: (ban && ban.level === 1 && !ban.ack) ? ban.reason : null,
            offlineReport: char.offlineReport
        };

        return status;
    }

    /**
     * Counts the total number of characters that have an active activity, combat, or dungeon session.
     * This is used for the "Online Players" display, reflecting anyone progressing in the idle game.
     */
    async getActivePlayersCount() {
        try {
            // Count unique user_ids instead of total characters.
            // This ensures one "player" is counted even if they have 2 active characters.
            const { data, error } = await this.supabase
                .from('characters')
                .select('user_id')
                .or('current_activity.not.is.null,combat.not.is.null,dungeon.not.is.null');

            if (error) throw error;
            if (!data) return 0;

            const uniquePlayers = new Set(data.map(char => char.user_id));
            return uniquePlayers.size;
        } catch (err) {
            console.error('[SERVER] Error counting active players:', err);
            return 0;
        }
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

    async runTaskWithRollback(char, taskName, task) {
        // Deep clone state for rollback
        const originalState = JSON.parse(JSON.stringify(char.state));
        try {
            return await task();
        } catch (err) {
            console.error(`[ROLLBACK] Critical error in ${taskName} for ${char.name}:`, err);
            
            // Restore state
            char.state = originalState;
            this.markDirty(char.id);

            // Notify user
            this.notifications.addNotification(char, 'SYSTEM', 
                `⚠️ An internal error occurred during ${taskName}. Your immediate progress has been restored to ensure data consistency.`
            );

            // Log detailed error for developers
            const logMsg = `[${new Date().toISOString()}] ROLLBACK (${taskName}) for ${char.name} (${char.id}): ${err.message}\n${err.stack}\n---\n`;
            fs.appendFileSync('rollback_errors.log', logMsg);

            return { error: err.message, rolledBack: true };
        }
    }

    async processTick(userId, characterId, fullSync = false) {
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
                await this.activityManager.stopActivity(char.user_id, char.id);
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
                    const normalizedType = type.toUpperCase();
                    const activityResult = await this.runTaskWithRollback(char, `Activity (${normalizedType})`, async () => {
                        let result = null;
                        switch (normalizedType) {
                            case 'GATHERING': result = await this.activityManager.processGathering(char, item); break;
                            case 'REFINING': result = await this.activityManager.processRefining(char, item); break;
                            case 'CRAFTING': result = await this.activityManager.processCrafting(char, item); break;
                        }
                        return result;
                    });

                    if (activityResult && activityResult.rolledBack) {
                        char.current_activity = null; // Kill the activity on crash
                        return { success: false, message: "Activity failed and state was restored." };
                    }
                    result = activityResult;

                    char.current_activity.next_action_at = targetTime + (time_per_action * 1000);
                    if (now - char.current_activity.next_action_at > 5000) {
                        char.current_activity.next_action_at = now + (time_per_action * 1000);
                    }

                    if (result && !result.error) {
                        itemsGained++;
                        if (result.leveledUp) leveledUp = result.leveledUp;
                        lastActivityResult = result;

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

                            if (result.isDuplication) {
                                activity.duplicationCount = (activity.duplicationCount || 0) + 1;
                            }
                            if (result.isAutoRefine || result.refinedItemGained) {
                                activity.autoRefineCount = (activity.autoRefineCount || 0) + 1;
                            }
                        }

                        const newActionsRemaining = actions_remaining - 1;
                        if (newActionsRemaining <= 0) {
                            await this.activityManager.stopActivity(char.user_id, char.id, true, targetTime);
                            if (char.user_id) {
                                this.pushManager.notifyUser(
                                    char.user_id,
                                    'push_activity_finished',
                                    'Activity Finished! ✅',
                                    `Your activity is complete. Tap to start a new one!`,
                                    '/activities'
                                );
                            }
                        } else {
                            char.current_activity.actions_remaining = newActionsRemaining;
                        }
                    } else {
                        // For failure (e.g. no ingredients), handle transition to next queued item
                        await this.activityManager.stopActivity(char.user_id, char.id, true, now);
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
            const atkSpeed = Math.max(200, Number(stats.attackSpeed) || DEFAULT_PLAYER_ATTACK_SPEED);

            // Respawn Delay Check
            if (combat.respawn_at) {
                if (now < combat.respawn_at) {
                    // Waiting for respawn... 
                    // No action this tick, but we continue to return the current status
                } else {
                    // Respawn time reached!
                    combat.mobHealth = combat.mobMaxHealth;
                    combat.mob_next_attack_at = now;
                    // combat.player_next_attack_at = now + atkSpeed; // REMOVED: Do not reset player timer
                    combat.next_attack_at = now; // Reset trigger timer to now
                    delete combat.respawn_at;
                    stateChanged = true;
                }
            }

            let roundsThisTick = 0;
            const MAX_ROUNDS = 20; // Allow catching up faster
            const combatRounds = [];

            while (now >= combat.next_attack_at && roundsThisTick < MAX_ROUNDS && char.state.combat) {
                const roundResult = await this.runTaskWithRollback(char, `Combat Round ${roundsThisTick + 1}`, async () => {
                    return await this.combatManager.processCombatRound(char, combat.next_attack_at);
                });
                roundsThisTick++;

                if (roundResult && roundResult.rolledBack) {
                    // Critical failure in specific round, stop combat
                    delete char.state.combat;
                    this.markDirty(char.id);
                    break;
                }

                if (roundResult) {
                    combatRounds.push(roundResult);
                    combatResult = roundResult;
                }

                // Advance the timer by exactly one interval
                combat.next_attack_at += atkSpeed;
                stateChanged = true;

                // If character died or combat stopped, break the loop
                if (!char.state.combat) break;

                // If Mob Died (Victory), apply delay and break loop
                if (roundResult && roundResult.details && roundResult.details.victory) {
                    combat.next_attack_at = now + RESPAWN_DELAY_MS; // Set next attack to precisely after respawn
                    combat.respawn_at = now + RESPAWN_DELAY_MS; // Set visual/logic blocker
                    stateChanged = true;
                    break; // Stop multiple kills in one tick
                }
            }

            // If we have multiple rounds, we attach them to the result
            if (combatRounds.length > 0) {
                const primary = combatResult || combatRounds[0];
                combatResult = {
                    ...primary,
                    allRounds: combatRounds.length > 3 ? combatRounds.slice(-3) : combatRounds,
                    _roundsOmitted: Math.max(0, combatRounds.length - 3),
                    details: {
                        ...primary.details,
                        totalPlayerDmgThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.playerDmg || 0), 0),
                        totalMobDmgThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.mobDmg || 0), 0),
                        totalSilverThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.silverGained || 0), 0),
                        totalXpThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.xpGained || 0), 0),
                    }
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
                status: fullSync ? await this.getStatus(char.user_id, false, char.id) : await this.getLightweightStatus(char)
            };
            return returnObj;
        }
        return lastActivityResult || combatResult;
    }

    /**
     * Returns a minimal version of the character status for frequent WebSocket updates.
     * This excludes heavy fields like inventory, bank, and full skill list unless requested.
     */
    async getLightweightStatus(char) {
        if (!char) return null;
        
        const stats = this.inventoryManager.calculateStats(char);
        
        return {
            _lightweight: true,
            character_id: char.id,
            name: char.name,
            state: {
                health: char.state.health,
                maxHealth: char.state.maxHealth,
                silver: char.state.silver,
                combat: char.state.combat,
                dungeon: char.state.dungeon,
                actionQueue: char.state.actionQueue,
                notifications: char.state.notifications?.length > 0 ? char.state.notifications : undefined,
                equipment: char.state.equipment?.food ? { food: char.state.equipment.food } : undefined
            },
            current_activity: char.current_activity,
            activity_started_at: char.activity_started_at,
            serverTime: Date.now()
        };
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
            const guildXpGained = safeAmount * 0.05;
            // The guild manager will handle adding to memory and flushing every 30m
            if (this.guildManager && this.guildManager.addPendingGuildXP) {
                this.guildManager.addPendingGuildXP(char.state.guild_id, guildXpGained, char.id);
            }
        }

        // --- QUEST PROGRESSION (LEVEL) ---
        this.quests.handleProgress(char, QUEST_TYPES.LEVEL, { globalLevel: this.quests.calculateGlobalLevel(char) });

        return leveledUp ? { skill: skillKey, level: skill.level } : null;
    }

    async saveState(charId, state) {
        this.markDirty(charId);
        await this.persistCharacter(charId);
    }

    /**
     * Immediate save wrapper for critical transactions.
     * Guaranteed to attempt a database write and wait for completion.
     */
    async saveStateCritical(charId, state) {
        return await this.persistence.persistCharacterImmediate(charId);
    }

    addNotification(char, type, message) {
        return this.notifications.addNotification(char, type, message);
    }

    async addActionSummaryNotification(char, actionType, stats, itemSuffix = 'Summary') {
        return this.notifications.addActionSummaryNotification(char, actionType, stats, itemSuffix);
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
        const now = nowOverride || Date.now();
        let lastFoodAt = char.state.lastFoodAt || 0;

        // FIX: If lastFoodAt is in the future (set by virtual combat time during catch-up),
        // reset it so the cooldown doesn't permanently block healing after death.
        if (lastFoodAt > now) {
            char.state.lastFoodAt = 0;
            lastFoodAt = 0;
        }

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
        // Eat if the heal fits entirely
        if (food.amount > 0 && (missing >= unitHeal)) {
            const actualHeal = Math.min(unitHeal, missing);

            // Safety break if somehow normalized to non-positive
            if (actualHeal <= 0) return { used: false, amount: 0 };

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
                char.state.combat.foodTier = food.tier || 0;
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

    async getLeaderboard(type = 'LEVEL', mode = 'NORMAL', requesterId = null, forceRefresh = false) {
        const cacheKey = `${type}_${mode}`;
        const now = Date.now();
        const cacheTime = 60 * 1000;

        if (!forceRefresh && this.leaderboardCache.has(cacheKey)) {
            const cached = this.leaderboardCache.get(cacheKey);
            if (now - cached.timestamp < cacheTime) {
                let userRank = null;
                if (requesterId) {
                    const index = cached.data.findIndex(c => c.id === requesterId);
                    if (index !== -1) {
                        userRank = { rank: index + 1, character: cached.data[index] };
                    }
                }
                return { type, mode, top100: cached.data.slice(0, 100), userRank };
            }
        }

        let data = [];
        let error = null;

        if (type === 'GUILDS') {
            const result = await this.supabase
                .from('guilds')
                .select('id, name, tag, level, xp, icon, icon_color, bg_color, country_code, guild_hall_level, guild_members(character_id)')
                .order('level', { ascending: false })
                .order('xp', { ascending: false })
                .limit(100);
            
            data = result.data || [];
            error = result.error;

            if (error) {
                console.error("[RANKING] Guild DB Error:", error);
                return { type, top100: [], userRank: null };
            }

            const processed = data.map(guild => {
                const memberCount = guild.guild_members?.length || 0;
                const maxMembers = 10 + (guild.guild_hall_level || 0) * 2;
                const { guild_members, ...rest } = guild;
                return { ...rest, memberCount, maxMembers };
            });

            this.leaderboardCache.set(cacheKey, { data: processed, timestamp: now });
            return { type, mode, top100: processed, userRank: null };
        }

        // Use the type directly as dbType, the frontend keys now match the DB ranking_type
        const dbType = type;

        if (['LEVEL', 'TOTAL_XP', 'ITEM_POWER'].includes(dbType) || mode === 'IRONMAN') {
            let query = this.supabase
                .from('characters')
                .select('id, name, state, skills, equipment, info, ranking_total_level, ranking_total_xp, ranking_item_power, guild_members(guilds(tag))')
                .eq('is_admin', false);

            if (mode === 'IRONMAN') {
                query = query.contains('state', { isIronman: true });
            } else {
                query = query.not('state', 'cs', '{"isIronman": true}');
            }

            if (dbType === 'LEVEL') {
                query = query.order('ranking_total_level', { ascending: false, nullsFirst: false });
            } else if (dbType === 'TOTAL_XP') {
                query = query.order('ranking_total_xp', { ascending: false, nullsFirst: false });
            } else if (dbType === 'ITEM_POWER') {
                query = query.order('ranking_item_power', { ascending: false, nullsFirst: false });
            } else {
                query = query.order(`skills->${dbType}->totalXp`, { ascending: false, nullsFirst: false });
            }

            const result = await query.limit(100);
            data = result.data || [];
            error = result.error;
        } else {
            const { data: lbData, error: lbError } = await this.supabase
                .from('leaderboards')
                .select('character_id, value')
                .eq('ranking_type', dbType)
                .order('value', { ascending: false })
                .limit(100);

            if (lbError) {
                console.error(`[RANKING] Leaderboards DB Error for ${dbType}:`, lbError);
                return { type, top100: [], userRank: null };
            }

            if (lbData && lbData.length > 0) {
                const ids = lbData.map(entry => entry.character_id);
                const { data: chars, error: charError } = await this.supabase
                    .from('characters')
                    .select('id, name, state, skills, equipment, info, ranking_total_level, ranking_total_xp, ranking_item_power, guild_members(guilds(tag))')
                    .eq('is_admin', false)
                    .in('id', ids);

                if (charError) {
                    console.error("[RANKING] Character Details DB Error:", charError);
                    return { type, top100: [], userRank: null };
                }
                
                // Apply Ironman/Normal filter for skill-based rankings
                let filteredChars = chars || [];
                if (mode === 'IRONMAN') {
                    filteredChars = filteredChars.filter(c => c.state?.isIronman === true);
                } else {
                    filteredChars = filteredChars.filter(c => !c.state?.isIronman);
                }
                
                data = ids.map(id => filteredChars.find(c => c.id === id)).filter(Boolean);
            } else {
                data = [];
            }
        }

        if (error) {
            console.error("[RANKING] DB Error:", error);
            return { type, top100: [], userRank: null };
        }

        const processed = data.map(char => {
            if (!char) return null;
            if (char.skills && char.state) char.state.skills = char.skills;
            if (char.equipment && char.state) char.state.equipment = char.equipment;
            if (char.info?.membership && char.state) char.state.membership = char.info.membership;
            
            // Flatten guild tag if present (Supabase may return object or array)
            if (char.guild_members) {
                const gm = Array.isArray(char.guild_members) ? char.guild_members[0] : char.guild_members;
                char.guild_tag = gm?.guilds?.tag || null;
            } else {
                char.guild_tag = null;
            }
            if (char.state) char.state.guild_tag = char.guild_tag;
            delete char.guild_members;
            
            // OPTIMIZATION: Prune heavy JSON payloads from memory and socket traffic
            // We only need basic visuals/numbers for the Ranking UI, not their entire inventory/setup
            return {
                id: char.id,
                name: char.name,
                guild_tag: char.guild_tag,
                state: {
                    isIronman: char.state?.isIronman,
                    skills: char.state?.skills, // Keep for combat level/type sub-rankings
                    selectedTitle: char.state?.selectedTitle
                },
                ranking_total_level: char.ranking_total_level,
                ranking_total_xp: char.ranking_total_xp,
                ranking_item_power: char.ranking_item_power,
                info: {
                    membership: char.info?.membership,
                    active_title: char.info?.active_title
                }
            };
        }).filter(Boolean);

        this.leaderboardCache.set(cacheKey, { data: processed, timestamp: now });

        let userRank = null;
        if (requesterId) {
            const index = processed.findIndex(c => c.id === requesterId);
            if (index !== -1) {
                userRank = { rank: index + 1, character: processed[index] };
            }
        }

        return { type, mode, top100: processed, userRank };
    }

    // Delegation Methods
    async startActivity(u, c, t, i, q) { return this.activityManager.startActivity(u, c, t, i, q); }
    async stopActivity(u, c) { return this.activityManager.stopActivity(u, c, true); }

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
    async savePushSubscription(u, s) { return this.pushManager.saveSubscription(u, s); }

    // Guild Delegations
    async createGuild(c, data) { return this.guildManager.createGuild(c, data); }
    async updateCustomization(c, data) { return this.guildManager.updateCustomization(c, data); }
    async getCharacterGuild(c) { return this.guildManager.getCharacterGuild(c); }
    async getPublicGuildProfile(g) { return this.guildManager.getPublicGuildProfile(g); }
    async searchGuilds(q, cc, c) { return this.guildManager.searchGuilds(q, cc, c); }
    async leaveGuild(c) { return this.guildManager.leaveGuild(c); }
    async disbandGuild(c) { return this.guildManager.disbandGuild(c); }
    async applyToGuild(c, g) { return this.guildManager.applyToGuild(c, g); }
    async getGuildRequests(c) { return this.guildManager.getGuildRequests(c); }
    async handleGuildRequest(c, r, a) { return this.guildManager.handleGuildRequest(c, r, a); }
    async changeMemberRole(c, data) { return this.guildManager.changeMemberRole(c, data); }
    async updateGuildRole(c, data) { return this.guildManager.updateGuildRole(c, data); }
    async deleteGuildRole(c, r) { return this.guildManager.deleteGuildRole(c, r); }
    async kickMember(c, m) { return this.guildManager.kickMember(c, m); }
    async transferLeadership(c, m) { return this.guildManager.transferLeadership(c, m); }
    async donateSilver(c, a) { return this.guildManager.donateToBank(c, a); }
    async getGuildTasks(c) { return this.guildManager.getGuildTasks(c); }
    async claimGuildTask(c, t) { return this.guildManager.contributeToTask(c, t); }
    async upgradeGuildBuilding(c, b) { return this.guildManager.upgradeBuilding(c, b); }

    async startResting(userId, characterId, percent = 100) {
        const char = await this.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        if (char.state.combat) throw new Error("Cannot rest while in combat");
        if (char.state.dungeon) throw new Error("Cannot rest while in a dungeon");
        if (char.state.resting) throw new Error("Already resting");

        const stats = this.inventoryManager.calculateStats(char);
        const maxHp = stats.maxHP || 100;
        const currentHp = char.state.health || 0;
        
        if (currentHp >= maxHp) throw new Error("You are already at full health");

        // Use the selected percent or default to 100
        const targetPercent = Math.min(100, Math.max(1, parseInt(percent) || 100));
        const targetHp = Math.floor(maxHp * (targetPercent / 100));
        const healAmount = Math.max(0, targetHp - currentHp);

        if (healAmount <= 0) throw new Error("No healing required for this amount");

        const cost = healAmount * 3;
        if ((char.state.silver || 0) < cost) throw new Error("Not enough silver");

        // Duration calculation matching RestPanel.jsx
        // Math.max(1, Math.ceil((healAmount / maxHp) * 100)) * 3 (seconds)
        const durationSeconds = Math.max(1, Math.ceil((healAmount / maxHp) * 100)) * 3;
        const now = Date.now();

        char.state.silver -= cost;
        char.state.resting = {
            startedAt: now,
            endsAt: now + (durationSeconds * 1000),
            healAmount: healAmount,
            cost: cost,
            percent: targetPercent
        };

        this.markDirty(char.id);
        return { success: true, message: `Started resting for ${durationSeconds}s` };
    }

    async stopResting(userId, characterId) {
        const char = await this.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");
        if (!char.state.resting) return { success: false, message: "Not resting" };

        // Refund silver
        const refund = char.state.resting.cost || 0;
        char.state.silver = (char.state.silver || 0) + refund;
        
        delete char.state.resting;
        this.markDirty(char.id);
        
        return { success: true, message: "Resting cancelled and silver refunded" };
    }

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
                // Quest Progress
                this.quests.handleProgress(char, QUEST_TYPES.OPEN, { itemId: itemData.id });

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

        // 8. Quest Progress Hook
        this.quests.handleProgress(char, QUEST_TYPES.CRAFT_RUNE, { count });

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

        // 9. Quest Progress Hook
        this.quests.handleProgress(char, QUEST_TYPES.FUSE_RUNE, { count });

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

        // Auto Merge is now free for everyone.

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

        // Quest Progress Hook for Auto Merging
        if (totalUpgrades > 0) {
            this.quests.handleProgress(char, QUEST_TYPES.FUSE_RUNE, { count: totalUpgrades });
        }

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

        // 3. Fetch up-to-date guild info (Tag + Name)
        let guildDisplay = char.state?.guildName || null;
        let guildId = char.state?.guild_id || null;
        try {
            const { data: memberData } = await this.supabase
                .from('guild_members')
                .select(`
                    guild_id,
                    guilds (name, tag)
                `)
                .eq('character_id', char.id)
                .maybeSingle();

            if (memberData && memberData.guilds) {
                guildDisplay = `[${memberData.guilds.tag}] ${memberData.guilds.name}`;
                guildId = memberData.guild_id;
            } else {
                guildDisplay = null;
                guildId = null;
            }
        } catch (e) {
            console.error("Error fetching guild for public profile:", e);
        }

        // 4. Prune data for public consumption
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
            // Fetch real-time guild if available
            guildName: guildDisplay,
            guildId: guildId,
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

        // Propagate guild_tag to state for UI convenience
        if (data.guild_tag) {
            data.state.guild_tag = data.guild_tag;
        }

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

        // Trigger character data migration and cleanup
        this.migrationManager.migrateCharacter(data);

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
