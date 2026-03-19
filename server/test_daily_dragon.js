import { WorldBossManager } from './managers/WorldBossManager.js';
import fs from 'fs';

const logFile = 'test_daily_dragon_results.log';
fs.writeFileSync(logFile, "Starting The Ancient Dragon (Daily Boss) Test...\n");

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

async function runTest() {
    log("Setting up mock dependencies...");

    const mockGameManager = {
        supabase: {
            from: () => ({
                insert: async () => ({ select: () => ({ single: async () => ({ data: { id: 1 }, error: null }) }) }),
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => ({ data: null }),
                        single: async () => ({ data: null }),
                        is: () => ({ maybeSingle: async () => ({ data: null }) })
                    }),
                    maybeSingle: async () => ({ data: null })
                }),
                upsert: async () => ({ error: null }),
                update: async () => ({ eq: async () => ({ error: null }) })
            }),
            rpc: async () => ({ error: null })
        },
        cache: {
            get: (id) => {
                if (id === 'char-dragon-1') return mockChar;
                return null;
            }
        },
        inventoryManager: {
            calculateStats: () => ({ attackSpeed: 1000, damage: 500, burstChance: 0 })
        },
        broadcast: (event, data) => {
            log(`[MockBroadcast] ${event}: ${JSON.stringify(data)}`);
        },
        quests: {
            handleProgress: () => {}
        }
    };

    const wbm = new WorldBossManager(mockGameManager);

    const mockChar = {
        id: 'char-dragon-1',
        name: 'DragonSlayer',
        state: {}
    };

    log("\n--- Step 1: Initialize The Ancient Dragon ---");
    const now = new Date();
    if (now.getUTCHours() >= 23 && now.getUTCMinutes() >= 50) {
        log("WARN: Current UTC time means boss is dead natively. Mocking checkBossCycle to bypass.");
        wbm.dailyBoss = {
            id: 'T10_BOSS',
            name: 'The Ancient Dragon',
            tier: 10,
            maxHP: 9500000,
            isAlive: true,
            endsAt: new Date(Date.now() + 3600000).toISOString(),
            type: 'daily'
        };
    } else {
        await wbm.checkDailyBoss();
    }
    
    if (wbm.dailyBoss && wbm.dailyBoss.isAlive) {
        log("The Ancient Dragon is alive and ready!");
    } else {
        log("ERROR: Boss did not spawn.");
        return;
    }

    wbm.checkBossParticipation = async () => false;
    wbm.saveParticipation = async (charId, dmg, name, type, sessionId) => { 
        log(`[MockDB] saveParticipation called: dmg=${dmg}, type=${type}, sessionId=${sessionId}`); 
    };
    wbm.refreshAllRankings = async () => { log("[MockDB] refreshAllRankings called."); };

    log("\n--- Step 2: Start Fight (Daily Type) ---");
    try {
        await wbm.startFight(mockChar, 'daily');
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

    log("\n--- Step 5: Test Daily Top 1 Announcement Error ---");
    wbm.dailyLiveRankings = { NORMAL: [{ character_id: 'char-456', name: 'OtherGuy', damage: 100000 }], IRONMAN: [] };
    wbm.activeFights.set(mockChar.id, { type: 'daily', damage: 200000, startedAt: Date.now() }); 
    try {
        await wbm.endFight(mockChar);
        log("PASS: endFight finished Top 1 check.");
    } catch (e) {
        log(`FAIL: endFight crashed! ${e.stack}`);
        success = false;
    }

    if (success) {
        log("\n✅ ALL TESTS PASSED! The Ancient Dragon logic is stable.");
    } else {
        log("\n❌ TESTS FAILED!");
    }
}

runTest().catch(e => log(`FATAL: ${e.message}`));
