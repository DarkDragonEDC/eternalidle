import { AltarManager } from './managers/AltarManager.js';

// Mocking Dependencies
class MockSupabase {
    constructor() {
        this.storage = {
            global: { id: 'global', target_date: new Date().toISOString().split('T')[0], total_silver: 0, last_notified_tier: 0 }
        };
    }
    from(table) {
        return {
            select: (cols) => ({
                eq: (key, val) => ({
                    maybeSingle: async () => ({ data: this.storage[val], error: null }),
                    single: async () => ({ data: this.storage[val], error: null })
                })
            }),
            upsert: async (data, options) => {
                this.storage[data.id] = { ...this.storage[data.id], ...data };
                return { error: null };
            }
        };
    }
}

class MockGameManager {
    constructor() {
        this.supabase = new MockSupabase();
        this.dirtyChars = new Set();
        this.broadcasts = [];
        this.characters = {
            'char1': {
                id: 'char1',
                user_id: 'user1',
                state: { silver: 100_000_000, altar: null }
            }
        };
        this.notificationService = {
            broadcastAltarTier: (tier) => {
                console.log(`   [MOCK-NOTIF] Broadcasting Tier ${tier} notification!`);
                this.broadcasts.push({ type: 'push', tier });
            }
        };
    }
    markDirty(charId) { this.dirtyChars.add(charId); }
    broadcast(event, data) { 
        this.broadcasts.push({ type: 'socket', event, data }); 
    }
    async executeLocked(userId, label, fn) { return await fn(); }
    async getCharacter(userId, charId) {
        return this.characters[charId];
    }
}

// Test Runner
async function runTests() {
    console.log('🧪 Starting Altar System Automated Tests...\n');
    const gm = new MockGameManager();
    const altar = new AltarManager(gm);
    await altar.init();

    let testsPassed = 0;
    const assert = (condition, message, actual = null, expected = null) => {
        if (!condition) {
            const detail = (actual !== null) ? ` (Actual: ${actual}, Expected: ${expected})` : '';
            console.error(` ❌ ${message}${detail}`);
            throw new Error(`Test Failed: ${message}`);
        }
        console.log(` ✅ ${message}`);
        testsPassed++;
    };

    try {
        // 1. Initial State
        assert(altar.globalAltar.totalSilver === 0, 'Initial total silver should be 0', altar.globalAltar.totalSilver, 0);
        assert(altar.globalAltar.lastNotifiedTier === 0, 'Initial notified tier should be 0', altar.globalAltar.lastNotifiedTier, 0);

        // 2. Donation Logic
        console.log('\n--- Testing Donations ---');
        const char = await gm.getCharacter('user1', 'char1');
        
        // T1 Threshold is 2M. Let's donate 1.5M first.
        console.log(' > Donating 1.5M...');
        await altar.donate('user1', 'char1', 1_500_000);
        assert(altar.globalAltar.totalSilver === 1_500_000, 'Global silver should be 1.5M', altar.globalAltar.totalSilver, 1_500_000);
        assert(altar.globalAltar.lastNotifiedTier === 0, 'No notification should be sent yet (below 2M)', altar.globalAltar.lastNotifiedTier, 0);
        assert(char.state.silver === 98_500_000, 'Player silver should be deducted correctly', char.state.silver, 98_500_000);

        // Crossing T1 (2M)
        console.log(' > Donating 600K...');
        await altar.donate('user1', 'char1', 600_000);
        assert(altar.globalAltar.totalSilver === 2_100_000, 'Global silver should reach 2.1M', altar.globalAltar.totalSilver, 2_100_000);
        assert(altar.globalAltar.lastNotifiedTier === 1, 'Tier 1 notification should be triggered', altar.globalAltar.lastNotifiedTier, 1);
        assert(gm.broadcasts.some(b => b.tier === 1), 'Push notification for T1 should be in logs');

        // Another donation - should NOT repeat T1 notification
        const initialNotifCount = gm.broadcasts.filter(b => b.tier === 1).length;
        await altar.donate('user1', 'char1', 100_000);
        assert(gm.broadcasts.filter(b => b.tier === 1).length === initialNotifCount, 'Notification should not repeat for the same tier', gm.broadcasts.filter(b => b.tier === 1).length, initialNotifCount);

        // 3. Buff Activation
        console.log('\n--- Testing Buff Activation ---');
        // Tier 1 Goal (2M) reached. Min donation for T1 is 2000. Player donated 2.2M already.
        const state = await altar.activateBuff('user1', 'char1', 1);
        assert(state.player.tier1EndTime > Date.now(), 'Tier 1 buff should be active');
        
        // Try activating Tier 2 (Goal 5M). Current 2.2M.
        try {
            await altar.activateBuff('user1', 'char1', 2);
            assert(false, 'Should NOT allow T2 activation before goal');
        } catch (e) {
            assert(e.message.includes('5') && e.message.includes('not reached'), `Correct error for goal not reached: ${e.message}`);
        }

        // 4. Daily Reset
        console.log('\n--- Testing Daily Reset ---');
        altar.globalAltar.date = '2020-01-01'; // Force old date
        altar.checkDailyReset();
        assert(altar.globalAltar.totalSilver === 0, 'Global silver should reset on new day', altar.globalAltar.totalSilver, 0);
        assert(altar.globalAltar.lastNotifiedTier === 0, 'Notified tier should reset on new day', altar.globalAltar.lastNotifiedTier, 0);

        const charReset = await gm.getCharacter('user1', 'char1');
        charReset.state.altar.date = '2020-01-01'; // Force old date for player too
        const playerState = altar._getPlayerState(charReset);
        assert(playerState.donated === 0, 'Player donation should reset on new day', playerState.donated, 0);
        assert(playerState.tier1EndTime === null, 'Buffs should reset to null on new day', playerState.tier1EndTime, null);

        // 5. Tier Multi-Jump
        console.log('\n--- Testing Tier Multi-Jump ---');
        // Donate 10.5M at once (should trigger T3 notification directly)
        await altar.donate('user1', 'char1', 10_500_000);
        assert(altar.globalAltar.lastNotifiedTier === 3, 'Should jump directly to T3 notified tier', altar.globalAltar.lastNotifiedTier, 3);

        console.log(`\n🎉 All tests passed successfully!`);
    } catch (err) {
        console.error('\n❌ CRITICAL TEST FAILURE:');
        console.error(err.stack || err.message);
        process.exit(1);
    }
}

runTests();
