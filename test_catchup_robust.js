
import { createClient } from '@supabase/supabase-js';
import { GameManager } from './server/GameManager.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = {
    from: () => ({
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        upsert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) })
    }),
    auth: { getUser: () => ({ data: { user: {} }, error: null }) }
};
const gameManager = new GameManager(supabase);

const mockChar = {
    id: 'test-char-robust',
    user_id: 'test-user',
    name: 'EternoRobustMock',
    last_saved: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    current_activity: {
        type: 'GATHERING',
        item_id: 'T1_HERB',
        actions_remaining: 1000,
        time_per_action: 3
    },
    activity_started_at: new Date(Date.now() - 600000).toISOString(),
    state: {
        inventory: {},
        skills: {
            HERBALISM: { level: 1, xp: 0 }
        },
        health: 100
    }
};

// Mock character loader
gameManager.getCharacter = async (u, c, catchup, bypass) => {
    // If not catchup, just return raw
    if (!catchup) return JSON.parse(JSON.stringify(mockChar));

    // If catchup, use the actual logic from GameManager
    // But we need to simulate the initial load
    const data = JSON.parse(JSON.stringify(mockChar));
    return await gameManager.getCharacterInternal(u, c, catchup, bypass, data);
};

// We need to access the logic inside getCharacter without the DB call
// I'll manually run the catchup logic block here for testing
async function test() {
    console.log("--- ROBOTIC CATCHUP TEST ---");

    const data = JSON.parse(JSON.stringify(mockChar));
    const now = Date.now();
    const lastSaved = new Date(data.last_saved).getTime();
    const elapsedSeconds = (now - lastSaved) / 1000;

    console.log(`Elapsed: ${elapsedSeconds}s`);

    const actionsPossible = Math.floor(elapsedSeconds / 3);
    const toProcess = Math.min(actionsPossible, data.current_activity.actions_remaining);

    console.log(`Processing ${toProcess} gathering actions...`);

    const report = await gameManager.processBatchActions(data, toProcess);

    console.log("Report:", JSON.stringify(report, null, 2));

    if (report.processed > 0) {
        console.log("SUCCESS: Gathering processed.");
    } else {
        console.error("FAILURE: Gathering NOT processed.");
    }

    // Now test combat
    console.log("\n--- ROBOTIC COMBAT TEST ---");
    data.current_activity = null;
    data.state.combat = {
        mobId: 'RABBIT',
        tier: 1,
        mobName: 'Rabbit',
        mobMaxHealth: 20,
        mobHealth: 20,
        mobDamage: 2,
        mobDefense: 0,
        mobAtkSpeed: 2000,
        playerHealth: 100,
        started_at: new Date(Date.now() - 600000).toISOString()
    };
    data.state.skills.COMBAT = { level: 1, xp: 0 };

    const atkSpeed = 1000;
    const maxRounds = Math.floor(600 / 1); // 10 minutes, 1 round per second

    console.log(`Processing ${maxRounds} combat rounds...`);
    const combatReport = await gameManager.processBatchCombat(data, maxRounds);

    console.log("Combat Report:", JSON.stringify(combatReport, null, 2));

    if (combatReport.kills > 0) {
        console.log("SUCCESS: Combat processed.");
    } else {
        console.error("FAILURE: Combat NOT processed.");
    }
}

test();
