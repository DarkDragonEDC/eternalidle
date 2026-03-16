

const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null, error: null }) }) }) }) };


// Mock the entire environment to avoid DB/Socket dependencies
const mockChar = {
    id: 'char123',
    user_id: 'user123',
    name: 'Tester',
    state: {
        skills: { LUMBERJACK: { level: 10, xp: 0 }, ORE_MINER: { level: 10, xp: 0 } },
        inventory: [],
        actionQueue: [],
        membership: { active: true },
        notifications: [],
        queueSummary: null
    },
    current_activity: null,
    activity_started_at: null
};

const mockGm = {
    getCharacter: async () => mockChar,
    saveState: async () => true,
    persistCharacter: async () => true,
    markDirty: () => true,
    addXP: () => ({ skill: 'LUMBERJACK', level: 11 }),
    getMaxIdleTime: () => 3600000, // 1 hour
    inventoryManager: {
        calculateStats: () => ({ efficiency: {} }),
        canAddItem: () => true,
        addItemToInventory: () => true,
        hasItems: () => true,
        consumeItems: () => true,
        resolveItem: (id) => ({ id, name: id, tier: 1 })
    },
    notifications: {
        addNotification: (char, type, message) => {
            console.log(`[TEST-NOTIF] ${type}: ${message}`);
            char.state.notifications.push({ type, message });
        },
        addActionSummaryNotification: (char, title, stats, suffix) => {
            console.log(`[TEST-SUMMARY] Triggered for: ${title} ${suffix}`);
            char.state.notifications.push({ type: 'ACTIVITY_SUMMARY', title, message: `Summary for ${title}` });
        }
    },
    pushManager: {
        notifyUser: () => true,
        cancelActivityNotification: () => true,
        scheduleActivityNotification: () => true
    }
};

async function runTest() {
    console.log("=== Action Queue Notifications Logic Test ===");
    
    // We import the real ActivityManager but use our mockGm
    const { ActivityManager } = await import('./managers/ActivityManager.js');
    const am = new ActivityManager(mockGm);
    mockGm.activityManager = am;

    console.log("\n1. Enqueueing tasks...");
    await am.enqueueActivity('user123', 'char123', 'GATHERING', 'T1_WOOD', 2);
    await am.enqueueActivity('user123', 'char123', 'GATHERING', 'T1_ORE', 2);

    console.log("Current Activity:", mockChar.current_activity.item_id);
    console.log("Queue Length:", mockChar.state.actionQueue.length);

    console.log("\n2. Simulating finish of Wood...");
    // Mocking what processTick would do
    mockChar.current_activity.sessionItems = { 'T1_WOOD_LOG': 2 };
    mockChar.current_activity.sessionXp = 100;
    
    // Transition to next (Ore)
    await am.stopActivity('user123', 'char123', true);

    console.log("New Activity:", mockChar.current_activity.item_id);
    console.log("Queue Summary exists?", !!mockChar.state.queueSummary);
    console.log("Summary Activities so far:", mockChar.state.queueSummary.activities);

    console.log("\n3. Simulating finish of Ore...");
    mockChar.current_activity.sessionItems = { 'T1_ORE_TIN': 2 };
    mockChar.current_activity.sessionXp = 150;

    // Finish everything
    await am.stopActivity('user123', 'char123', true);

    console.log("\n4. Verifying final notifications...");
    const summaries = mockChar.state.notifications.filter(n => n.type === 'ACTIVITY_SUMMARY');
    const systemNotifs = mockChar.state.notifications.filter(n => n.type === 'SYSTEM');

    console.log("Total Summaries:", summaries.length);
    console.log("Total System Notifs:", systemNotifs.length);
    
    systemNotifs.forEach(n => console.log(" - System:", n.message));

    if (summaries.length !== 1) {
        throw new Error(`Expected 1 summary, got ${summaries.length}`);
    }
    
    // In this test, both activities are 'GATHERING', so title will be 'GATHERING'
    if (summaries[0].title !== "GATHERING") {
        throw new Error(`Expected title 'GATHERING', got '${summaries[0].title}'`);
    }

    console.log("Summary details match expectations.");

    console.log("\n=== TEST PASSED SUCCESSFULLY ===");
}

runTest().catch(err => {
    console.error("\n=== TEST FAILED ===");
    console.error(err);
    process.exit(1);
});
