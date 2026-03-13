import { pruneState } from '../utils/statePruner.js';
import { hydrateState } from '../utils/statePruner.js';
import crypto from 'crypto';
import fs from 'fs';

export class PersistenceService {
    constructor(supabase, gameManager) {
        this.supabase = supabase;
        this.gm = gameManager; // For cross-manager calls if needed
        this.userLocks = new Map(); // userId -> Promise
        this.cache = new Map(); // charId -> character object
        this.dirty = new Set(); // charId -> dirty
        this.globalStats = null;
        this.leaderboardCache = new Map();
        this.guildBonusesCache = new Map();
        this.LEADERBOARD_CACHE_TTL = 30 * 60 * 1000;
        this.statsPromise = this.loadGlobalStats();
    }

    async executeLocked(userId, task) {
        if (!userId) return await task();
        const currentLock = this.userLocks.get(userId) || Promise.resolve();
        const nextLock = currentLock.then(async () => {
            try { return await task(); }
            catch (err) {
                console.error(`[LOCK] Error executing task for user ${userId}:`, err);
                throw err;
            }
        }).finally(() => {
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

    markDirty(charId) {
        if (!charId || charId === 'undefined' || charId === 'null') return;
        this.dirty.add(charId);
    }

    calculateHash(state) {
        try {
            if (!state) return '';
            return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
        } catch (err) {
            console.error(`[HASH-ERROR] Failed to calculate hash:`, err.message);
            return 'error-' + Date.now() + '-' + Math.random();
        }
    }

    async persistCharacter(charId) {
        if (!charId || charId === 'undefined' || charId === 'null') return false;
        if (!this.dirty.has(charId)) return true; // Already saved
        const char = this.cache.get(charId);
        if (!char) return false;

        const stateToPrune = JSON.parse(JSON.stringify(char.state));
        const prunedState = pruneState(stateToPrune);

        const inventoryToSave = prunedState.inventory || {};
        delete prunedState.inventory;
        const skillsToSave = prunedState.skills || {};
        delete prunedState.skills;
        const equipmentToSave = prunedState.equipment || {};
        delete prunedState.equipment;

        const infoToSave = {
            stats: prunedState.stats || {},
            health: prunedState.health || 0,
            silver: prunedState.silver || 0,
            orbs: (prunedState.orbs !== undefined) ? prunedState.orbs : 0,
            crowns: (prunedState.orbs !== undefined) ? prunedState.orbs : 0,
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
        delete prunedState.crowns;
        delete prunedState.membership;
        delete prunedState.active_buffs;
        delete prunedState.inventorySlots;
        delete prunedState.extraInventorySlots;
        delete prunedState.unlockedTitles;

        const combatToSave = prunedState.combat || null;
        delete prunedState.combat;
        const dungeonToSave = prunedState.dungeon || null;
        delete prunedState.dungeon;
        const bankToSave = prunedState.bank || char.state.bank || { items: {}, slots: 10 };
        delete prunedState.bank;
        const settingsToSave = prunedState.settings || char.state.settings || {};
        delete prunedState.settings;

        // --- PRE-CALCULATE RANKING VALUES ---
        let ranking_total_level = 0;
        let ranking_total_xp = 0;

        const calculateAccumulatedXP = (level, currentXp) => {
            let total = 0;
            for (let i = 1; i < level; i++) {
                total += Math.floor(100 * Math.pow(1.15, i - 1));
            }
            return total + currentXp;
        };

        if (skillsToSave) {
            for (const skillKey of Object.keys(skillsToSave)) {
                const skill = skillsToSave[skillKey];
                const lvl = (Number(skill.level) || 1);
                const xp = (Number(skill.xp) || 0);
                
                const skillTotalXp = calculateAccumulatedXP(lvl, xp);
                
                // Inject totalXp into skill object for DB sorting
                skill.totalXp = skillTotalXp;
                
                ranking_total_level += lvl;
                ranking_total_xp += skillTotalXp;
            }
        }

        let ranking_item_power = 0;
        if (equipmentToSave) {
            let totalIp = 0;
            let count = 0;
            for (const slot of Object.values(equipmentToSave)) {
                if (slot && slot.ip) {
                    totalIp += Number(slot.ip);
                    count++;
                }
            }
            ranking_item_power = count > 0 ? Math.floor(totalIp / count) : 0;
        }
        // ------------------------------------

        const finalPrunedState = (prunedState && prunedState.state) ? prunedState.state : prunedState;

        const isOnline = this.gm._isCharacterOnline ? this.gm._isCharacterOnline(charId) : true;
        const hasActiveWork = char.current_activity || char.state?.combat || char.state?.dungeon;
        const saveTime = (!isOnline && hasActiveWork) ? (char.last_saved || new Date().toISOString()) : new Date().toISOString();

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
                state: finalPrunedState,
                ranking_total_level,
                ranking_total_xp,
                ranking_item_power,
                current_activity: char.current_activity,
                activity_started_at: char.activity_started_at,
                last_saved: saveTime
            })
            .eq('id', charId);

        if (!error) {
            char.inventory = inventoryToSave;
            char.skills = skillsToSave;
            char.equipment = equipmentToSave;
            char.info = infoToSave;
            char.combat = combatToSave;
            char.dungeon = dungeonToSave;
            char.bank = bankToSave;
            char.settings = settingsToSave;
            char.last_saved = saveTime;
            char.dbHash = this.calculateHash(char.state);
            this.dirty.delete(charId);
            return true;
        } else {
            console.error(`[DB] Error persisting ${char.name}:`, error);
            return false;
        }
    }

    /**
     * Forces an immediate save of the character's state.
     * Unlike periodic flushes, this is intended to be called during critical transactions (Market, Trades).
     */
    async persistCharacterImmediate(charId) {
        this.markDirty(charId);
        const success = await this.persistCharacter(charId);
        if (!success) {
            // Optional: Implement a one-kick retry or specific logging for critical fails
            console.warn(`[DB-CRITICAL] Immediate save failed for ${charId}. Retrying once...`);
            return await this.persistCharacter(charId);
        }
        return success;
    }

    async flushDirtyCharacters() {
        if (this.dirty.size === 0) return;
        console.log(`[DB] Periodic flush for ${this.dirty.size} characters...`);
        const ids = Array.from(this.dirty);
        for (const id of ids) {
            await this.persistCharacter(id);
        }
    }

    async getCharacter(userId, characterId = null, bypassCache = false) {
        if (!characterId && !userId) return null;

        let data = characterId ? this.cache.get(characterId) : null;
        let fromCache = !!data;

        if (!data || bypassCache) {
            let query = this.supabase.from('characters').select('*');
            if (characterId) {
                query = query.eq('id', characterId);
                if (userId) query = query.eq('user_id', userId);
                query = query.single();
            } else {
                query = query.eq('user_id', userId).limit(1).maybeSingle();
            }

            const { data: dbData, error } = await query;
            if (error && error.code !== 'PGRST116') throw error;
            data = dbData;
            fromCache = false;
        }

        if (data && !fromCache) {
            this.cache.set(data.id, data);
            
            // Basic Hydration
            if (this.gm._hydrateCharacterFromRaw) {
                this.gm._hydrateCharacterFromRaw(data);
            }

            // --- PENDING REWARDS INTEGRATION ---
            // Apply any pending rewards before the character becomes active/cached fully
            if (this.gm.applyPendingRewards) {
                await this.gm.applyPendingRewards(data);
            }
            // -----------------------------------

            // Trigger Migrations
            if (this.gm.migrationManager) {
                this.gm.migrationManager.migrateCharacter(data);
            }

            data.dbHash = this.calculateHash(data.state);
        }

        return data;
    }

    async syncWithDatabase(charId, userId = null) {
        if (!charId || charId === 'undefined' || charId === 'null') return false;
        const char = this.cache.get(charId);
        if (!char) return !!(await this.getCharacter(userId, charId, true));

        const { data: dbChar, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', charId)
            .single();

        if (!error && dbChar) {
            const currentDbHash = this.calculateHash(dbChar.state);
            if (currentDbHash !== char.dbHash) {
                console.log(`[SYNC] Refreshing character ${char.name} from DB (Manual edit detected)`);
                this.dirty.delete(charId);
                dbChar.state = hydrateState(dbChar.state || {});
                if (dbChar.inventory) dbChar.state.inventory = dbChar.inventory;
                if (dbChar.skills) dbChar.state.skills = dbChar.skills;
                if (dbChar.equipment) dbChar.state.equipment = dbChar.equipment;
                Object.assign(char, dbChar);
                char.dbHash = currentDbHash;
                return true;
            }
        }
        return false;
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

                if (this.globalStats.tax_24h_ago === 0 && this.globalStats.total_market_tax > 0) {
                    console.log(`[PersistenceService] Initializing tax_24h_ago baseline to: ${this.globalStats.total_market_tax}`);
                    this.globalStats.tax_24h_ago = this.globalStats.total_market_tax;

                    if (this.globalStats.market_tax_total < 1000 && this.globalStats.trade_tax_total === 0) {
                        const total = this.globalStats.total_market_tax;
                        this.globalStats.market_tax_total = Math.floor(total * 0.80);
                        this.globalStats.trade_tax_total = Math.floor(total * 0.20);
                    }

                    if (this.gm.onGlobalStatsUpdate) {
                        this.gm.onGlobalStatsUpdate(this.globalStats);
                    }

                    this.supabase
                        .from('global_stats')
                        .update({
                            tax_24h_ago: this.globalStats.tax_24h_ago,
                            market_tax_total: this.globalStats.market_tax_total,
                            trade_tax_total: this.globalStats.trade_tax_total,
                            last_snapshot_at: new Date().toISOString()
                        })
                        .eq('id', 'global')
                        .catch(err => console.error('[DB] Error initializing tax baseline:', err));
                }
            } else if (!error) {
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
            if (this.statsPromise) await this.statsPromise;
            if (!this.globalStats) return;

            const taxAmount = Math.floor(amount);
            this.globalStats.total_market_tax += taxAmount;

            if (source === 'TRADE') {
                this.globalStats.trade_tax_total = (this.globalStats.trade_tax_total || 0) + taxAmount;
            } else {
                this.globalStats.market_tax_total = (this.globalStats.market_tax_total || 0) + taxAmount;
            }

            const updateFields = {
                total_market_tax: this.globalStats.total_market_tax,
                updated_at: new Date().toISOString()
            };

            if (source === 'TRADE') updateFields.trade_tax_total = this.globalStats.trade_tax_total;
            else updateFields.market_tax_total = this.globalStats.market_tax_total;

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
            if (this.statsPromise) await this.statsPromise;
            const { data, error } = await this.supabase
                .from('global_stats')
                .select('*')
                .eq('id', 'global')
                .single();

            if (error) return;

            const now = new Date();
            const lastSnapshotAt = data.last_snapshot_at ? new Date(data.last_snapshot_at) : null;

            const isNewDay = !lastSnapshotAt || (
                now.getUTCDate() !== lastSnapshotAt.getUTCDate() ||
                now.getUTCMonth() !== lastSnapshotAt.getUTCMonth() ||
                now.getUTCFullYear() !== lastSnapshotAt.getUTCFullYear()
            );

            if (isNewDay) {
                const newTotal = Number(data.total_market_tax) || 0;
                const oldTotal = Number(data.tax_24h_ago) || 0;
                const dailyIncrease = Math.max(0, newTotal - oldTotal);

                let history = Array.isArray(data.history) ? data.history : [];
                history.push({ date: now.toISOString(), amount: dailyIncrease });
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

                if (this.gm.onGlobalStatsUpdate) {
                    this.gm.onGlobalStatsUpdate(this.globalStats);
                }
            }
        } catch (err) {
            console.error('[PersistenceService] Error in checkTaxSnapshot:', err);
        }
    }
}
