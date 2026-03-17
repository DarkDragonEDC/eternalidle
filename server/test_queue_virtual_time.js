
import { resolveItem } from '../shared/items.js';

// Mock environment
const mockChar = {
    id: 'char_test',
    user_id: 'user_test',
    name: 'TimeTraveler',
    state: {
        skills: { 
            LUMBERJACK: { level: 10, xp: 0 }, 
            PLANK_REFINER: { level: 10, xp: 0 } 
        },
        inventory: { T1_WOOD: 100 },
        actionQueue: [],
        membership: { active: true },
        notifications: [],
        queueSummary: null
    },
    current_activity: null,
    activity_started_at: null,
    last_saved: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
};

const mockGm = {
    getCharacter: async () => mockChar,
    saveState: async () => true,
    persistCharacter: async () => true,
    markDirty: () => true,
    addXP: () => ({ skill: 'LUMBERJACK', level: 10 }),
    getMaxIdleTime: () => 36000000, // 10 hours
    inventoryManager: {
        calculateStats: () => ({ efficiency: {} }),
        canAddItem: () => true,
        addItemToInventory: (char, id, qty) => {
            char.state.inventory[id] = (char.state.inventory[id] || 0) + qty;
            return true;
        },
        hasItems: (char, req) => {
            for (const [id, qty] of Object.entries(req)) {
                if ((char.state.inventory[id] || 0) < qty) return false;
            }
            return true;
        },
        consumeItems: (char, req) => {
            for (const [id, qty] of Object.entries(req)) {
                char.state.inventory[id] -= qty;
            }
            return true;
        }
    },
    notifications: {
        addNotification: (char, type, message) => console.log(`[NOTIF] ${type}: ${message}`),
        addActionSummaryNotification: (char, title, stats) => console.log(`[SUMMARY] ${title}`),
        addActionSummaryNotification: () => {}
    },
    pushManager: {
        notifyUser: () => true,
        cancelActivityNotification: () => true,
        scheduleActivityNotification: () => true
    }
};

async function runTest() {
    console.log("=== Queue & Virtual Time Logic Test ===");
    
    // 1. Test Material Validation in enqueueActivity
    console.log("\n--- Testing Material Validation ---");
    const { ActivityManager } = await import('./managers/ActivityManager.js');
    const am = new ActivityManager(mockGm);
    mockGm.activityManager = am;

    // T1_PLANK needs T1_WOOD: 2
    // We have 100 logs. Enqueueing 60 planks (needs 120 logs) should fail.
    try {
        await am.enqueueActivity('user_test', 'char_test', 'REFINING', 'T1_PLANK', 60);
        console.error("FAILED: Should have blocked enqueuing 60 planks (need 120 logs, have 100)");
        process.exit(1);
    } catch (err) {
        if (err.message.includes('Insufficient materials')) {
            console.log("SUCCESS: Blocked enqueuing due to insufficient materials:", err.message);
        } else {
            console.error("FAILED: Unexpected error during material validation:", err.message);
            process.exit(1);
        }
    }

    // Enqueueing 10 planks (needs 20 logs) should succeed.
    await am.enqueueActivity('user_test', 'char_test', 'REFINING', 'T1_PLANK', 10);
    console.log("SUCCESS: Enqueued 10 planks (needs 20 logs)");

    // 2. Test Virtual Time Propagation
    console.log("\n--- Testing Virtual Time Propagation ---");
    // Setup: Reset char, queue two 10-minute activities
    mockChar.current_activity = null;
    mockChar.state.actionQueue = [];
    mockChar.state.inventory.T1_WOOD = 100;
    
    const tenMinsInMs = 10 * 60 * 1000;
    const startTime = Date.now();
    const virtualStartTime = new Date(startTime - (30 * 60 * 1000)); // 30 mins ago

    // Start first activity with virtual startTime
    await am.startActivity('user_test', 'char_test', 'GATHERING', 'T1_WOOD', 10, virtualStartTime);
    console.log("Activity 1 started at:", mockChar.activity_started_at);
    
    // Enqueue second activity
    await am.enqueueActivity('user_test', 'char_test', 'GATHERING', 'T1_WOOD', 10);
    
    // Finish first activity at virtualTime + 10 mins
    const activity1EndTime = new Date(virtualStartTime.getTime() + tenMinsInMs);
    console.log("Simulating Activity 1 finish at:", activity1EndTime.toISOString());
    
    await am.stopActivity('user_test', 'char_test', true, activity1EndTime);
    
    console.log("Activity 2 started at:", mockChar.activity_started_at);
    
    const diff = activity1EndTime.getTime() - new Date(mockChar.activity_started_at).getTime();
    if (Math.abs(diff) > 1000) {
        console.error(`FAILED: Activity 2 should start exactly when Activity 1 ended. Diff: ${diff}ms`);
        console.error(`Expected: ${activity1EndTime.toISOString()}`);
        console.error(`Got: ${mockChar.activity_started_at}`);
        process.exit(1);
    }
    console.log("SUCCESS: Virtual time propagated correctly to the next queued activity!");

    console.log("\n=== ALL QUEUE TESTS PASSED ===");
}

runTest().catch(err => {
    console.error("TEST CRASHED:", err);
    process.exit(1);
});
