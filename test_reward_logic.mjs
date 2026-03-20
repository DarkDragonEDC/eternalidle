
import { WorldBossManager } from './server/managers/WorldBossManager.js';
import { WORLD_BOSSES } from './shared/world_bosses.js';

// Mock GameManager
const mockGameManager = {
    supabase: {
        from: (table) => ({
            select: (query) => ({
                eq: (key, val) => {
                    const obj = {
                        eq: (key2, val2) => ({
                            order: (key3, opts) => Promise.resolve({ data: mockData.shift(), error: null }),
                            is: (key3, val3) => obj.eq(key3, val3) // redundant but just in case
                        }),
                        order: (key2, opts) => Promise.resolve({ data: mockData.shift(), error: null })
                    };
                    return obj;
                }
            })
        })
    },
    cache: new Map()
};

let mockData = [];

async function test() {
    const manager = new WorldBossManager(mockGameManager);
    
    // Test Case 1: Window Boss DEFEATED
    console.log("--- Test Case 1: Window Boss DEFEATED ---");
    manager.windowSession = { id: 100 }; // Current session
    mockData = [[
        {
            id: 1,
            character_id: 'char1',
            session_id: 99, // Old session
            damage: 100,
            world_boss_sessions: { status: 'DEFEATED', tier: 1 }
        }
    ]];
    let reward = await manager.getPendingReward('char1');
    console.log("Reward Chest ID:", reward ? reward.chestId : "None");
    if (reward && reward.chestId === 'T10_WORLDBOSS_CHEST_MASTERPIECE') {
        console.log("RESULT: PASS");
    } else {
        console.log("RESULT: FAIL");
    }

    // Test Case 2: Window Boss NOT DEFEATED
    console.log("\n--- Test Case 2: Window Boss ACTIVE (Timed out) ---");
    mockData = [[
        {
            id: 2,
            character_id: 'char1',
            session_id: 98,
            damage: 5000000,
            world_boss_sessions: { status: 'ACTIVE', tier: 5 }
        }
    ]];
    reward = await manager.getPendingReward('char1');
    console.log("Reward Chest ID:", reward ? reward.chestId : "None");
    if (!reward) {
        console.log("RESULT: PASS");
    } else {
        console.log("RESULT: FAIL");
    }

    // Test Case 3: Daily Boss (Old Damage Milestone logic) ---
    console.log("\n--- Test Case 3: Daily Boss (T1 Normal) ---");
    mockData = [[
        {
            id: 3,
            character_id: 'char1',
            session_id: null,
            damage: 10, 
            date: '2020-01-01'
        }
    ]];
    reward = await manager.getPendingReward('char1');
    console.log("Reward Chest ID:", reward ? reward.chestId : "None");
    if (reward && reward.chestId === 'T1_WORLDBOSS_CHEST_NORMAL') {
        console.log("RESULT: PASS");
    } else {
        console.log("RESULT: FAIL");
    }

    // Test Case 4: Daily Boss High Damage
    console.log("\n--- Test Case 4: Daily Boss High Damage (T10 Masterpiece) ---");
    mockData = [[
        {
            id: 4,
            character_id: 'char1',
            session_id: null,
            damage: 2000000, 
            date: '2020-01-01'
        }
    ]];
    reward = await manager.getPendingReward('char1');
    console.log("Reward Chest ID:", reward ? reward.chestId : "None");
    if (reward && reward.chestId === 'T10_WORLDBOSS_CHEST_MASTERPIECE') {
        console.log("RESULT: PASS");
    } else {
        console.log("RESULT: FAIL");
    }
}

test().catch(err => {
    console.error("Test execution error:", err);
});
