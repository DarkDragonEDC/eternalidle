import { WorldBossManager } from './managers/WorldBossManager.js';
import fs from 'fs';

const logFile = 'test_wb_results.log';
fs.writeFileSync(logFile, "Starting World Boss Manager Test...\n");

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

async function runTest() {
    log("Setting up mock dependencies...");

    // Mock GameManager
    const mockGameManager = {
        supabase: {
            from: () => ({
                insert: async () => ({ select: () => ({ single: async () => ({ data: { id: 1 }, error: null }) }) }),
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => ({ data: null }),
                        single: async () => ({ data: null })
                    })
                }),
                upsert: async () => ({ error: null })
            })
        },
        cache: {
            get: (id) => {
                if (id === 'char-123') return mockChar;
                return null;
            }
        },
        inventoryManager: {
            calculateStats: () => ({ attackSpeed: 1000, damage: 500, burstChance: 0 })
        },
        broadcast: (event, data) => {
            log(`[MockBroadcast] ${event}: ${JSON.stringify(data)}`);
        }
    };

    const wbm = new WorldBossManager(mockGameManager);

    const mockChar = {
        id: 'char-123',
        name: 'TestHero',
        state: {}
    };

    log("\n--- Step 1: Initialize Boss ---");
    // Force current time to be "alive" hours
    const now = new Date();
    if (now.getUTCHours() >= 23 && now.getUTCMinutes() >= 50) {
        log("WARN: Current UTC time means boss is dead natively. Mocking checkBossCycle to bypass.");
        wbm.currentBoss = {
            id: 'THE_ANCIENT_DRAGON',
            name: 'The Ancient Dragon',
            isAlive: true,
            endsAt: new Date(Date.now() + 3600000).toISOString()
        };
    } else {
        await wbm.checkBossCycle();
    }
    
    if (wbm.currentBoss && wbm.currentBoss.isAlive) {
        log("Boss is alive and ready!");
    } else {
        log("ERROR: Boss did not spawn.");
        return;
    }

    // Mock DB method participation check to always allow
    wbm.checkDailyParticipation = async () => false;
    wbm.saveParticipation = async () => { log("[MockDB] saveParticipation called."); };
    wbm.refreshRankings = async () => { log("[MockDB] refreshRankings called."); };

    log("\n--- Step 2: Start Fight ---");
    try {
        await wbm.startFight(mockChar);
        log(`Fight started! activeFights size: ${wbm.activeFights.size}`);
        if (!mockChar.state.activeWorldBossFight) {
            log("ERROR: State persistence not set on char.");
        }
    } catch (e) {
        log(`ERROR on startFight: ${e.message}`);
        return;
    }

    log("\n--- Step 3: Process Ticks (Simulate 3 seconds) ---");
    const startTime = wbm.activeFights.get(mockChar.id).startedAt;
    
    for (let i = 1; i <= 3; i++) {
        await wbm.processTick(mockChar, startTime + (i * 1000));
        const currentDmg = wbm.activeFights.get(mockChar.id)?.damage;
        log(`Tick ${i}: total damage => ${currentDmg}`);
    }

    log("\n--- Step 4: Simulate End Fight (>60 seconds elapsed) ---");
    const endFightResult = await wbm.processTick(mockChar, startTime + 65000);
    
    log(`End Fight Triggered. Return payload:`);
    log(JSON.stringify(endFightResult, null, 2));

    let success = true;

    // Validation
    if (wbm.activeFights.has(mockChar.id)) {
        log("FAIL: activeFights map was not cleared! Character is ghost fighting!");
        success = false;
    } else {
        log("PASS: activeFights map cleared successfully.");
    }

    if (mockChar.state.activeWorldBossFight) {
        log("FAIL: char.state still has activeWorldBossFight!");
        success = false;
    } else {
        log("PASS: char.state persistence cleared successfully.");
    }

    // Checking Top 1 mock logic
    wbm.rankings = [{ character_id: 'char-456', name: 'OtherGuy', damage: 100000 }];
    wbm.activeFights.set(mockChar.id, { damage: 200000, startedAt: Date.now() }); // Force back to test Top 1 logic
    log("\n--- Step 5: Forcing Top 1 Announcement Error Check ---");
    try {
        await wbm.endFight(mockChar);
        log("PASS: endFight finished without ReferenceError (oldTop1).");
    } catch (e) {
        log(`FAIL: endFight crashed! ${e.stack}`);
        success = false;
    }

    if (success) {
        log("\n✅ ALL TESTS PASSED! WorldBossManager is stable.");
    } else {
        log("\n❌ TESTS FAILED!");
    }
}

runTest().catch(e => log(`FATAL: ${e.message}`));
