import { ActivityManager } from './managers/ActivityManager.js';
import { resolveItem, ITEM_LOOKUP } from '../shared/items.js';
import fs from 'fs';

const logFile = 'test_queue_results.log';
// No need to clear it, just append or fresh start
fs.writeFileSync(logFile, `Starting Action Queue System Test at ${new Date().toISOString()}...\n`);

function log(msg) {
    const formatted = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    console.log(formatted);
    fs.appendFileSync(logFile, formatted + "\n");
}

async function runTest() {
    log("Setting up mock dependencies...");
    log(`ITEM_LOOKUP size: ${Object.keys(ITEM_LOOKUP).length}`);

    // Verify critical items for testing
    const wood = resolveItem('T1_WOOD');
    const ore = resolveItem('T1_ORE');
    const bar = resolveItem('T1_BAR');
    
    if (!wood || !ore || !bar) {
        log("ERROR: Critical items not found in ITEM_LOOKUP!");
        log(`T1_WOOD: ${!!wood}, T1_ORE: ${!!ore}, T1_BAR: ${!!bar}`);
        return;
    }

    const mockChar = {
        id: 'char-123',
        user_id: 'user-123',
        name: 'TestHero',
        state: {
            isPremium: true,
            skills: {
                LUMBERJACK: { level: 10, xp: 1000 },
                ORE_MINER: { level: 10, xp: 1000 },
                METAL_BAR_REFINER: { level: 10, xp: 1000 }
            },
            upgrades: { extraQueueSlots: 1 }, 
            actionQueue: []
        },
        inventory: {
            'T1_ORE': 100
        }
    };

    const mockGameManager = {
        getCharacter: async () => mockChar,
        saveState: async () => { /* log("[MockDB] saveState called."); */ },
        markDirty: () => {},
        getMaxIdleTime: () => 8 * 3600000,
        inventoryManager: {
            canAddItem: () => true,
            calculateStats: () => ({ efficiency: {} }),
            addItemToInventory: (char, itemId, qty) => {
                log(`[MockInv] Added ${qty}x ${itemId} to ${char.name}`);
                return true;
            },
            consumeItems: (char, req) => {
                log(`[MockInv] Consumed ${JSON.stringify(req)} from ${char.name}`);
                return true;
            },
            hasItems: () => true,
            resolveItem: (id) => resolveItem(id)
        },
        addNotification: (char, type, msg) => log(`[Notification] ${type}: ${msg}`),
        addActionSummaryNotification: (char, type, details, suffix) => log(`[Summary] ${type} ${suffix}: ${JSON.stringify(details)}`),
        broadcastToCharacter: (id, event, data) => log(`[Broadcast] ${event}: ${JSON.stringify(data)}`),
        addXP: (char, skill, amount) => {
            log(`[MockXP] Added ${Math.floor(amount)} XP to ${skill}`);
            return false; 
        }
    };

    const am = new ActivityManager(mockGameManager);

    log("\n--- Case 1: Membership Restriction ---");
    mockChar.state.isPremium = false;
    try {
        await am.enqueueActivity(mockChar.user_id, mockChar.id, 'GATHERING', 'T1_WOOD', 10);
        log("FAIL: Non-member could enqueue!");
    } catch (e) {
        log(`PASS: Caught expected error: ${e.message}`);
    }
    mockChar.state.isPremium = true;

    log("\n--- Case 2: Auto-Start (Queue Empty) ---");
    // Should start immediately if not farming
    mockChar.current_activity = null;
    const res2 = await am.enqueueActivity(mockChar.user_id, mockChar.id, 'GATHERING', 'T1_WOOD', 5);
    if (res2.autoStarted) {
        log("PASS: Activity auto-started as expected.");
        log(`Current Activity: ${mockChar.current_activity.item_id} (${mockChar.current_activity.actions_remaining} actions)`);
    } else {
        log("FAIL: Activity did not auto-start when idle.");
    }

    log("\n--- Case 3: Enqueue While Busy ---");
    const res3 = await am.enqueueActivity(mockChar.user_id, mockChar.id, 'GATHERING', 'T1_ORE', 20);
    if (mockChar.state.actionQueue.length === 1 && mockChar.state.actionQueue[0].item_id === 'T1_ORE') {
        log("PASS: Enqueued second action while first is running.");
    } else {
        log(`FAIL: Expected queue length 1, got ${mockChar.state.actionQueue.length}`);
    }

    log("\n--- Case 4: Queue Slot Limit ---");
    await am.enqueueActivity(mockChar.user_id, mockChar.id, 'REFINING', 'T1_BAR', 50); // This fills slot 2
    try {
        await am.enqueueActivity(mockChar.user_id, mockChar.id, 'GATHERING', 'T2_WOOD', 5);
        log("FAIL: Exceeded queue slot limit (2)!");
    } catch (e) {
        log(`PASS: Caught expected error: ${e.message}`);
    }

    log("\n--- Case 5: Duration Limit ---");
    mockChar.state.actionQueue = []; // Clear for clean test
    try {
        // Max idle is 8h (28800s). T1_WOOD takes ~15s (from items.js). 
        // 2000 actions = 30000s > 28800s.
        await am.enqueueActivity(mockChar.user_id, mockChar.id, 'GATHERING', 'T1_WOOD', 2000);
        log("FAIL: Exceeded duration limit!");
    } catch (e) {
        log(`PASS: Caught expected error: ${e.message}`);
    }

    log("\n--- Case 6: Queue Management (Reorder/Remove) ---");
    mockChar.state.actionQueue = [
        { item_id: 'T1_WOOD', type: 'GATHERING', quantity: 10, time_per_action: 1 },
        { item_id: 'T1_ORE', type: 'GATHERING', quantity: 5, time_per_action: 2 }
    ];
    await am.reorderQueue(mockChar.user_id, mockChar.id, 0, 'down');
    if (mockChar.state.actionQueue[0].item_id === 'T1_ORE') {
        log("PASS: Queue reordered correctly.");
    } else {
        log("FAIL: Queue reorder failed.");
    }

    await am.removeFromQueue(mockChar.user_id, mockChar.id, 0);
    if (mockChar.state.actionQueue.length === 1 && mockChar.state.actionQueue[0].item_id === 'T1_WOOD') {
        log("PASS: Action removed from queue.");
    } else {
        log("FAIL: Remove from queue failed.");
    }

    log("\n--- Case 7: Lifecycle (Auto-chaining) ---");
    // Start with a farming activity
    mockChar.current_activity = { 
        type: 'GATHERING', 
        item_id: 'T1_WOOD', 
        actions_remaining: 1, 
        time_per_action: 1,
        sessionItems: {},
        sessionXp: 0
    };
    mockChar.state.actionQueue = [{ 
        item_id: 'T1_BAR', 
        type: 'REFINING', 
        quantity: 10, 
        time_per_action: 1.5 
    }];
    
    log("Simulating stopActivity (which triggers queue check)...");
    await am.stopActivity(mockChar.user_id, mockChar.id);
    
    if (mockChar.current_activity && mockChar.current_activity.item_id === 'T1_BAR') {
        log("PASS: Next item in queue automatically started!");
        log(`New Current Activity: ${mockChar.current_activity.item_id}`);
    } else {
        log(`FAIL: Next item did not start. Current activity: ${mockChar.current_activity?.item_id || 'none'}`);
    }

    log("\n--- Case 8: Relentless Chaining (Stress Test) ---");
    // Clear everything
    mockChar.current_activity = null;
    mockChar.state.actionQueue = [];
    mockChar.state.upgrades.extraQueueSlots = 10; // Allow a long queue for stress test

    const manyActions = [
        { type: 'GATHERING', id: 'T1_WOOD', qty: 1 },
        { type: 'GATHERING', id: 'T2_WOOD', qty: 1 },
        { type: 'GATHERING', id: 'T1_ORE', qty: 1 },
        { type: 'REFINING', id: 'T1_BAR', qty: 1 },
        { type: 'GATHERING', id: 'T1_HIDE', qty: 1 }
    ];

    for (const act of manyActions) {
        await am.enqueueActivity(mockChar.user_id, mockChar.id, act.type, act.id, act.qty);
    }

    log(`Initial queue length: ${mockChar.state.actionQueue.length} (Expected 4, since 1st auto-started)`);
    log(`Current auto-started: ${mockChar.current_activity.item_id} (Expected T1_WOOD)`);

    let chainCount = 0;
    while (mockChar.current_activity && chainCount < 10) {
        log(`-> Finishing ${mockChar.current_activity.item_id}...`);
        await am.stopActivity(mockChar.user_id, mockChar.id);
        chainCount++;
    }

    if (chainCount === 5) {
        log("PASS: Relentless chaining processed all 5 actions correctly.");
    } else {
        log(`FAIL: Chained ${chainCount} actions instead of 5.`);
    }

    log("\n--- Case 9: Failure Recovery in Queue ---");
    mockChar.current_activity = { item_id: 'FINISHING_SOON', type: 'GATHERING', actions_remaining: 1, time_per_action: 1 };
    mockChar.state.actionQueue = [
        { item_id: 'BROKEN_ITEM', type: 'GATHERING', quantity: 5, time_per_action: 1 }, // This will fail resolveItem or level
        { item_id: 'T1_WOOD', type: 'GATHERING', quantity: 10, time_per_action: 1 }
    ];

    log("Finishing current activity to trigger broken one...");
    await am.stopActivity(mockChar.user_id, mockChar.id);

    // Current activity should now be null or next valid if error handled gracefully
    // According to ActivityManager.js line 194, if queue fails it stops to avoid infinite loops
    if (!mockChar.current_activity) {
        log("PASS: Queue stopped gracefully after failing to start a broken action.");
    } else {
        log(`FAIL: Queue is in unexpected state: ${mockChar.current_activity.item_id}`);
    }

    log("\n✅ ALL TESTS COMPLETED!");
}

runTest().catch(e => {
    log(`FATAL ERROR: ${e.message}`);
    log(e.stack);
});
