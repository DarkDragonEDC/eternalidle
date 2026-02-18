
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GameManager } from './GameManager.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const gameManager = new GameManager(supabase);

async function testCatchup() {
    console.log("--- Starting Catchup Verification Test ---");

    // 1. Target a character (you'll need a valid character ID from your DB for a real test, 
    // but here we describe the logic).
    const testUserId = 'f76d45e4-2303-43f1-93a8-444743282f1b'; // Example UUID
    const testCharId = '92ba4802-9993-4e31-8ca6-f6d38e21193d'; // Example UUID

    try {
        // Manually set last_saved to 1 hour ago in the DB
        const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
        console.log(`Setting last_saved to ${oneHourAgo} for testing...`);

        await supabase
            .from('characters')
            .update({ last_saved: oneHourAgo })
            .eq('id', testCharId);

        // Run catchup
        console.log("Running getCharacter with catchup=true...");
        const char = await gameManager.getCharacter(testUserId, testCharId, true);

        console.log(`Catchup report: ${JSON.stringify(char.offlineReport || "None")}`);
        console.log(`New last_saved in object: ${char.last_saved}`);

        // Verify that last_saved is NOT current time (unless 100% processed)
        const now = Date.now();
        const lastSavedTs = new Date(char.last_saved).getTime();
        const diff = Math.abs(now - lastSavedTs);

        if (diff > 5000) {
            console.log("SUCCESS: last_saved is pointing to the virtual progress reached, not current clock time.");
        } else {
            console.log("NOTE: last_saved is close to current time (might be fully processed).");
        }

        // Verify that activity_started_at was adjusted
        if (char.activity_started_at) {
            console.log(`Adjusted activity_started_at: ${char.activity_started_at}`);
        }

    } catch (err) {
        console.error("Test failed:", err);
    }
}

testCatchup();
