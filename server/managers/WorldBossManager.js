import { ITEMS } from '../../shared/items.js';
import { WORLDBOSS_DROP_TABLE } from '../../shared/chest_drops.js';

export class WorldBossManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentBoss = null;
        this.rankings = []; // Last 24h ranking cache from DB
        this.liveRankings = { NORMAL: [], IRONMAN: [], ALL: [] }; // Initialized as object
        this.activeFights = new Map(); // characterId -> { startedAt, damage, lastLog }
        this.lastNotifiedDate = null;
    }

    async initialize() {
        console.log('[WORLD_BOSS] Initializing manager...');
        await this.checkBossCycle();
        await this.refreshRankings();

        // Refresh DB rankings every 5 minutes
        setInterval(() => this.refreshRankings(), 300000);

        // Refresh Live Rankings (Memory Merge) every 1 second
        setInterval(() => this.updateLiveRankings(), 1000);
    }

    async refreshRankings() {
        try {
            const dateStr = new Date().toISOString().split('T')[0];

            const { data, error } = await this.gameManager.supabase
                .from('world_boss_attempts')
                .select('character_id, damage, characters(name, state)')
                .eq('date', dateStr)
                .order('damage', { ascending: false });

            if (error) throw error;

            this.rankings = data.map((r, index) => {
                const isIronman = r.characters?.state?.isIronman === true;
                return {
                    pos: 0, // Posição será calculada após o split ou dinamicamente
                    character_id: r.character_id,
                    name: r.characters?.name || 'Unknown',
                    damage: parseInt(r.damage),
                    isIronman: isIronman
                };
            });

            console.log(`[WORLD_BOSS] Cached ${this.rankings.length} ranking entries.`);
            this.updateLiveRankings(); // Update live immediately after DB refresh
        } catch (err) {
            console.error('[WORLD_BOSS] Error refreshing rankings:', err);
        }
    }

    updateLiveRankings() {
        const merged = new Map();

        // 1. Load from DB Cache first
        this.rankings.forEach(r => {
            merged.set(r.character_id, { ...r });
        });

        // 2. Overlay Active Fights (Real-time damage)
        this.activeFights.forEach((fight, charId) => {
            const existing = merged.get(charId);
            if (existing) {
                // Update damage if current fight is higher (it should be, unless logic error)
                if (fight.damage > existing.damage) {
                    existing.damage = fight.damage;
                }
            } else {
                // New challenger not yet in DB
                merged.set(charId, {
                    character_id: charId,
                    name: fight.name,
                    damage: fight.damage,
                    isIronman: this.gameManager.cache.get(charId)?.state?.isIronman === true,
                    pos: 0
                });
            }
        });

        // 3. Convert to Array and Sort
        const sorted = Array.from(merged.values())
            .sort((a, b) => b.damage - a.damage);

        // 4. Assign Positions within their respective categories
        const normalRankings = sorted.filter(r => !r.isIronman).map((r, index) => ({ ...r, pos: index + 1 }));
        const ironmanRankings = sorted.filter(r => r.isIronman).map((r, index) => ({ ...r, pos: index + 1 }));

        this.liveRankings = {
            NORMAL: normalRankings,
            IRONMAN: ironmanRankings,
            ALL: sorted.map((r, index) => ({ ...r, globalPos: index + 1 }))
        };
    }

    async checkBossCycle() {
        const now = new Date();
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();
        const todayStr = now.toISOString().split('T')[0];

        const isAlive = (hours < 23) || (hours === 23 && minutes < 50);

        if (isAlive) {
            const endsAt = new Date(now);
            endsAt.setUTCHours(23, 50, 0, 0);

            this.currentBoss = {
                id: 'THE_ANCIENT_DRAGON',
                name: 'The Ancient Dragon',
                isAlive: true,
                endsAt: endsAt.toISOString()
            };
        } else {
            this.currentBoss = null;
            this.lastNotifiedDate = null; // Reset local cache when boss is gone
        }

        // Persistent notification check
        if (this.currentBoss && this.lastNotifiedDate !== todayStr) {
            // Check DB to ensure it wasn't already sent today by another process/restart
            const { data: lastNotif } = await this.gameManager.supabase
                .from('global_stats')
                .select('updated_at')
                .eq('id', 'wb_notification')
                .maybeSingle();
            
            const lastDbDate = lastNotif?.updated_at?.split('T')[0];
            
            if (lastDbDate === todayStr) {
                this.lastNotifiedDate = todayStr;
                return;
            }

            console.log(`[PUSH] World Boss Spawned: ${this.currentBoss.name}. Sending persistent daily notification...`);
            
            // Mark as notified in DB immediately to prevent race conditions
            await this.gameManager.supabase
                .from('global_stats')
                .upsert({ 
                    id: 'wb_notification', 
                    updated_at: now.toISOString() 
                });
            
            this.lastNotifiedDate = todayStr;

            // Broadcast to all users with world_boss enabled
            const { data: subs } = await this.gameManager.supabase
                .from('push_subscriptions')
                .select('user_id, settings');
            
            if (subs) {
                const uniqueUsers = [...new Set(subs
                    .filter(s => s.settings?.push_world_boss !== false)
                    .map(s => s.user_id))];
                
                for (const userId of uniqueUsers) {
                    this.gameManager.pushManager.notifyUser(
                        userId,
                        'push_world_boss',
                        'World Boss Spawned! 🐉',
                        `${this.currentBoss.name} is terrorizing the world. Join the fight!`,
                        '/world_boss'
                    );
                }
            }
        }
    }

    getCategoryRankings(char) {
        const mode = char?.state?.isIronman ? 'IRONMAN' : 'NORMAL';
        return this.liveRankings[mode] || [];
    }

    async getStatus(charId) {
        await this.checkBossCycle();

        const char = this.gameManager.cache.get(charId);
        const mode = char?.state?.isIronman ? 'IRONMAN' : 'NORMAL';

        // Safety check if liveRankings is still being initialized
        const categoryRankings = (this.liveRankings[mode] || []);
        const ironmanRankings = (this.liveRankings.IRONMAN || []);
        const normalRankings = (this.liveRankings.NORMAL || []);

        // Find player's current rank in their CATEGORY
        const myRankIndex = categoryRankings.findIndex(r => r.character_id === charId);
        const myRank = myRankIndex !== -1 ? { ...categoryRankings[myRankIndex] } : null;

        const pendingReward = await this.getPendingReward(charId);

        return {
            boss: this.currentBoss,
            rankings: categoryRankings.slice(0, 50),
            ironmanRankings: ironmanRankings.slice(0, 50),
            normalRankings: normalRankings.slice(0, 50),
            myRank: myRank,
            mode: mode,
            pendingReward: pendingReward
        };
    }

    async startFight(char) {
        console.log(`[WORLD_BOSS] starting fight for ${char.name} (${char.id})`);
        if (!this.currentBoss) throw new Error("World Boss is currently resting.");

        const hasFought = await this.checkDailyParticipation(char.id);
        if (hasFought) throw new Error("You already challenged the World Boss today.");

        const fightState = {
            characterId: char.id,
            name: char.name,
            startedAt: Date.now(),
            damage: 0,
            lastTick: Date.now(),
            lastBroadcastPos: null
        };

        this.activeFights.set(char.id, fightState);

        // PERSISTENCE: Save to state so it survives disconnects
        if (!char.state) char.state = {};
        char.state.activeWorldBossFight = { ...fightState };

        return { success: true };
    }

    async processTick(char, virtualTime = null) {
        const fight = this.activeFights.get(char.id);
        if (!fight) return;

        const now = virtualTime || Date.now();
        const elapsed = now - fight.startedAt;

        if (elapsed >= 60000) {
            console.log(`[WORLD_BOSS] Time limit reached for ${char.name}. Ending fight.`);
            return await this.endFight(char);
        }

        const stats = this.gameManager.inventoryManager.calculateStats(char);

        // Process damage (allowing multiple hits if tick skipped)
        const atkSpeed = Math.max(200, stats.attackSpeed || 1000);
        let rounds = 0;
        const hits = []; // Collect hits for this tick

        while (fight.lastTick + atkSpeed <= now && rounds < 10) {
            const damage = Math.max(1, stats.damage || 1);
            const burstChance = stats.burstChance || 0;
            let hitDmg = damage;
            let isCrit = false;

            if (burstChance > 0 && Math.random() * 100 < burstChance) {
                hitDmg = Math.floor(hitDmg * 1.5);
                isCrit = true;
            }

            fight.damage += hitDmg;
            fight.lastTick += atkSpeed;
            hits.push({ damage: hitDmg, timestamp: fight.lastTick, crit: isCrit });
            rounds++;
        }

        if (rounds > 0) {
            const currentPos = this.predictRankingPos(char.id, fight.damage);
            fight.lastBroadcastPos = currentPos;
        }

        // PERSISTENCE: Keep state in sync for recovery on login
        if (char.state && char.state.activeWorldBossFight) {
            char.state.activeWorldBossFight.damage = fight.damage;
            char.state.activeWorldBossFight.lastTick = fight.lastTick;
        }

        // ALWAYS return status so the client timer updates
        return {
            worldBossUpdate: {
                damage: fight.damage,
                elapsed: elapsed,
                rankingPos: fight.lastBroadcastPos || this.predictRankingPos(char.id, fight.damage),
                rounds: rounds,
                hits: hits,
                status: 'ACTIVE'
            }
        };
    }

    /**
     * Recovery logic for disconnected players who log back in mid-fight or after fight ended.
     */
    async processBatchWorldBoss(char, now) {
        if (!char.state?.activeWorldBossFight) return null;

        const fight = char.state.activeWorldBossFight;
        const totalDuration = 60000;
        const elapsedSinceStart = now - fight.startedAt;

        console.log(`[WORLD_BOSS] Catchup for ${char.name}. Started at: ${new Date(fight.startedAt).toISOString()}, Now: ${new Date(now).toISOString()}, Elapsed: ${elapsedSinceStart}ms`);

        // If more than 60s passed since start, the fight should have ended.
        // We process exactly up to the 60s mark.
        const effectiveNow = Math.min(now, fight.startedAt + totalDuration);

        // Ensure character is in activeFights so processTick can take over if fight is still ongoing
        if (elapsedSinceStart < totalDuration) {
            console.log(`[WORLD_BOSS] Character ${char.name} re-added to activeFights for resumption.`);
            this.activeFights.set(char.id, { ...fight });
        } else {
            console.log(`[WORLD_BOSS] Fight already expired for ${char.name} (${elapsedSinceStart}ms > ${totalDuration}ms).`);
        }

        // Process damage up to effectiveNow
        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const atkSpeed = Math.max(200, stats.attackSpeed || 1000);
        let rounds = 0;
        let batchDamage = 0;

        while (fight.lastTick + atkSpeed <= effectiveNow && rounds < 500) { // Safety cap
            const damage = Math.max(1, stats.damage || 1);
            const burstChance = stats.burstChance || 0;
            let hitDmg = damage;

            if (burstChance > 0 && Math.random() * 100 < burstChance) {
                hitDmg = Math.floor(hitDmg * 1.5);
            }

            batchDamage += hitDmg;
            fight.damage += hitDmg;
            fight.lastTick += atkSpeed;
            rounds++;
        }

        console.log(`[WORLD_BOSS] Catchup processed ${rounds} rounds, ${batchDamage} dmg for ${char.name}. Total: ${fight.damage}`);

        // If fight ended during offline period
        if (elapsedSinceStart >= totalDuration) {
            console.log(`[WORLD_BOSS] Catchup determined fight ended for ${char.name}. Finalizing...`);
            
            // Step 1: Save damage to DB
            await this.saveParticipation(char.id, fight.damage, char.name);
            
            // Step 2: Clear persistence from character state
            if (char.state) delete char.state.activeWorldBossFight;
            
            // Step 3: Remove from active memory if it was there
            this.activeFights.delete(char.id);

            // Step 4: Refresh rankings so they appear immediately
            await this.refreshRankings();

            return {
                totalDamage: fight.damage,
                rounds: rounds,
                status: 'FINISHED'
            };
        }

        return {
            totalDamage: fight.damage,
            rounds: rounds,
            status: 'ACTIVE'
        };
    }

    predictRankingPos(charId, currentDamage) {
        const char = this.gameManager.cache.get(charId);
        const mode = char?.state?.isIronman ? 'IRONMAN' : 'NORMAL';
        const categoryRankings = this.liveRankings[mode] || [];

        let pos = 1;
        for (const entry of categoryRankings) {
            if (entry.character_id === charId) continue;
            if (currentDamage > entry.damage) break;
            pos++;
        }
        return pos;
    }

    async endFight(char) {
        const fight = this.activeFights.get(char.id) || char.state?.activeWorldBossFight;
        if (!fight) {
            console.warn(`[WORLD_BOSS] endFight called for ${char.id} but no active fight found in memory or state.`);
            return;
        }

        console.log(`[WORLD_BOSS] Fight ended for ${char.name}. Total Damage: ${fight.damage}`);

        // PERSISTENCE: Clear from state
        if (char.state) delete char.state.activeWorldBossFight;

        try {
            const oldTop1 = this.rankings.length > 0 ? this.rankings[0] : null;

            // Save to DB
            console.log(`[WORLD_BOSS] Attempting to save participation...`);
            try {
                await this.saveParticipation(char.id, fight.damage, char.name);
                console.log(`[WORLD_BOSS] Save successful.`);
            } catch (dbErr) {
                console.error(`[WORLD_BOSS] CRITICAL: Failed to save participation!`, dbErr);
            }

            // Refresh local cache immediately
            console.log(`[WORLD_BOSS] Refreshing rankings...`);
            await this.refreshRankings();

            const newTop1 = this.rankings.length > 0 ? this.rankings[0] : null;

            // Global Announcement if Top 1 changed
            if (newTop1 && (!oldTop1 || oldTop1.character_id !== newTop1.character_id) && fight.damage > 0) {
                const announcement = `📢 ${newTop1.name} has just taken the Top 1 spot in the World Boss Ranking with ${newTop1.damage.toLocaleString()} damage!`;

                try {
                    // 1. Persist to DB for history
                    const { data: msgData, error: msgError } = await this.gameManager.supabase
                        .from('messages')
                        .insert({
                            sender_name: '[SYSTEM]',
                            content: announcement,
                            channel: 'SYSTEM'
                        })
                        .select()
                        .single();

                    // 2. Broadcast to all online players
                    if (!msgError && msgData) {
                        this.gameManager.broadcast('new_message', msgData);
                    } else {
                        // Fallback broadcast if DB insert fails
                        this.gameManager.broadcast('new_message', {
                            id: 'wb-' + Date.now(),
                            sender_name: '[SYSTEM]',
                            content: announcement,
                            created_at: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.error('[WORLD_BOSS] Error broadcasting Top 1 announcement:', err);
                }
            }

            return {
                worldBossUpdate: {
                    status: 'FINISHED',
                    finalDamage: fight.damage,
                    rankingPos: this.predictRankingPos(char.id, fight.damage)
                }
            };
        } finally {
            this.activeFights.delete(char.id);
        }
    }

    async checkDailyParticipation(characterId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .select('*')
            .eq('character_id', characterId)
            .eq('date', todayStr)
            .maybeSingle();
        return !!data;
    }

    async saveParticipation(characterId, damage, playerName) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { error } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .upsert({
                character_id: characterId,
                date: todayStr,
                damage: Math.floor(damage),
                player_name: playerName,
                claimed: false
            }, { onConflict: 'character_id,date' });

        if (error) console.error('[WORLD_BOSS] DB Error saving participation:', error);
    }

    // Ordered from highest requirement to lowest
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
        if (damage <= 0) {
            return { id: 'T1_WORLDBOSS_CHEST_NORMAL', name: 'T1 WB Chest (Normal)' };
        }

        // Find the first milestone the player's damage meets or exceeds
        const milestone = WorldBossManager.DAMAGE_MILESTONES.find(m => damage >= m.dmg)
            || WorldBossManager.DAMAGE_MILESTONES[WorldBossManager.DAMAGE_MILESTONES.length - 1]; // Fallback to lowest

        const chestId = milestone.id;
        const parts = chestId.split('_');
        const tier = parts[0];
        const rarity = parts[parts.length - 1];
        const rarityFormatted = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
        const chestName = `${tier} WB Chest (${rarityFormatted})`;

        return { id: chestId, name: chestName };
    }

    async getPendingReward(charId) {
        // Find if there's any record with claimed = false from PREVIOUS dates
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .select('*')
            .eq('character_id', charId)
            .eq('claimed', false)
            .lt('date', todayStr); // Only previous days

        if (error || !data || data.length === 0) return null;

        const reward = data[0]; // Most recent unclaimed
        const damage = Number(reward.damage) || 0;

        // Determine Rank for UI Display
        const { data: rankingData } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .select('character_id, damage')
            .eq('date', reward.date)
            .order('damage', { ascending: false });

        let pos = -1;
        if (rankingData) {
            pos = rankingData.findIndex(r => r.character_id === charId) + 1;
        }

        const { id: chestId, name: chestName } = this.calculateChestRewardByDamage(damage);

        return {
            ...reward,
            rank: pos,
            chest: chestName,
            chestId: chestId
        };
    }

    async claimReward(char) {
        const reward = await this.getPendingReward(char.id);
        if (!reward) throw new Error("No pending rewards found.");

        const damage = Number(reward.damage) || 0;
        const pos = reward.rank || '?';

        const { id: chestId } = this.calculateChestRewardByDamage(damage);

        // Give the chest
        const added = this.gameManager.inventoryManager.addItemToInventory(char, chestId, 1);

        if (added) {
            // Mark as claimed
            await this.gameManager.supabase
                .from('world_boss_attempts')
                .update({ claimed: true })
                .eq('id', reward.id);

            await this.gameManager.saveState(char.id, char.state);

            return {
                success: true,
                message: `You claimed your Ranking #${pos} reward for dealing ${damage.toLocaleString()} damage! Received: ${chestId.replace(/_/g, ' ')}`,
                chestId: chestId,
                pos: pos
            };
        } else {
            throw new Error("Inventory is full! Please make space before claiming.");
        }
    }
    async getRankingHistory(dateStr) {
        try {
            const { data, error } = await this.gameManager.supabase
                .from('world_boss_attempts')
                .select('character_id, damage, characters(name, state)')
                .eq('date', dateStr)
                .order('damage', { ascending: false })
                .limit(50);

            if (error) throw error;

            return data.map((r, index) => ({
                pos: 0, // calculated later
                character_id: r.character_id,
                name: r.characters?.name || 'Unknown',
                damage: parseInt(r.damage),
                isIronman: r.characters?.state?.isIronman === true
            }));
        } catch (err) {
            console.error('[WORLD_BOSS] Error fetching ranking history:', err);
            return [];
        }
    }
}
