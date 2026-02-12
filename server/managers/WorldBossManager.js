import { ITEMS } from '../../shared/items.js';
import { WORLDBOSS_DROP_TABLE } from '../../shared/chest_drops.js';

export class WorldBossManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentBoss = null;
        this.rankings = []; // Last 24h ranking cache from DB
        this.liveRankings = []; // Merged real-time rankings (DB + Active Fights)
        this.activeFights = new Map(); // characterId -> { startedAt, damage, lastLog }
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
                .select('character_id, damage, characters(name)')
                .eq('date', dateStr)
                .order('damage', { ascending: false });

            if (error) throw error;

            this.rankings = data.map((r, index) => ({
                pos: index + 1,
                character_id: r.character_id,
                name: r.characters?.name || 'Unknown',
                damage: parseInt(r.damage)
            }));

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
                    pos: 0 // Will be calculated below
                });
            }
        });

        // 3. Convert to Array and Sort
        const sorted = Array.from(merged.values())
            .sort((a, b) => b.damage - a.damage);

        // 4. Assign Positions
        this.liveRankings = sorted.map((r, index) => ({
            ...r,
            pos: index + 1
        }));
    }

    async checkBossCycle() {
        const now = new Date();
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();

        const isAlive = (hours < 23) || (hours === 23 && minutes < 50);

        if (isAlive) {
            const endsAt = new Date(now);
            endsAt.setUTCHours(23, 50, 0, 0);

            // If already passed 23:50 UTC today, it's actually "tomorrow" or logic error for same day
            // But getUTCHours < 23 handles most cases.

            this.currentBoss = {
                id: 'THE_ANCIENT_DRAGON',
                name: 'The Ancient Dragon',
                isAlive: true,
                endsAt: endsAt.toISOString()
            };
        } else {
            this.currentBoss = null;
        }
    }

    async getStatus(charId) {
        await this.checkBossCycle();

        // Find player's current rank in LIVE rankings
        const myRankIndex = this.liveRankings.findIndex(r => r.character_id === charId);
        const myRank = myRankIndex !== -1 ? { ...this.liveRankings[myRankIndex] } : null;

        // TODO: Check if player has rewards to claim
        const pendingReward = await this.getPendingReward(charId);

        return {
            boss: this.currentBoss,
            rankings: this.liveRankings.slice(0, 50), // Send top 50 active
            myRank: myRank,
            pendingReward: pendingReward
        };
    }

    async startFight(char) {
        console.log(`[WORLD_BOSS] starting fight for ${char.name} (${char.id})`);
        if (!this.currentBoss) throw new Error("World Boss is currently resting.");

        const hasFought = await this.checkDailyParticipation(char.id);
        console.log(`[WORLD_BOSS] hasAlreadyFought today? ${hasFought}`);
        if (hasFought) throw new Error("You already challenged the World Boss today.");

        this.activeFights.set(char.id, {
            characterId: char.id,
            name: char.name,
            startedAt: Date.now(),
            damage: 0,
            lastTick: Date.now(),
            lastBroadcastPos: null
        });

        return { success: true };
    }

    async processTick(char, virtualTime = null) {
        const fight = this.activeFights.get(char.id);
        if (!fight) return;

        const now = virtualTime || Date.now();
        const elapsed = now - fight.startedAt;

        // console.log(`[WB_DEBUG] Tick for ${char.name}. Elapsed: ${elapsed}, Active: ${this.activeFights.has(char.id)}`);

        if (elapsed >= 60000) {
            console.log(`[WORLD_BOSS] Time limit reached for ${char.name}. Ending fight.`);
            return await this.endFight(char);
        }

        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const tickElapsed = now - fight.lastTick;

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

        // ALWAYS return status so the client timer updates
        return {
            worldBossUpdate: {
                damage: fight.damage,
                elapsed: elapsed,
                rankingPos: fight.lastBroadcastPos || this.predictRankingPos(char.id, fight.damage),
                rounds: rounds, // Might be 0
                hits: hits, // Send individual hits
                status: 'ACTIVE'
            }
        };
    }

    predictRankingPos(charId, currentDamage) {
        // Find where this damage would sit in the current LIVE rankings
        let pos = 1;
        for (const entry of this.liveRankings) {
            if (entry.character_id === charId) continue; // Ignore my previous record
            if (currentDamage > entry.damage) break;
            pos++;
        }
        return pos;
    }

    async endFight(char) {
        const fight = this.activeFights.get(char.id);
        if (!fight) {
            console.warn(`[WORLD_BOSS] endFight called for ${char.id} but no active fight found.`);
            return;
        }

        console.log(`[WORLD_BOSS] Fight ended for ${char.name}. Total Damage: ${fight.damage}`);

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
        if (newTop1 && (!oldTop1 || oldTop1.character_id !== newTop1.character_id)) {
            const announcement = `📢 ${newTop1.name} has just taken the Top 1 spot in the World Boss Ranking with ${newTop1.damage.toLocaleString()} damage!`;

            try {
                // 1. Persist to DB for history
                const { data: msgData, error: msgError } = await this.gameManager.supabase
                    .from('messages')
                    .insert({
                        sender_name: '[SYSTEM]',
                        content: announcement
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

        this.activeFights.delete(char.id);

        return {
            worldBossUpdate: {
                status: 'FINISHED',
                finalDamage: fight.damage,
                rankingPos: this.rankings.findIndex(r => r.character_id === char.id) + 1
            }
        };
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

    calculateChestReward(rank, totalParticipants) {
        // Validation
        if (rank <= 0 || totalParticipants <= 0) {
            return { id: 'T1_WORLDBOSS_CHEST_NORMAL', name: 'Unknown Chest' };
        }

        const availableChests = Object.keys(WORLDBOSS_DROP_TABLE); // T1_Common ... T10_Masterpiece (50 items)
        const maxIndex = availableChests.length - 1; // 49

        // Logic: Bottom-up progression
        // Rank N (Last) -> Score 0
        // Rank 1 (First) -> Score N-1
        const score = totalParticipants - rank;

        let index = 0;

        if (totalParticipants <= availableChests.length) {
            // If fewer players than chests, 1:1 mapping from bottom
            // 5 players: Rank 5->Idx 0, Rank 1->Idx 4
            index = score;
        } else {
            // More players than chests: Scale score to fit 0..49
            // Max Score = Total-1
            // Index = (Score / MaxScore) * 49

            // FIX: Prevent division by zero if totalParticipants is 1
            const maxScore = Math.max(1, totalParticipants - 1);
            const ratio = score / maxScore;

            index = Math.floor(ratio * maxIndex);
        }

        // Safety Clamp
        index = Math.max(0, Math.min(maxIndex, index));

        const chestId = availableChests[index];

        // Format Name
        const parts = chestId.split('_');
        const tier = parts[0];
        const rarity = parts[parts.length - 1]; // NORMAL, GOOD, etc.
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

        // Determine Rank and Chest
        // We need to fetch the ranking for that specific date to know the position
        const { data: rankingData } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .select('character_id, damage')
            .eq('date', reward.date)
            .order('damage', { ascending: false });

        if (!rankingData) return reward; // Fallback to basic info if fail

        const pos = rankingData.findIndex(r => r.character_id === charId) + 1;
        const totalParticipants = rankingData.length;

        const { id: chestId, name: chestName } = this.calculateChestReward(pos, totalParticipants);

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

        // Calculate Ranking again to be sure (snapshot)
        const dateStr = reward.date;
        const { data: rankingData } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .select('character_id, damage')
            .eq('date', dateStr)
            .order('damage', { ascending: false });

        const pos = rankingData.findIndex(r => r.character_id === char.id) + 1;
        if (pos === 0) throw new Error("Could not determine ranking position.");

        const totalParticipants = rankingData.length;

        const { id: chestId } = this.calculateChestReward(pos, totalParticipants);

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
                message: `You claimed your Ranking #${pos} reward! Received: ${chestId.replace(/_/g, ' ')}`,
                chestId: chestId,
                pos: pos
            };
        } else {
            throw new Error("Inventory is full! Please make space before claiming.");
        }
    }
}
