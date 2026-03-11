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
        if (!charId || charId === 'undefined' || charId === 'null') return;
        if (!this.dirty.has(charId)) return;
        const char = this.cache.get(charId);
        if (!char) return;

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
        } else {
            console.error(`[DB] Error persisting ${char.name}:`, error);
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

    async getCharacter(userId, characterId = null, bypassCache = false) {
        if (!characterId || characterId === 'undefined' || characterId === 'null') return null;

        if (characterId && this.cache.has(characterId) && !bypassCache) {
            return this.cache.get(characterId);
        }

        let query = this.supabase.from('characters').select('*');
        if (characterId) {
            query = query.eq('id', characterId);
            if (userId) query = query.eq('user_id', userId);
            query = query.single();
        } else {
            if (!userId) throw new Error("userId is required when characterId is not provided");
            query = query.eq('user_id', userId).limit(1).maybeSingle();
        }

        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            this.cache.set(data.id, data);
            return data;
        }
        return null;
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
}
