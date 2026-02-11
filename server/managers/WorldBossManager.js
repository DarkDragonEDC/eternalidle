import { ITEMS } from '../../shared/items.js';
import { WORLDBOSS_DROP_TABLE } from '../../shared/chest_drops.js';

export class WorldBossManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentBoss = null;
        this.rankings = []; // Last 24h ranking cache
        this.activeFights = new Map(); // characterId -> { startedAt, damage, lastLog }
    }

    async initialize() {
        console.log('[WORLD_BOSS] Initializing manager...');
        await this.checkBossCycle();
        await this.refreshRankings();

        // Refresh rankings every 5 minutes from DB to catch up with other shards (if any)
        setInterval(() => this.refreshRankings(), 300000);
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
        } catch (err) {
            console.error('[WORLD_BOSS] Error refreshing rankings:', err);
        }
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

        // Find player's current rank
        const myRankIndex = this.rankings.findIndex(r => r.character_id === charId);
        const myRank = myRankIndex !== -1 ? { ...this.rankings[myRankIndex], rank: myRankIndex + 1 } : null;

        // TODO: Check if player has rewards to claim
        const pendingReward = await this.getPendingReward(charId);

        return {
            boss: this.currentBoss,
            rankings: this.rankings.slice(0, 50), // Send top 50
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

        if (elapsed >= 60000) {
            console.log(`[WORLD_BOSS] Time limit reached for ${char.name}. Ending fight.`);
            return await this.endFight(char);
        }

        const stats = this.gameManager.inventoryManager.calculateStats(char);
        const tickElapsed = now - fight.lastTick;

        // Process damage (allowing multiple hits if tick skipped)
        const atkSpeed = Math.max(200, stats.attackSpeed || 1000);
        let rounds = 0;
        while (fight.lastTick + atkSpeed <= now && rounds < 10) {
            const damage = Math.max(1, stats.damage || 1);
            fight.damage += damage;
            fight.lastTick += atkSpeed;
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
                status: 'ACTIVE'
            }
        };
    }

    predictRankingPos(charId, currentDamage) {
        // Find where this damage would sit in the current cached rankings
        let pos = 1;
        for (const entry of this.rankings) {
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
            await this.saveParticipation(char.id, fight.damage);
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
            this.gameManager.broadcast('chat_message', {
                type: 'GLOBAL',
                sender: 'SYSTEM',
                message: `📢 ${newTop1.name} has just taken the Top 1 spot in the World Boss Ranking with ${newTop1.damage.toLocaleString()} damage!`
            });
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

    async saveParticipation(characterId, damage) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { error } = await this.gameManager.supabase
            .from('world_boss_attempts')
            .upsert({
                character_id: characterId,
                date: todayStr,
                damage: Math.floor(damage),
                claimed: false
            }, { onConflict: 'character_id,date' });

        if (error) console.error('[WORLD_BOSS] DB Error saving participation:', error);
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

        // For simplicity, return the most recent unclaimed one
        // In a real scenario, we might want to return all or aggregate.
        return data[0];
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

        let chestId = 'T1_WORLDBOSS_CHEST_NORMAL'; // Default fallback

        if (pos === 1) {
            chestId = 'T10_WORLDBOSS_CHEST_MASTERPIECE';
        } else {
            // PROPORTIONAL LOGIC: (Total - 1) / 49
            const poolSize = Math.max(1, Math.floor((totalParticipants - 1) / 49));
            // Adjust for very small participant count
            const groupIndex = Math.floor((pos - 2) / poolSize);

            // Map groupIndex (0-48) to Chest IDs from worst (T1 Normal) to best (T10 Excellent)
            // But we have 50 types (T1-T10 x 5). Masterpiece T10 is for pos 1. 
            // So we have 49 others.

            const chests = Object.keys(WORLDBOSS_DROP_TABLE).filter(c => c !== 'T10_WORLDBOSS_CHEST_MASTERPIECE');
            // 'chests' should have 49 items.
            // Best items are at the end of the list usually (T10 Excellent).
            // pos 2 should get chests[48], pos last should get chests[0].

            const reverseIndex = 48 - Math.min(48, groupIndex);
            chestId = chests[reverseIndex] || chests[0];
        }

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
