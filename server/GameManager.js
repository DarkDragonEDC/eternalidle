import crypto from 'crypto';
import { ITEMS, ALL_RUNE_TYPES, RUNES_BY_CATEGORY, ITEM_LOOKUP } from '../shared/items.js';
import { CHEST_DROP_TABLE } from '../shared/chest_drops.js';
import { INITIAL_SKILLS, calculateNextLevelXP } from '../shared/skills.js';
import { InventoryManager } from './managers/InventoryManager.js';
import { ActivityManager } from './managers/ActivityManager.js';
import { CombatManager } from './managers/CombatManager.js';
import { MarketManager } from './managers/MarketManager.js';
import { DungeonManager } from './managers/DungeonManager.js';
import { CrownsManager } from './managers/CrownsManager.js';
import { AdminManager } from './managers/AdminManager.js';
import { DailyRewardManager } from './managers/DailyRewardManager.js';
import { TradeManager } from './managers/TradeManager.js';
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
        this.crownsManager = new CrownsManager(this);
        this.adminManager = new AdminManager(this);
        this.dailyRewardManager = new DailyRewardManager(this);
        this.tradeManager = new TradeManager(this);
        this.userLocks = new Map(); // userId -> Promise (current task)
        this.cache = new Map(); // charId -> character object
        this.dirty = new Set(); // set of charIds that need persisting
        this.globalStats = { total_market_tax: 0 };

        // Load Global Stats initially
        this.loadGlobalStats();

        // Periodic Persistence Loop (Every 60 seconds)
        setInterval(async () => {
            try {
                await this.flushDirtyCharacters();
                await this.loadGlobalStats(); // Keep global stats in sync
            } catch (err) {
                console.error('[DB] Error in periodic flush loop:', err);
            }
        }, 60000);
    }

    async loadGlobalStats() {
        try {
            const { data, error } = await this.supabase
                .from('global_stats')
                .select('*')
                .eq('id', 'global')
                .single();

            if (!error && data) {
                this.globalStats = {
                    total_market_tax: Number(data.total_market_tax) || 0
                };
            }
        } catch (err) {
            console.error('[DB] Error loading global stats:', err);
        }
    }

    async updateGlobalTax(amount) {
        if (!amount || amount <= 0) return;

        try {
            if (!this.globalStats) {
                this.globalStats = { total_market_tax: 0 };
            }
            this.globalStats.total_market_tax += Math.floor(amount);

            // Notify all clients IMMEDIATELY for real-time feel
            if (this.onGlobalStatsUpdate) {
                this.onGlobalStatsUpdate(this.globalStats);
            }

            // Persist to DB in the background (no need to await for UI feel, but we keep it for safety in this method)
            // Or better yet, don't block the method return if possible, but since it's async we'll just move the broadcast up.
            const { error } = await this.supabase.rpc('increment_global_tax', { amount: Math.floor(amount) });

            if (error) {
                await this.supabase
                    .from('global_stats')
                    .update({
                        total_market_tax: this.globalStats.total_market_tax,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', 'global');
            }
        } catch (err) {
            console.error('[DB] Error updating global tax:', err);
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
            console.error(`[HASH-ERROR] Failed to calculate hash:`, err);
            return 'error-' + Date.now();
        }
    }

    async getCharacter(userId, characterId = null, catchup = false, bypassCache = false) {
        // Try Cache first
        if (characterId && this.cache.has(characterId) && !bypassCache) {
            // console.log(`[CACHE] Hit for ${characterId}`);
            const cachedChar = this.cache.get(characterId);

            // CRITICAL: Even if it's a cache hit, if catchup is requested, we MUST run it
            // if the character has been 'idle' in the cache.
            if (catchup && (cachedChar.current_activity || cachedChar.state?.combat || cachedChar.state?.dungeon)) {
                // Continue to catchup logic below instead of returning immediately
            } else {
                return cachedChar;
            }
        }

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

        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            // Always update cache when we fetch from DB (especially for bypassCache)
            this.cache.set(data.id, data);
        }



        if (data) {
            // Rehydrate the state after loading from database
            data.state = hydrateState(data.state || {});

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

            // Attach a snapshot hash of the DB state to detect external changes
            data.dbHash = this.calculateHash(data.state);

            let updated = false;
            // Time variables for catchup logic
            const now = new Date();
            let lastSaved = data.last_saved ? new Date(data.last_saved).getTime() : now.getTime();
            let elapsedSeconds = (now.getTime() - lastSaved) / 1000;

            // Simplified report structure for potential offline gains
            let finalReport = {
                elapsedTime: elapsedSeconds,
                totalTime: 0,
                itemsGained: {},
                xpGained: {},
                combat: null
            };

            if (!data.state.skills) {
                data.state.skills = { ...INITIAL_SKILLS };
                updated = true;
            } else {
                // Patch missing skills for existing characters
                for (const skillKey in INITIAL_SKILLS) {
                    if (!data.state.skills[skillKey]) {
                        console.log(`[PATCH] Adding missing skill ${skillKey} to char ${data.name}`);
                        data.state.skills[skillKey] = { ...INITIAL_SKILLS[skillKey] };
                        updated = true;
                    }
                }
            }

            if (!data.state.stats) {
                data.state.stats = { str: 0, agi: 0, int: 0 };
                updated = true;
            }

            // --- RUNTIME MIGRATION: CHESTS ---
            // Fixes issue where running server overwrites DB migration
            if (data.state.inventory) {
                const inv = data.state.inventory;
                let migratedChests = false;
                for (const key of Object.keys(inv)) {
                    let newKey = key;
                    if (key.includes('_CHEST_COMMON')) newKey = key.replace('_CHEST_COMMON', '_CHEST_NORMAL');
                    else if (key.includes('_CHEST_RARE')) newKey = key.replace('_CHEST_RARE', '_CHEST_OUTSTANDING');
                    else if (key.includes('_CHEST_GOLD')) newKey = key.replace('_CHEST_GOLD', '_CHEST_EXCELLENT');
                    else if (key.includes('_CHEST_MYTHIC')) newKey = key.replace('_CHEST_MYTHIC', '_CHEST_MASTERPIECE');
                    else if (key.includes('_DUNGEON_CHEST')) newKey = key.replace('_DUNGEON_CHEST', '_CHEST_NORMAL');

                    if (newKey !== key) {
                        console.log(`[MIGRATION-RUNTIME] Converting ${key} -> ${newKey} for ${data.name}`);
                        if (inv[newKey]) {
                            // Merge quantities
                            if (typeof inv[key] === 'number') inv[newKey] += inv[key];
                            else inv[newKey].qty += inv[key].qty;
                        } else {
                            inv[newKey] = inv[key];
                        }
                        delete inv[key];
                        migratedChests = true;
                    }
                }
                if (migratedChests) updated = true;
            }

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

            // --- IRONMAN MIGRATION (DEPRECATED/HEAVY) ---
            /* 
            if (userId && !data.state.isIronman) {
                const { data: allChars } = await this.supabase
                    .from('characters')
                    .select('id, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: true });
    
                if (allChars && allChars.length >= 2 && allChars[1].id === data.id) {
                    console.log(`[IRONMAN] Migrating second character ${data.name} to Ironman mode.`);
                    data.state.isIronman = true;
                    updated = true;
                }
            }
            */

            if (catchup && (data.current_activity || data.state.combat || data.state.dungeon) && data.last_saved) {
                console.log(`[CATCHUP] ${data.name}: last_saved=${data.last_saved}, elapsed=${elapsedSeconds.toFixed(1)}s, hasActivity=${!!data.current_activity}, hasCombat=${!!data.state.combat}`);

                if (data.current_activity && data.activity_started_at) {
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

                // Update last_saved based on ACTUAL time processed, not wall-clock time
                // This preserves "fragments" of time (e.g. if you have 40s but need 60s for a tick)
                // Protection: totalTime must not exceed elapsedSeconds
                finalReport.totalTime = Math.min(finalReport.totalTime, elapsedSeconds);
                const processedMs = Math.floor(finalReport.totalTime * 1000);
                const nextSavedDate = new Date(lastSaved + processedMs);
                data.last_saved = nextSavedDate.toISOString();

                console.log(`[CATCHUP] ${data.name} finished. Processed: ${finalReport.totalTime.toFixed(1)}s, Remaining in buffer: ${(elapsedSeconds - finalReport.totalTime).toFixed(1)}s. New last_saved: ${data.last_saved}`);

                // Sync activity_started_at with actual progress to prevent timer drift in UI
                if (data.current_activity && data.activity_started_at) {
                    const { initial_quantity, actions_remaining, time_per_action } = data.current_activity;
                    const tpa = time_per_action || 3;

                    // Defensive: if initial_quantity is missing, we use a sensible fallback
                    // to avoid resetting the visual timer to 0.
                    const iqty = initial_quantity || (actions_remaining + Math.floor(finalReport.totalTime / tpa));
                    const doneQty = Math.max(0, iqty - actions_remaining);
                    const elapsedVirtual = doneQty * tpa;

                    // Reset start time so client timer (Now - Start) matches progress (ElapsedVirtual)
                    // NewStart = Now - WorkDoneTime
                    const newStart = new Date(Date.now() - (elapsedVirtual * 1000));
                    data.activity_started_at = newStart.toISOString();

                    // Ensure initial_quantity is persisted if it was missing
                    if (!data.current_activity.initial_quantity) {
                        data.current_activity.initial_quantity = iqty;
                    }
                }

                // Add wall-clock elapsed time to report for UI accuracy
                finalReport.elapsedTime = elapsedSeconds;

                // Update the local dbHash to current state since we just processed it
                // REMOVED: saveCharacter handles hash update to ensure consistency
                // data.dbHash = this.calculateHash(data.state);
            }

            // Shard Migration Logic: Convert any T2+ shards to T1
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

            // Membership Migration: Convert ETERNAL_MEMBERSHIP to MEMBERSHIP
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

            // Only show the modal if total catchup was significant
            const hasNotableGains = finalReport.totalTime > 120 || Object.keys(finalReport.itemsGained).length > 0;
            if (hasNotableGains) {
                data.offlineReport = finalReport;

                // Trigger a system notification for the offline gain
                this.addActionSummaryNotification(data, 'Offline Progress', {
                    itemsGained: finalReport.itemsGained,
                    xpGained: finalReport.xpGained,
                    totalTime: finalReport.totalTime,
                    elapsedTime: elapsedSeconds,
                    kills: finalReport.combat?.kills || 0,
                    silverGained: finalReport.combat?.silverGained || 0
                });
            }

            if (updated) {
                // FIX: Must mark dirty so persistCharacter actually does the work
                this.markDirty(data.id);
                // FIX: Persist immediately after catchup to ensure gains aren't lost if server shuts down
                await this.persistCharacter(data.id);

                // FIX: Explicitly update the cache with the modified data after persist
                // This ensures any subsequent getStatus calls use the fresh data, not stale cache
                this.cache.set(data.id, data);
            }

        }
        return data;
    }

    removeFromCache(charId) {
        this.cache.delete(charId);
        this.dirty.delete(charId);
    }

    markDirty(charId) {
        this.dirty.add(charId);
    }

    async persistCharacter(charId) {
        if (!this.dirty.has(charId)) {
            // console.log(`[DB] Skipping persistence for ${charId} (not dirty)`);
            return;
        }
        const char = this.cache.get(charId);
        if (!char) return;

        // --- Optimistic Locking Check ---
        // Fetch current last_saved from DB to verify we aren't overwriting someone else's newer data
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
                // Force cache to mark as clean and delete from cache to force reload on next access
                this.dirty.delete(charId);
                this.cache.delete(charId);
                return;
            }
        }

        // Create a pruned version of the state for storage
        const prunedState = JSON.parse(JSON.stringify(char.state));

        // INVENTORY MIGRATION: Extract inventory to its own column and remove from state JSON
        const inventoryToSave = prunedState.inventory || {};
        delete prunedState.inventory;

        // SKILLS MIGRATION: Extract skills to its own column and remove from state JSON
        const skillsToSave = prunedState.skills || {};
        delete prunedState.skills;

        const finalPrunedState = pruneState(prunedState);

        // console.log(`[DB] Persisting character ${char.name} (${charId})`);
        const saveTime = new Date().toISOString();
        const { error } = await this.supabase
            .from('characters')
            .update({
                inventory: inventoryToSave,
                skills: skillsToSave,
                state: finalPrunedState,
                current_activity: char.current_activity,
                activity_started_at: char.activity_started_at,
                last_saved: saveTime
            })
            .eq('id', charId);

        if (!error) {
            // Update snapshot hash and last_saved after successful save
            char.last_saved = saveTime;
            char.dbHash = this.calculateHash(char.state);
            this.dirty.delete(charId);
        } else {
            console.error(`[DB] Error persisting ${char.name}:`, error);
        }
    }

    async syncWithDatabase(charId, userId = null) {
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
        const item = ITEM_LOOKUP[char.current_activity.item_id];
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
                if (result.xpGained) {
                    const stats = this.inventoryManager.calculateStats(char);
                    const globalBonus = stats.globals?.xpYield || 0;
                    const catBonus = stats.xpBonus?.[type] || 0; // type is 'GATHERING', 'REFINING', etc.

                    const finalXp = Math.floor(result.xpGained * (1 + (globalBonus + catBonus) / 100));
                    xpGained[result.skillKey] = (xpGained[result.skillKey] || 0) + finalXp;
                }
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
            return { processed, leveledUp, itemsGained, xpGained, totalTime: processed * timePerAction, stopReason };
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
                        result.details.lootGained.forEach(itemId => {
                            itemsGained[itemId] = (itemsGained[itemId] || 0) + 1;
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

            // Optimization: If WALKING, skip as much as possible
            if (dungeonState.status === 'WALKING' && dungeonState.wave_started_at) {
                const waveDuration = 60 * 1000;
                const waveElapsed = virtualNow - new Date(dungeonState.wave_started_at).getTime();
                const msLeft = waveDuration - waveElapsed;
                const secondsLeftInWave = Math.ceil(msLeft / 1000);

                if (secondsLeftInWave > 0) {
                    const skip = Math.min(remainingSeconds, secondsLeftInWave, 10); // Skip up to 10s or wave end
                    if (skip > 1) {
                        virtualNow += (skip * 1000);
                        remainingSeconds -= skip;
                        // We don't call processDungeonTick here, but we need to let it trigger the next wave if skip hits the end
                        if (skip < secondsLeftInWave) continue;
                    }
                }
            }

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
            isIronman: !!isIronman // USE THE FLAG PROVIDED
        };

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
        // 1. Verify existence and ownership
        const { data: char, error: fetchError } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !char) throw new Error("Character not found or access denied.");

        // 2. Cleanup related data (Market Listings)
        // Note: seller_id is userId, but to be safe we should clean by character metadata if possible.
        // Since seller_character_id column is missing, we use characterId in item_data workaround if we have it, 
        // or just accept that listings stay until expiration if we only have userId.
        // Actually, let's delete all listings by this character name or characterId in metadata
        await this.supabase
            .from('market_listings')
            .delete()
            .eq('seller_id', userId)
            .eq('seller_name', char.name);

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
        const char = await this.getCharacter(userId, characterId, catchup, bypassCache);
        if (!char) return { noCharacter: true };

        const stats = this.inventoryManager.calculateStats(char);

        const status = {
            character_id: char.id,
            user_id: char.user_id,
            name: char.name,
            state: char.state,
            calculatedStats: stats,
            current_activity: char.current_activity,
            activity_started_at: char.activity_started_at,
            dungeon_state: char.dungeon_state,
            offlineReport: char.offlineReport,
            globalStats: this.globalStats,
            serverTime: Date.now()
        };

        // Clear report from memory after it's been included in status once
        // (Wait, better but not enough if the client hasn't received it yet)
        // Let's stick to the explicit acknowledgment plan.
        return status;
    }

    async clearOfflineReport(userId, characterId) {
        const char = await this.getCharacter(userId, characterId);
        if (char) {
            char.offlineReport = null;
            // Note: If offlineReport is in its own column, we might need a direct update.
            // But if it's transient (not in state), then the server will just clear it from memory.
            // However, the user says it "opens with a farm that is not mine".
            // If it's stored in the 'state', we MUST clear it there.
        }
    }

    async runMaintenance() {
        const nowMs = Date.now();
        console.log(`[MAINTENANCE] Starting background cleanup (Dynamic Limits 8h/12h)...`);

        try {
            // Find all characters with any active activity
            const { data: allActive, error } = await this.supabase
                .from('characters')
                .select('id, user_id, name, current_activity, state, activity_started_at')
                .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

            if (error) throw error;

            if (!allActive || allActive.length === 0) {
                console.log("[MAINTENANCE] No active characters found.");
                return;
            }

            const toCleanup = allActive.filter(char => {
                const limitMs = this.getMaxIdleTime(char);
                let startTime = null;
                if (char.state.dungeon && char.state.dungeon.started_at) {
                    startTime = new Date(char.state.dungeon.started_at);
                } else if (char.state.combat && char.state.combat.started_at) {
                    startTime = new Date(char.state.combat.started_at);
                } else if (char.current_activity && char.activity_started_at) {
                    startTime = new Date(char.activity_started_at);
                }

                if (startTime && !isNaN(startTime.getTime())) {
                    return (nowMs - startTime.getTime()) > limitMs;
                }
                return false;
            });

            if (toCleanup.length === 0) {
                console.log("[MAINTENANCE] No characters found exceeding their respective idle limits.");
                return;
            }

            console.log(`[MAINTENANCE] Found ${toCleanup.length} characters to clean up.`);

            for (const char of toCleanup) {
                console.log(`[MAINTENANCE] Cleaning up ${char.name} (${char.id})...`);
                // Calling getCharacter with catchup=true will process gains up to 12h and clear the activity
                await this.executeLocked(char.user_id, async () => {
                    await this.getCharacter(char.user_id, char.id, true);
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

        // Only sync last_saved if we aren't currently waiting for a persistence sync or a catchup just happened
        // If we set it here inconditionally, we might stomp over the catchup leftovers
        if (!this.isLocked(userId)) {
            char.last_saved = new Date().toISOString();
        }

        const foodResult = this.processFood(char);
        const foodUsed = foodResult.used;

        if (!char.current_activity && !char.state.combat && !foodUsed && !char.state.dungeon) return null;

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
                delete char.state.combat;
                hasChanges = true;
            }
        }

        // Independent Dungeon Limit Check
        if (char.state.dungeon && char.state.dungeon.started_at) {
            if (now - new Date(char.state.dungeon.started_at).getTime() > IDLE_LIMIT_MS) {
                console.log(`[LIMIT] ${limitHours}h dungeon limit reached for ${char.name}. Stopping dungeon.`);
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

        if (char.current_activity) {
            const { type, item_id, actions_remaining, time_per_action = 3, next_action_at } = char.current_activity;
            let targetTime = Number(next_action_at);
            if (!targetTime) {
                targetTime = now + (time_per_action * 1000);
                char.current_activity.next_action_at = targetTime;
            }

            if (now >= targetTime) {
                const item = ITEM_LOOKUP[item_id];
                if (!item) {
                    console.error(`[ProcessTick] Item not found in LOOKUP: ${item_id}`);
                    char.current_activity = null;
                    return { success: false, message: "Item not found" };
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
                            if (result.xpGained) {
                                const stats = this.inventoryManager.calculateStats(char);
                                const xpBonus = stats.globals?.xpYield || 0;
                                const finalXp = Math.floor(result.xpGained * (1 + xpBonus / 100));
                                activity.sessionXp = (activity.sessionXp || 0) + finalXp;
                            }
                        }

                        const newActionsRemaining = actions_remaining - 1;
                        if (result.isDuplication) {
                            console.log(`[ACTIVITY-LOG] Duplication Hit! User=${char.name}, Item=${result.itemGained}, RemBefore=${actions_remaining}, RemAfter=${newActionsRemaining}`);
                        }

                        activityFinished = newActionsRemaining <= 0;
                        if (activityFinished) {
                            // Generate final report before clearing
                            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
                            this.addActionSummaryNotification(char, activity.type, {
                                itemsGained: activity.sessionItems,
                                xpGained: { [result.skillKey]: activity.sessionXp },
                                totalTime: elapsedSeconds
                            });

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
                                totalTime: elapsedSeconds
                            });
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

            // Respawn Delay Check
            if (combat.respawn_at) {
                if (now < combat.respawn_at) {
                    // Waiting for respawn...
                    return null; // Skip processing this tick
                } else {
                    // Respawn time reached!
                    combat.mobHealth = combat.mobMaxHealth;
                    delete combat.respawn_at;
                    stateChanged = true;
                }
            }

            const stats = this.inventoryManager.calculateStats(char);
            const atkSpeed = Math.max(200, Number(stats.attackSpeed) || 1000);
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

                        // COMIDA ONLINE: Consumir comida ENTRE os rounds de uma Ãºnica tick para evitar morte por burst
                        this.processFood(char);
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

        if (itemsGained > 0 || combatResult || foodUsed || activityFinished || stateChanged || dungeonResult) {
            this.markDirty(char.id);
        }

        if (char.current_activity || char.state.combat || itemsGained > 0 || combatResult || dungeonResult) {
            const returnObj = {
                success: true,
                message: lastActivityResult?.message || combatResult?.message || dungeonResult?.dungeonUpdate?.message || (foodUsed ? "Food consumed" : ""),
                leveledUp,
                activityFinished,
                combatUpdate: combatResult,
                dungeonUpdate: dungeonResult?.dungeonUpdate,
                healingUpdate: foodUsed ? { amount: foodResult.amount, source: 'FOOD' } : null,
                status: {
                    character_id: char.id,
                    user_id: char.user_id,
                    name: char.name,
                    state: char.state,
                    calculatedStats: this.inventoryManager.calculateStats(char),
                    current_activity: char.current_activity,
                    activity_started_at: char.activity_started_at,
                    dungeon_state: char.state.dungeon,
                    serverTime: Date.now()
                }
            };
            if (char.state.combat) {
                // console.log(`[DEBUG-TICK] Sending Status. Kills: ${char.state.combat.kills}`);
            }
            return returnObj;
        }
        return lastActivityResult || combatResult;
    }

    addXP(char, skillKey, amount) {
        if (!skillKey || !char.state.skills[skillKey]) return null;
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

    addActionSummaryNotification(char, actionType, stats) {
        // console.log(`[DEBUG] addActionSummaryNotification for ${char.name}. Type: ${actionType}`);
        // stats can be offlineReport or a simple gains object
        // { itemsGained: {}, xpGained: {}, totalTime: seconds, kills?: number, silverGained?: number, elapsedTime?: number }
        const { itemsGained, xpGained, totalTime, kills, silverGained, elapsedTime } = stats;

        let timeVal = totalTime || elapsedTime || 0;
        let timeStr = "";
        if (timeVal < 60) timeStr = `${Math.floor(timeVal)}s`;
        else if (timeVal < 3600) timeStr = `${Math.floor(timeVal / 60)}m ${Math.floor(timeVal % 60)}s`;
        else timeStr = `${Math.floor(timeVal / 3600)}h ${Math.floor((timeVal % 3600) / 60)}m`;

        let message = `ðŸ“œ ${actionType} Summary\n`;
        message += `â±ï¸ ${timeStr}`;

        if (kills) message += `\nðŸ’€ ${kills} Kills`;

        for (const [skill, xp] of Object.entries(xpGained || {})) {
            if (xp > 0) message += `\nâœ¨ +${xp} ${skill.replace(/_/g, ' ')}`;
        }

        if (silverGained) message += `\nðŸ’° +${silverGained.toLocaleString()} Silver`;

        const itemEntries = Object.entries(itemsGained || {});
        if (itemEntries.length > 0) {
            message += `\nðŸ“¦ Loot:`;
            for (const [id, qty] of itemEntries) {
                message += `\n â€¢ ${qty}x ${id.replace(/_/g, ' ')}`;
            }
        }

        // console.log(`[NOTIF] Adding system notif for ${char.name}: ${message}`);
        // this.addNotification(char, 'SYSTEM', message);
    }

    processFood(char, nowOverride = null) {
        if (!char.state.equipment || !char.state.equipment.food) return { used: false, amount: 0 };
        const food = char.state.equipment.food;
        if (!food.heal || !food.amount) return { used: false, amount: 0 };

        const inCombat = !!char.state.combat;
        const stats = this.inventoryManager.calculateStats(char, nowOverride);
        const maxHp = stats.maxHP;
        let currentHp = inCombat ? (char.state.combat.playerHealth || 0) : (char.state.health || 0);
        let eatenCount = 0;
        let totalHealed = 0;
        const MAX_EATS_PER_TICK = 50;

        // Eat while HP is missing and we haven't hit the massive limit
        // STRICT RULE: Only eat if the heal fits entirely (No Waste)
        while (food.amount > 0 && eatenCount < MAX_EATS_PER_TICK) {
            const missing = maxHp - currentHp;
            const hpPercent = (currentHp / maxHp) * 100;

            // SAFETY RULE: Eat if the heal fits entirely OR if HP is dangerously low (< 40%)
            if (missing >= food.heal || hpPercent < 40) {
                const actualHeal = Math.min(food.heal, missing);
                if (actualHeal <= 0 && hpPercent >= 40) break; // Safety break

                currentHp = currentHp + actualHeal;
                food.amount--;
                eatenCount++;
                totalHealed += actualHeal;

                // Update instantly to recalculate 'missing' for next loop iteration
                char.state.health = currentHp;
                if (inCombat) {
                    char.state.combat.playerHealth = currentHp;
                }
            } else {
                break;
            }
        }

        if (food.amount <= 0) {
            delete char.state.equipment.food;
        }

        return { used: eatenCount > 0, amount: totalHealed, eaten: eatenCount };
    }

    async getLeaderboard(type = 'COMBAT', requesterId = null, mode = 'NORMAL') {
        // console.log(`[RANKING] Fetching leaderboard for type: ${type}, mode: ${mode}`);
        let query = this.supabase
            .from('characters')
            .select('id, name, state')
            .or('is_admin.is.null,is_admin.eq.false'); // Exclude admins

        // Mode Filtering
        if (mode === 'IRONMAN') {
            // Check if isIronman is true in the state JSON
            // Postgres JSONB query for boolean true
            query = query.contains('state', { isIronman: true });
        } else {
            // NORMAL mode: isIronman is false OR null/undefined
            // We use 'not' contains { isIronman: true } to cover both false and missing
            // But Supabase/PostgREST 'not.cs' might be tricky.
            // Alternative: Filter in memory if dataset is small, but for 1000 limit, better DB side.
            // Let's rely on filter-in-memory for "NORMAL" to ensure we handle 'undefined' correctly without complex JSONB queries,
            // OR use a raw filter if needed.
            // For now, let's fetch slightly more and filter in memory for robustness, 
            // as 'isIronman' might be missing on old chars.
        }

        // Increased limit to 2000 to allow in-memory filtering effectively
        const { data, error } = await query.limit(2000);
        if (error) {
            console.error("[RANKING] DB Error:", error);
            return { type, top100: [], userRank: null };
        }

        if (!data) return { type, top100: [], userRank: null };

        const sortKey = type || 'COMBAT';

        const getVal = (char, key) => {
            if (key === 'SILVER') return char.state.silver || 0;
            if (key === 'LEVEL') {
                // Total Level
                return Object.values(char.state.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
            }
            // Specific Skill
            const skill = char.state.skills?.[key] || { level: 1, xp: 0 };
            // Return a composite value for sorting: Level * 1Billion + XP
            // This ensures Level is primary, XP is secondary
            return (skill.level * 1000000000) + skill.xp;
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

    async equipItem(u, c, i) { return this.inventoryManager.equipItem(u, c, i); }
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
    async consumeItem(userId, characterId, itemId, quantity = 1) {
        console.log(`[DEBUG-POTION] consumeItem called for ${characterId}, item: ${itemId}, qty:`, quantity);
        const char = await this.getCharacter(userId, characterId);
        const itemData = this.inventoryManager.resolveItem(itemId);
        // Note: No current_activity or combat restrictions are enforced here to allow potion usage anytime.
        const safeQty = Math.max(1, parseInt(typeof quantity === 'object' ? quantity.qty : quantity) || 1);
        if (!itemData) throw new Error("Item not found");

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
                const result = this.crownsManager.applyMembership(char, membershipItem);
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

                // New Shard Drop Formula: min = (tier-1)*10 + (rarity*2)+1, max = min + 1
                const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
                const rarityOffset = Math.max(0, rarities.indexOf(itemData.rarity));
                const min = (tier - 1) * 10 + (rarityOffset * 2) + 1;
                const max = min + 1;
                const shardId = `T1_RUNE_SHARD`;

                for (let i = 0; i < safeQty; i++) {
                    // Collect all potential new items first
                    const potentialDrops = [];

                    if (Math.random() < crestChance) {
                        const crestId = `T${tier}_CREST`;
                        totalRewards.items[crestId] = (totalRewards.items[crestId] || 0) + 1;
                    }

                    // Rune Shards (Guaranteed range per chest: 80% min, 20% max)
                    const shardQty = Math.random() < 0.8 ? min : max;
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

        // 1. Validate Category
        const types = RUNES_BY_CATEGORY[category];
        if (!types || types.length === 0) {
            return { success: false, error: `Rune type '${category}' is currently under development!` };
        }

        // 2. Validate Shard ID (Always T1 now)
        const activeShardId = 'T1_RUNE_SHARD';

        // 3. Check Quantity and Silver (Need 5 * qty and 1000 * qty)
        const totalNeeded = 5 * count;
        const totalSilverCost = 1000 * count;
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
        const type = match[2];
        const stars = parseInt(match[3]);

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

        // 4. Check Quantity and Silver (Need 2 * qty and 2500 * tier * qty)
        const totalNeeded = 2 * count;
        const totalSilverCost = 2500 * tier * count;
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

        // --- STEP 1: CALCULATE TOTAL COST ---
        let totalUpgrades = 0;
        let totalSilverCost = 0;
        const tempInv = { ...char.state.inventory };

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
                    const costPerPair = 2500 * tier;
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
        const createdItems = [];

        // Track what was created at each step
        let subChanged = true;
        const subInv = { ...char.state.inventory };
        while (subChanged) {
            subChanged = false;
            for (const [itemId, qty] of Object.entries(subInv)) {
                if (qty < 2) continue;
                if (!itemId.includes('_RUNE_') || itemId.includes('SHARD')) continue;

                const match = itemId.match(/^T(\d+)_RUNE_(.+)_(\d+)STAR/);
                if (!match) continue;

                const tier = parseInt(match[1]);
                const stars = parseInt(match[3]);
                if (stars >= 3 && tier >= 10) continue;

                // Apply same filters
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
                    let nextStars = stars + 1;
                    let nextTier = tier;
                    if (stars >= 3) {
                        nextStars = 1;
                        nextTier = tier + 1;
                    }
                    const nextItemId = `T${nextTier}_RUNE_${match[2]}_${nextStars}STAR`;

                    subInv[itemId] -= (pairs * 2);
                    if (subInv[itemId] <= 0) delete subInv[itemId];
                    subInv[nextItemId] = (subInv[nextItemId] || 0) + pairs;

                    // Track for result modal
                    for (let i = 0; i < pairs; i++) {
                        createdItems.push({ item: nextItemId, qty: 1 });
                    }
                    subChanged = true;
                }
            }
        }

        char.state.inventory = subInv;
        this.markDirty(char.id);
        await this.persistCharacter(char.id);

        return {
            success: true,
            items: createdItems,
            count: createdItems.length,
            message: `Successfully performed ${totalUpgrades} merges for ${totalSilverCost.toLocaleString()} Silver!`
        };
    }
}
