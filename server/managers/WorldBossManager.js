import { ITEMS } from '../../shared/items.js';
import { WORLDBOSS_DROP_TABLE } from '../../shared/chest_drops.js';
import { QUEST_TYPES } from './QuestManager.js';
import { WORLD_BOSSES, getBossByTier, getRandomBossTier } from '../../shared/world_bosses.js';
import { DEFAULT_PLAYER_ATTACK_SPEED } from '../../shared/combat.js';
import fs from 'fs';
import path from 'path';

const DEBUG_LOG_PATH = './wb_debug.log';
function debugLog(msg) {
    const timestamp = new Date().toISOString();
    try {
        fs.appendFileSync(DEBUG_LOG_PATH, `[${timestamp}] ${msg}\n`);
    } catch (e) {}

}

export class WorldBossManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        // Daily Boss (Ancient Dragon - No HP, 24h cycle)
        this.dailyBoss = null;
        this.dailyRankings = [];
        this.dailyLiveRankings = { NORMAL: [], IRONMAN: [], ALL: [] };

        // Window Boss (New Random Bosses - With HP, 8h cycle)
        this.windowBoss = null;
        this.windowSession = null;
        this.windowRankings = [];
        this.windowLiveRankings = { NORMAL: [], IRONMAN: [], ALL: [] };

        this.activeFights = new Map(); // characterId -> { type, startedAt, damage, name, ... }
        this.lastNotifiedWindowSessionId = null;
    }

    async initialize() {
        // Kick off initial state fetch but don't block the intervals
        this.checkBossCycle().catch(e => debugLog(`Error in initial cycle check: ${e.message}`));
        this.refreshAllRankings().catch(e => debugLog(`Error in initial ranking refresh: ${e.message}`));

        // Refresh DB rankings every 5 minutes
        setInterval(() => this.refreshAllRankings(), 300000);

        // Refresh Live Rankings (Memory Merge) every 1 second
        setInterval(() => this.updateAllLiveRankings(), 1000);

        // Cleanup orphaned fights (every 5 seconds)
        setInterval(() => this.cleanupOrphanedFights(), 5000);
        debugLog('WorldBossManager initialized (non-blocking)');
    }

    async refreshAllRankings() {
        await Promise.all([
            this.refreshDailyRankings(),
            this.refreshWindowRankings()
        ]);
        this.updateAllLiveRankings();
    }

    async refreshDailyRankings() {
        const dateStr = new Date().toISOString().split('T')[0];
        try {
            const { data, error } = await this.gameManager.supabase
                .from('world_boss_attempts')
                .select('character_id, damage, characters(name, state, guild_members(guilds(tag)))')
                .eq('date', dateStr)
                .is('session_id', null)
                .order('damage', { ascending: false });

            if (error) throw error;
            this.dailyRankings = this.formatRankings(data || []);
        } catch (err) {
            console.error('[WORLD_BOSS] Error refreshing daily rankings:', err);
            this.dailyRankings = [];
        }
    }

    async refreshWindowRankings() {
        if (!this.windowSession) {
            this.windowRankings = [];
            return;
        }
        try {
            const { data, error } = await this.gameManager.supabase
                .from('world_boss_attempts')
                .select('character_id, damage, characters(name, state, guild_members(guilds(tag)))')
                .eq('session_id', this.windowSession.id)
                .order('damage', { ascending: false });

            if (error) throw error;
            this.windowRankings = this.formatRankings(data || []);
        } catch (err) {
            console.error('[WORLD_BOSS] Error refreshing window rankings:', err);
            this.windowRankings = [];
        }
    }

    formatRankings(data) {
        return data.map(r => {
            const isIronman = r.characters?.state?.isIronman === true;
            let guildTag = null;
            if (r.characters?.guild_members) {
                const gm = Array.isArray(r.characters.guild_members) ? r.characters.guild_members[0] : r.characters.guild_members;
                guildTag = gm?.guilds?.tag || null;
            }
            return {
                character_id: r.character_id,
                name: r.characters?.name || 'Unknown',
                damage: parseInt(r.damage),
                isIronman: isIronman,
                guild_tag: guildTag
            };
        });
    }

    updateAllLiveRankings() {
        this.dailyLiveRankings = this.computeLiveRankings(this.dailyRankings, 'daily');
        this.windowLiveRankings = this.computeLiveRankings(this.windowRankings, 'window');
    }

    computeLiveRankings(cachedRankings, type) {
        const merged = new Map();
        cachedRankings.forEach(r => merged.set(r.character_id, { ...r }));

        this.activeFights.forEach((fight, charId) => {
            if (fight.type !== type) return;
            const existing = merged.get(charId);
            if (existing) {
                existing.damage = Math.max(existing.damage, fight.damage);
            } else {
                merged.set(charId, {
                    character_id: charId,
                    name: fight.name,
                    damage: fight.damage,
                    isIronman: this.gameManager.cache.get(charId)?.state?.isIronman === true
                });
            }
        });

        const sorted = Array.from(merged.values()).sort((a, b) => b.damage - a.damage);
        
        const normal = sorted.filter(r => !r.isIronman).map((r, i) => ({ ...r, pos: i + 1 }));
        const ironman = sorted.filter(r => r.isIronman).map((r, i) => ({ ...r, pos: i + 1 }));

        return {
            NORMAL: normal,
            IRONMAN: ironman,
            ALL: sorted.map((r, i) => ({ ...r, globalPos: i + 1 }))
        };
    }

    async cleanupOrphanedFights() {
        const now = Date.now();
        const timedOut = [];
        
        this.activeFights.forEach((fight, charId) => {
            const elapsed = now - fight.startedAt;
            // 60s fight + 10s grace period for client lag/sync
            if (elapsed > 70000) {
                timedOut.push(charId);
            }
        });

        if (timedOut.length > 0) {
            debugLog(`Cleaning up ${timedOut.length} orphaned/timed-out fights: ${timedOut.join(', ')}`);
            for (const charId of timedOut) {
                const char = this.gameManager.cache.get(charId);
                if (char) {
                    await this.endFight(char);
                } else {
                    // Force delete from memory if character is not even in cache
                    this.activeFights.delete(charId);
                    debugLog(`Force removed ${charId} from activeFights (character not in cache)`);
                }
            }
        }
    }

    async checkBossCycle() {
        await Promise.all([
            this.checkDailyBoss(),
            this.checkWindowBoss()
        ]);
    }

    async checkDailyBoss() {
        const now = new Date();
        const endsAt = new Date(now);
        endsAt.setUTCHours(23, 50, 0, 0);

        const isAlive = now < endsAt;

        // Daily Ancient Dragon is always Tier 10 equivalent but unique character
        this.dailyBoss = {
            id: "DAILY_CELESTIAL_RAVAGER",
            name: "The Celestial Ravager",
            tier: 10,
            maxHP: 9500000,
            image: "wb_daily_celestial_ravager.webp",
            bg: "/backgrounds/arcane.webp",
            isAlive: isAlive,
            endsAt: endsAt.toISOString(),
            type: 'daily'
        };
    }

    async checkWindowBoss() {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const windowStartHours = Math.floor(utcHours / 8) * 8;
        
        // Correctly create UTC dates using UTC components to avoid local day mismatch
        const startTime = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            windowStartHours, 0, 0, 0
        ));
        
        const endTime = new Date(startTime.getTime() + (7 * 60 + 50) * 60000);
        const nextSpawnTime = new Date(startTime.getTime() + 8 * 60 * 60000);

        let { data: session, error } = await this.gameManager.supabase
            .from('world_boss_sessions')
            .select('*')
            .eq('start_time', startTime.toISOString())
            .maybeSingle();

        if (error) {
            console.error('[WORLD_BOSS] Error checking for window session:', error);
            return;
        }

        if (!session) {
            const tier = getRandomBossTier();
            const bossData = getBossByTier(tier);
            
            const { data: newSession, error: createError } = await this.gameManager.supabase
                .from('world_boss_sessions')
                .insert({
                    boss_id: bossData.id,
                    tier: tier,
                    max_hp: bossData.maxHP,
                    current_hp: bossData.maxHP,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'ACTIVE'
                })
                .select()
                .single();

            if (createError) {
                console.error('[WORLD_BOSS] Error creating window session:', createError);
                return;
            }
            session = newSession;
        }

        this.windowSession = session;
        const bossData = WORLD_BOSSES[`T${session.tier}`];
        const isAlive = now < new Date(session.end_time) && session.status === 'ACTIVE';

        this.windowBoss = {
            ...bossData,
            sessionId: session.id,
            isAlive: isAlive,
            currentHP: parseInt(session.current_hp),
            maxHP: parseInt(session.max_hp),
            endsAt: session.end_time,
            nextSpawnAt: nextSpawnTime.toISOString(),
            status: session.status,
            type: 'window'
        };

        if (this.windowBoss.isAlive && this.lastNotifiedWindowSessionId !== session.id) {
            this.lastNotifiedWindowSessionId = session.id;
            this.sendPushNotification(this.windowBoss, session.tier);
        }
    }

    async sendPushNotification(boss, tier) {
        try {
            const { data: subs } = await this.gameManager.supabase
                .from('push_subscriptions')
                .select('user_id, settings');
            
            if (!subs) return;

            const uniqueUsers = [...new Set(subs
                .filter(s => s.settings?.push_world_boss !== false)
                .map(s => s.user_id))];
            
            for (const userId of uniqueUsers) {
                this.gameManager.pushManager.notifyUser(
                    userId,
                    'push_world_boss',
                    `World Boss: ${boss.name}! 🐉`,
                    `A Tier ${tier} boss has appeared. Join the fight!`,
                    '/world_boss'
                );
            }
        } catch (err) {
            console.error('[WORLD_BOSS] Error sending notifications:', err);
        }
    }

    async getStatus(charId) {
        await this.checkBossCycle();

        const char = this.gameManager.cache.get(charId);
        const mode = char?.state?.isIronman ? 'IRONMAN' : 'NORMAL';

        // Helper to find true rank regardless of cache state
        const findRank = (rankingsObj, charId, preferredMode) => {
            let categoryList = rankingsObj[preferredMode] || [];
            let rIndex = categoryList.findIndex(r => r.character_id === charId);
            
            if (rIndex === -1) {
                const otherMode = preferredMode === 'NORMAL' ? 'IRONMAN' : 'NORMAL';
                const otherList = rankingsObj[otherMode] || [];
                const otherIndex = otherList.findIndex(r => r.character_id === charId);
                if (otherIndex !== -1) {
                    categoryList = otherList;
                    rIndex = otherIndex;
                }
            }

            return {
                list: categoryList,
                index: rIndex,
                rank: rIndex !== -1 ? { ...categoryList[rIndex], pos: rIndex + 1 } : null
            };
        };

        // Daily Boss Status
        const dailyResult = findRank(this.dailyLiveRankings, charId, mode);
        const windowResult = findRank(this.windowLiveRankings, charId, mode);

        const pendingRewards = await this.getPendingRewards(charId);

        // Fetch last 3 window boss sessions for history
        let windowHistory = [];
        try {
            const { data: historyData } = await this.gameManager.supabase
                .from('world_boss_sessions')
                .select('*')
                .order('start_time', { ascending: false })
                .limit(3);
            
            if (historyData) {
                windowHistory = historyData.map(s => {
                    const bossData = WORLD_BOSSES[`T${s.tier}`];
                    return {
                        id: s.id,
                        bossId: s.boss_id,
                        name: bossData?.name || 'Unknown Boss',
                        tier: s.tier,
                        status: s.status,
                        startTime: s.start_time,
                        endTime: s.end_time
                    };
                });
            }
        } catch (err) {
            console.error('[WORLD_BOSS] Error fetching session history:', err);
        }

        return {
            daily: {
                boss: this.dailyBoss,
                rankings: dailyResult.list.slice(0, 50),
                ironmanRankings: (this.dailyLiveRankings.IRONMAN || []).slice(0, 50),
                normalRankings: (this.dailyLiveRankings.NORMAL || []).slice(0, 50),
                totalChallengers: (this.dailyLiveRankings.ALL || []).length,
                myRank: dailyResult.rank
            },
            window: {
                boss: this.windowBoss,
                history: windowHistory,
                rankings: windowResult.list.slice(0, 50),
                ironmanRankings: (this.windowLiveRankings.IRONMAN || []).slice(0, 50),
                normalRankings: (this.windowLiveRankings.NORMAL || []).slice(0, 50),
                totalChallengers: (this.windowLiveRankings.ALL || []).length,
                myRank: windowResult.rank
            },
            mode: mode,
            pendingRewards: pendingRewards,
            serverTime: Date.now()
        };
    }

    async startFight(char, type = 'window') {
        const boss = (type === 'daily') ? this.dailyBoss : this.windowBoss;
        const session = (type === 'daily') ? null : this.windowSession;

        if (!boss || !boss.isAlive) {
            throw new Error("This World Boss is either resting or already defeated.");
        }

        // 1. Memory Lock Check
        if (this.activeFights.has(char.id)) {
            throw new Error("You are already in a middle of a fight with this boss.");
        }

        // 2. Database Participation Check
        const hasFought = await this.checkBossParticipation(char.id, type);
        if (hasFought) throw new Error(`You already challenged the ${type === 'daily' ? 'Daily' : 'Window'} World Boss today/this session.`);

        const fightState = {
            characterId: char.id,
            name: char.name,
            type: type,
            sessionId: (type === 'daily') ? null : this.windowSession?.id,
            startedAt: Date.now(),
            damage: 0,
            lastTick: Date.now(),
            lastBroadcastPos: null
        };

        this.activeFights.set(char.id, fightState);

        if (!char.state) char.state = {};
        char.state.activeWorldBossFight = { ...fightState };


        return { success: true };
    }

    async checkBossParticipation(charId, type) {
        const normalizedType = type?.toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        let query = this.gameManager.supabase.from('world_boss_attempts').select('id, damage').eq('character_id', charId);

        if (normalizedType === 'daily') {
            query = query.eq('date', dateStr).is('session_id', null);
        } else {
            if (!this.windowSession) return true; // If no session exists, we treat it as "can't fight" or "already done"
            query = query.eq('session_id', this.windowSession.id);
        }

        debugLog(`checkBossParticipation START: char=${charId}, type=${normalizedType}, date=${dateStr}`);
        try {
            const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), ms));
            
            const { data, error } = await Promise.race([
                query,
                timeout(10000)
            ]);

            if (error) {
                console.error(`[WORLD_BOSS] DB Error checking participation for ${charId} (${normalizedType}):`, error);
                debugLog(`checkBossParticipation ERROR: ${error.message}`);
                return true; 
            }
            debugLog(`checkBossParticipation DONE: found=${data?.length || 0}`);
            return (data && data.length > 0);
        } catch (err) {
            console.error(`[WORLD_BOSS] Exception checking participation for ${charId}:`, err);
            debugLog(`checkBossParticipation EXCEPTION: ${err.message}`);
            return true;
        }
    }

    async processTick(char, virtualTime = null) {
        const fight = this.activeFights.get(char.id);
        if (!fight) return;

        const boss = (fight.type === 'daily') ? this.dailyBoss : this.windowBoss;

        if (!boss || !boss.isAlive || (fight.type === 'window' && boss.status !== 'ACTIVE')) {
            return await this.endFight(char);
        }

        const now = virtualTime || Date.now();
        const elapsed = now - fight.startedAt;

        if (elapsed >= 60000) {
            return await this.endFight(char);
        }

        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const atkSpeed = Math.max(200, stats.attackSpeed || DEFAULT_PLAYER_ATTACK_SPEED);
        let rounds = 0;
        const hits = [];
        let tickDamage = 0;

        // More rounds for catchup processing
        const maxRounds = virtualTime ? 500 : 10;

        while (fight.lastTick + atkSpeed <= now && rounds < maxRounds) {
            let hitDmg = Math.max(1, stats.damage || 1);
            let isCrit = false;

            if (stats.burstChance > 0 && Math.random() * 100 < stats.burstChance) {
                hitDmg = Math.floor(hitDmg * 1.5);
                isCrit = true;
            }

            if (fight.type === 'window') {
                if (boss.currentHP - tickDamage - hitDmg < 0) {
                    hitDmg = Math.max(0, boss.currentHP - tickDamage);
                }
            }

            tickDamage += hitDmg;
            fight.damage += hitDmg;
            fight.lastTick += atkSpeed;
            if (!virtualTime) {
                hits.push({ damage: hitDmg, timestamp: fight.lastTick, crit: isCrit });
            }
            rounds++;

            if (fight.type === 'window' && (hitDmg === 0 || boss.currentHP - tickDamage <= 0)) break;
        }

        if (tickDamage > 0 && fight.type === 'window') {
            boss.currentHP -= tickDamage;
            this.updateBossHPInDB(tickDamage).catch(err => {
                // Silently log only to console
                console.error(`[WORLD_BOSS] Error in deferred HP update:`, err);
            });
            if (boss.currentHP <= 0) this.handleBossDefeat();
        }

        const currentPos = this.predictRankingPos(char.id, fight.damage, fight.type);
        fight.lastBroadcastPos = currentPos;

        if (char.state && char.state.activeWorldBossFight) {
            char.state.activeWorldBossFight.damage = fight.damage;
            char.state.activeWorldBossFight.lastTick = fight.lastTick;
        }

        return {
            worldBossUpdate: {
                damage: fight.damage,
                elapsed: elapsed,
                rankingPos: currentPos,
                rounds: rounds,
                hits: hits,
                type: fight.type,
                sessionId: fight.sessionId,
                status: (fight.type === 'window' && boss.currentHP <= 0) ? 'FINISHED' : 'ACTIVE',
                bossHP: (fight.type === 'window') ? boss.currentHP : null,
                bossMaxHP: (fight.type === 'window') ? boss.maxHP : null
            }
        };
    }

    async updateBossHPInDB(damageDealt) {
        if (!this.windowSession) return;
        try {
            const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), ms));
            await Promise.race([
                this.gameManager.supabase.rpc('deduct_world_boss_hp', { 
                    session_id: this.windowSession.id, 
                    damage: Math.floor(damageDealt) 
                }),
                timeout(5000)
            ]);
        } catch (err) {
            console.error('[WORLD_BOSS] Error updating window boss HP:', err);
        }
    }

    async handleBossDefeat() {
        if (!this.windowBoss || this.windowBoss.status === 'DEFEATED') return;
        
        this.windowBoss.status = 'DEFEATED';
        this.windowBoss.isAlive = false;

        await this.gameManager.supabase
            .from('world_boss_sessions')
            .update({ status: 'DEFEATED', current_hp: 0 })
            .eq('id', this.windowSession.id);

        this.gameManager.broadcast('new_message', {
            id: 'wb-defeat-' + Date.now(),
            sender_name: '[SYSTEM]',
            content: `🎊 Victory! The World Boss ${this.windowBoss.name} has been defeated! Rankings are now final.`,
            created_at: new Date().toISOString()
        });
    }

    async processBatchWorldBoss(char, now) {
        if (!char.state?.activeWorldBossFight) return null;
        if (!this.activeFights.has(char.id)) {
            this.activeFights.set(char.id, { ...char.state.activeWorldBossFight });
        }
        return await this.processTick(char, now);
    }

    predictRankingPos(charId, currentDamage, type) {
        const char = this.gameManager.cache.get(charId);
        const mode = char?.state?.isIronman ? 'IRONMAN' : 'NORMAL';
        const rankings = (type === 'daily' ? this.dailyLiveRankings : this.windowLiveRankings)[mode] || [];

        let pos = 1;
        for (const entry of rankings) {
            if (entry.character_id === charId) continue;
            if (currentDamage > entry.damage) break;
            pos++;
        }
        return pos;
    }

    async endFight(char) {
        const fight = this.activeFights.get(char.id) || char.state?.activeWorldBossFight;
        if (!fight) return;

        try {
            let oldTop1 = null;
            if (fight.type === 'daily') {
                const categoryRankings = (this.dailyLiveRankings.IRONMAN.concat(this.dailyLiveRankings.NORMAL))
                    .sort((a,b) => b.damage - a.damage);
                oldTop1 = categoryRankings.length > 0 ? categoryRankings[0] : null;
            }

            debugLog(`Ending ${fight.type} fight for ${char.name} (${char.id}). Damage: ${fight.damage}`);
            
            await this.saveParticipation(char, fight.damage, fight.type, fight.sessionId);
            debugLog(`Save successful for ${char.name}`);

            this.refreshAllRankings().catch(e => debugLog(`Error refreshing rankings: ${e.message}`));
            
            if (this.gameManager.quests) {
                this.gameManager.quests.handleProgress(char, QUEST_TYPES.WORLD_BOSS, { count: 1 });
            }

            if (fight.type === 'daily') {
                const categoryRankings = (this.dailyLiveRankings.IRONMAN.concat(this.dailyLiveRankings.NORMAL))
                    .sort((a,b) => b.damage - a.damage);
                const newTop1 = categoryRankings.length > 0 ? categoryRankings[0] : null;

                if (newTop1 && (!oldTop1 || oldTop1.character_id !== newTop1.character_id) && fight.damage > 0) {
                    const announcement = `📢 ${newTop1.name} has just taken the Top 1 spot in the World Boss Ranking with ${newTop1.damage.toLocaleString()} damage!`;
                    this.gameManager.broadcast('new_message', {
                        id: 'wb-' + Date.now(),
                        sender_name: '[SYSTEM]',
                        content: announcement,
                        created_at: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error(`[WORLD_BOSS] Error ending ${fight.type} fight:`, err);
        } finally {
            // Ensure it's removed from character state if fully loaded character
            if (char && char.state) {
                delete char.state.activeWorldBossFight;
            }
            this.activeFights.delete(char.id);

            return {
                worldBossUpdate: {
                    damage: fight ? fight.damage : 0,
                    status: 'FINISHED',
                    elapsed: fight ? Math.min(60000, Date.now() - (fight.startedAt || Date.now())) : 60000,
                    type: fight ? fight.type : 'window',
                    sessionId: fight ? fight.sessionId : null,
                    rankingPos: fight ? this.predictRankingPos(char.id, fight.damage, fight.type) : '--'
                }
            };
        }
    }

    async saveParticipation(char, damage, type, sessionId = null) {
        const normalizedType = type?.toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        const charId = char?.id;
        debugLog(`saveParticipation START: name=${char?.name}, id=${charId}, type=${normalizedType}, damage=${damage}, date=${dateStr}, session=${sessionId}`);
        
        try {
            // 1. Double check existing attempt
            let query;
            if (normalizedType === 'daily') {
                query = this.gameManager.supabase
                    .from('world_boss_attempts')
                    .select('id, damage')
                    .eq('character_id', charId)
                    .eq('date', dateStr)
                    .is('session_id', null);
            } else {
                query = this.gameManager.supabase
                    .from('world_boss_attempts')
                    .select('id, damage')
                    .eq('character_id', charId);
                
                if (sessionId === null || sessionId === undefined) {
                    query = query.is('session_id', null);
                } else {
                    query = query.eq('session_id', sessionId);
                }
            }

            // Add a 10-second timeout to the query to prevent total server hang
            const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), ms));
            
            debugLog(`[${charId}] Querying for existing attempt...`);
            const { data: existingRecords, error: selectError } = await Promise.race([
                query,
                timeout(10000)
            ]);

            if (selectError) {
                debugLog(`[${charId}] SELECT error: ${JSON.stringify(selectError)}`);
                throw selectError;
            }
            
            const existing = (existingRecords && existingRecords.length > 0) ? existingRecords[0] : null;
            debugLog(`[${charId}] Search results: ${existingRecords?.length || 0} found. Existing ID=${existing?.id || 'none'}`);

            if (existing) {
                const oldDamage = parseInt(existing.damage) || 0;
                const newDamage = Math.max(oldDamage, Math.floor(damage));
                
                debugLog(`[${charId}] Updating existing record ${existing.id} with damage ${newDamage}`);
                const { error: updateError } = await Promise.race([
                    this.gameManager.supabase
                        .from('world_boss_attempts')
                        .update({ 
                            damage: newDamage,
                            player_name: char.name
                        })
                        .eq('id', existing.id),
                    timeout(10000)
                ]);

                if (updateError) {
                    debugLog(`[${charId}] UPDATE error: ${JSON.stringify(updateError)}`);
                    throw updateError;
                }
            } else {
                debugLog(`[${charId}] Inserting NEW record. Damage=${damage}`);
                const { error: insertError } = await Promise.race([
                    this.gameManager.supabase
                        .from('world_boss_attempts')
                        .insert({
                            character_id: charId,
                            player_name: char.name,
                            date: dateStr,
                            session_id: (normalizedType === 'daily') ? null : sessionId,
                            damage: Math.floor(damage),
                            claimed: false
                        }),
                    timeout(10000)
                ]);

                if (insertError) {
                    debugLog(`[${charId}] INSERT error: ${JSON.stringify(insertError)}`);
                    throw insertError;
                }
            }
            debugLog(`[${charId}] saveParticipation COMPLETE for ${char.name}`);
        } catch (err) {
            debugLog(`[${charId}] Critical exception in saveParticipation: ${err.message}`);
            console.error('[WORLD_BOSS] Critical exception in saveParticipation:', err);
            throw err;
        }
    }

    static DAMAGE_MILESTONES = [
        { id: 'T10_WORLDBOSS_CHEST_MASTERPIECE', dmg: 1100000 },
        { id: 'T10_WORLDBOSS_CHEST_EXCELLENT', dmg: 950000 },
        { id: 'T10_WORLDBOSS_CHEST_OUTSTANDING', dmg: 825000 },
        { id: 'T10_WORLDBOSS_CHEST_GOOD', dmg: 750000 },
        { id: 'T10_WORLDBOSS_CHEST_NORMAL', dmg: 670000 },
        { id: 'T9_WORLDBOSS_CHEST_MASTERPIECE', dmg: 605000 },
        { id: 'T9_WORLDBOSS_CHEST_EXCELLENT', dmg: 550000 },
        { id: 'T9_WORLDBOSS_CHEST_OUTSTANDING', dmg: 505000 },
        { id: 'T9_WORLDBOSS_CHEST_GOOD', dmg: 465000 },
        { id: 'T9_WORLDBOSS_CHEST_NORMAL', dmg: 430000 },
        { id: 'T8_WORLDBOSS_CHEST_MASTERPIECE', dmg: 400000 },
        { id: 'T8_WORLDBOSS_CHEST_EXCELLENT', dmg: 370000 },
        { id: 'T8_WORLDBOSS_CHEST_OUTSTANDING', dmg: 335000 },
        { id: 'T8_WORLDBOSS_CHEST_GOOD', dmg: 315000 },
        { id: 'T8_WORLDBOSS_CHEST_NORMAL', dmg: 290000 },
        { id: 'T7_WORLDBOSS_CHEST_MASTERPIECE', dmg: 272000 },
        { id: 'T7_WORLDBOSS_CHEST_EXCELLENT', dmg: 252000 },
        { id: 'T7_WORLDBOSS_CHEST_OUTSTANDING', dmg: 235000 },
        { id: 'T7_WORLDBOSS_CHEST_GOOD', dmg: 220000 },
        { id: 'T7_WORLDBOSS_CHEST_NORMAL', dmg: 205000 },
        { id: 'T6_WORLDBOSS_CHEST_MASTERPIECE', dmg: 192000 },
        { id: 'T6_WORLDBOSS_CHEST_EXCELLENT', dmg: 178000 },
        { id: 'T6_WORLDBOSS_CHEST_OUTSTANDING', dmg: 165000 },
        { id: 'T6_WORLDBOSS_CHEST_GOOD', dmg: 155000 },
        { id: 'T6_WORLDBOSS_CHEST_NORMAL', dmg: 145000 },
        { id: 'T5_WORLDBOSS_CHEST_MASTERPIECE', dmg: 134000 },
        { id: 'T5_WORLDBOSS_CHEST_EXCELLENT', dmg: 125000 },
        { id: 'T5_WORLDBOSS_CHEST_OUTSTANDING', dmg: 117000 },
        { id: 'T5_WORLDBOSS_CHEST_GOOD', dmg: 108000 },
        { id: 'T5_WORLDBOSS_CHEST_NORMAL', dmg: 100000 },
        { id: 'T4_WORLDBOSS_CHEST_MASTERPIECE', dmg: 93000 },
        { id: 'T4_WORLDBOSS_CHEST_EXCELLENT', dmg: 86000 },
        { id: 'T4_WORLDBOSS_CHEST_OUTSTANDING', dmg: 80000 },
        { id: 'T4_WORLDBOSS_CHEST_GOOD', dmg: 73000 },
        { id: 'T4_WORLDBOSS_CHEST_NORMAL', dmg: 68000 },
        { id: 'T3_WORLDBOSS_CHEST_MASTERPIECE', dmg: 63000 },
        { id: 'T3_WORLDBOSS_CHEST_EXCELLENT', dmg: 58000 },
        { id: 'T3_WORLDBOSS_CHEST_OUTSTANDING', dmg: 52000 },
        { id: 'T3_WORLDBOSS_CHEST_GOOD', dmg: 47000 },
        { id: 'T3_WORLDBOSS_CHEST_NORMAL', dmg: 42000 },
        { id: 'T2_WORLDBOSS_CHEST_MASTERPIECE', dmg: 38000 },
        { id: 'T2_WORLDBOSS_CHEST_EXCELLENT', dmg: 33000 },
        { id: 'T2_WORLDBOSS_CHEST_OUTSTANDING', dmg: 29000 },
        { id: 'T2_WORLDBOSS_CHEST_GOOD', dmg: 25000 },
        { id: 'T2_WORLDBOSS_CHEST_NORMAL', dmg: 22000 },
        { id: 'T1_WORLDBOSS_CHEST_MASTERPIECE', dmg: 18000 },
        { id: 'T1_WORLDBOSS_CHEST_EXCELLENT', dmg: 14000 },
        { id: 'T1_WORLDBOSS_CHEST_OUTSTANDING', dmg: 11000 },
        { id: 'T1_WORLDBOSS_CHEST_GOOD', dmg: 8000 },
        { id: 'T1_WORLDBOSS_CHEST_NORMAL', dmg: 1 }
    ];

    calculateChestRewardByDamage(damage) {
        if (damage <= 0) return { id: 'T1_WORLDBOSS_CHEST_NORMAL', name: 'T1 WB Chest (Normal)' };
        const milestone = WorldBossManager.DAMAGE_MILESTONES.find(m => damage >= m.dmg) || WorldBossManager.DAMAGE_MILESTONES[WorldBossManager.DAMAGE_MILESTONES.length - 1];
        const chestId = milestone.id;
        const parts = chestId.split('_');
        const tier = parts[0];
        const rarity = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).toLowerCase();
        return { id: chestId, name: `${tier} WB Chest (${rarity})` };
    }

    async getPendingRewards(charId) {
        const { data, error } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .select('*, world_boss_sessions(*)')
            .eq('character_id', charId)
            .eq('claimed', false)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) return [];

        const pending = [];

        for (const unclaimed of data) {
            // Skip current active sessions
            if (unclaimed.session_id) {
                if (this.windowSession && unclaimed.session_id === this.windowSession.id) continue;
            } else {
                if (unclaimed.date === new Date().toISOString().split('T')[0]) continue;
            }

            let chestId, chestName;
            const isWindowBoss = !!unclaimed.session_id;

            if (isWindowBoss && unclaimed.world_boss_sessions?.status === 'DEFEATED') {
                chestId = 'ENHANCEMENT_CHEST';
                chestName = 'Enhancement Chest';
            } else if (isWindowBoss) {
                // Window Boss not defeated = no reward, skip this entry
                continue;
            } else {
                // Daily Boss = WB Chest based on damage milestones
                const damage = Number(unclaimed.damage) || 0;
                const result = this.calculateChestRewardByDamage(damage);
                chestId = result.id;
                chestName = result.name;
            }

            const bossName = unclaimed.world_boss_sessions ? (WORLD_BOSSES[`T${unclaimed.world_boss_sessions.tier}`]?.name || 'Window Boss') : 'Ancient Dragon';

            pending.push({
                id: unclaimed.id,
                sessionId: unclaimed.session_id,
                date: unclaimed.date,
                chestId: chestId,
                chest: chestName,
                bossName: bossName,
                damage: unclaimed.damage
            });
        }

        return pending;
    }

    async claimReward(char, attemptId = null) {
        const rewards = await this.getPendingRewards(char.id);
        if (!rewards || rewards.length === 0) throw new Error("No pending rewards found.");
        
        let reward;
        if (attemptId) {
            reward = rewards.find(r => r.id === attemptId);
        } else {
            reward = rewards[0]; // Claim oldest/first
        }

        if (!reward) throw new Error("Reward not found or already claimed.");

        const added = this.gameManager.inventoryManager.addItemToInventory(char, reward.chestId, 1);
        if (added) {
            await this.gameManager.supabase.from('world_boss_attempts').update({ claimed: true }).eq('id', reward.id);
            await this.gameManager.saveState(char.id, char.state);
            return { success: true, message: `Claimed reward for ${reward.bossName}! Received: ${reward.chestId.replace(/_/g, ' ')}` };
        } else {
            throw new Error("Inventory is full!");
        }
    }

    async getRankingHistory(dateStr, sessionId = null) {
        try {
            let query = this.gameManager.supabase
                .from('world_boss_attempts')
                .select('character_id, damage, session_id, characters(name, state, guild_members(guilds(tag)))');
            
            if (sessionId) {
                query = query.eq('session_id', sessionId);
            } else if (dateStr) {
                query = query.eq('date', dateStr).is('session_id', null);
            } else {
                return [];
            }

            const { data, error } = await query
                .order('damage', { ascending: false })
                .limit(50);

            if (error) throw error;
            return this.formatRankings(data);
        } catch (err) {
            console.error('[WORLD_BOSS] Error fetching ranking history:', err);
            return [];
        }
    }
}
