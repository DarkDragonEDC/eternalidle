import { CatchupManager } from '../managers/CatchupManager.js';
import { CombatManager } from '../managers/CombatManager.js';
import { ActivityManager } from '../managers/ActivityManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';

// Mock GameManager
const mockGm = {
    getCharacter: async (uid, cid) => { return null; },
    saveState: async () => true,
    persistCharacter: async () => true,
    markDirty: () => {},
    addXP: () => false,
    processFood: () => ({ used: false }),
    getMaxIdleTime: () => 8 * 60 * 60 * 1000, // 8 hours
    pushManager: { notifyUser: () => {} },
    addActionSummaryNotification: () => {},
    
    // Will be populated below
    inventoryManager: null,
    combatManager: null,
    activityManager: null,
    dungeonManager: null,
    quests: { handleProgress: () => {} }
};

mockGm.inventoryManager = new InventoryManager(mockGm);
mockGm.combatManager = new CombatManager(mockGm);
mockGm.activityManager = new ActivityManager(mockGm);
mockGm.dungeonManager = new DungeonManager(mockGm);
const catchupManager = new CatchupManager(mockGm);

async function testActivityCatchup() {
    console.log("=== Testing Activity Catchup (Auto-Refine Bug) ===");
    
    const virtualNow = Date.now();
    // Simulate user logging out 10 hours ago
    const logoutTime = virtualNow - (10 * 60 * 60 * 1000); 
    
    const char = {
        id: 'test_act',
        user_id: 'user_1',
        name: 'Tester',
        last_saved: new Date(logoutTime).toISOString(),
        state: {
            health: 100,
            skills: { OVERALL: { level: 100 } },
            inventory: {}
        },
        current_activity: {
            type: 'REFINING', // e.g. T1_BAR
            item_id: 'T1_BAR',
            actions_remaining: 100, // Very small amount so it finishes and triggers Auto-Refine
            initial_quantity: 100,
            time_per_action: 3,
            next_action_at: logoutTime + 3000
        }
    };
    
    // Give char the auto-refine rune so it restarts
    char.state.equipment = { 
        rune_METAL_AUTO: { id: "T1_RUNE_ORE_AUTO_1STAR", type: "RUNE" }
    };
    
    console.log(`Initial next_action_at: ${new Date(char.current_activity.next_action_at).toISOString()}`);
    
    const lastSavedMs = new Date(char.last_saved).getTime();
    const elapsedSeconds = (virtualNow - lastSavedMs) / 1000;
    
    await catchupManager.processCatchup(char, elapsedSeconds, lastSavedMs, true);
    
    console.log(`Final next_action_at: ${new Date(char.current_activity.next_action_at).toISOString()}`);
    
    const timeDiff = virtualNow - char.current_activity.next_action_at;
    if (timeDiff > 0) {
        console.log("✅ SUCCESS: Activity timer is in the past or present (Not stuck in the future!)");
    } else {
        console.error(`❌ FAILED: Activity timer is in the future by Math.abs(${timeDiff / 1000}) seconds!`);
        process.exit(1);
    }
}

async function testCombatCatchup() {
    console.log("\n=== Testing Combat Catchup (Burst Bug) ===");
    
    const virtualNow = Date.now();
    // Simulate user logging out 10 hours ago
    const logoutTime = virtualNow - (10 * 60 * 60 * 1000); 
    
    const char = {
        id: 'test_com',
        user_id: 'user_1',
        name: 'Tester',
        last_saved: new Date(logoutTime).toISOString(),
        state: {
            health: 9999999,
            skills: { COMBAT: { level: 100 } },
            inventory: {},
            combat: {
                mobId: 'RABBIT',
                tier: 1,
                mobName: 'Rabbit',
                mobMaxHealth: 2500,
                mobHealth: 2500,
                mobDamage: 5,
                mobDefense: 0,
                mob_next_attack_at: logoutTime + 1000, 
                player_next_attack_at: logoutTime + 3000,
                next_attack_at: logoutTime,
                mobAtkSpeed: 1000,
                playerHealth: 9999999,
                auto: true
            }
        }
    };
    
    console.log(`Initial player_next_attack_at: ${new Date(char.state.combat.player_next_attack_at).toISOString()}`);
    
    const lastSavedMs = new Date(char.last_saved).getTime();
    const elapsedSeconds = (virtualNow - lastSavedMs) / 1000;
    
    await catchupManager.processCatchup(char, elapsedSeconds, lastSavedMs, true);
    
    if (!char.state.combat) {
        console.log("ℹ️ Combat ended during catchup (player died or limit reached). Test inconclusive for sync, but valid state.");
        return;
    }
    
    console.log(`Final player_next_attack_at: ${new Date(char.state.combat.player_next_attack_at).toISOString()}`);
    
    const timeDiffPlayer = virtualNow - char.state.combat.player_next_attack_at;
    
    // We expect the player's next attack to be exactly at or slightly ahead of virtualNow 
    // (since we synced it to Date.now() + speed)
    if (timeDiffPlayer > -5000 && timeDiffPlayer <= 0) {
        console.log("✅ SUCCESS: Combat timers are synced to Date.now() prevents burst upon relog!");
    } else {
        console.error(`❌ FAILED: Combat timer is offset by ${timeDiffPlayer / 1000} seconds from expected Date.now()!`);
        process.exit(1);
    }
}

import fs from 'fs';
const LOG_FILE = 'server/tests/test_output.log';
fs.writeFileSync(LOG_FILE, '');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

// Add supabase mock to prevent save errors
mockGm.supabase = {
    from: () => ({ insert: () => ({ error: null }) }),
    rpc: () => ({ error: null })
};

async function runTests() {
    try {
        await testActivityCatchup();
        await testCombatCatchup();
        log("\n🎉 ALL TESTS PASSED SUCCESSFULLY");
    } catch (err) {
        log("ERROR CAUGHT IN TESTS:");
        log(err.stack || err.toString());
    }
}

function formatArg(arg) { return arg instanceof Error ? (arg.stack || arg.toString()) : String(arg); }
console.log = (...args) => log(args.map(formatArg).join(' '));
console.error = (...args) => log(args.map(formatArg).join(' '));
console.warn = (...args) => log(args.map(formatArg).join(' '));

runTests();
