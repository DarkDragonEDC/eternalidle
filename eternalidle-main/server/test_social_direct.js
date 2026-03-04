
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import { GameManager } from './GameManager.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const gameManager = new GameManager(supabase);

async function test() {
    console.log("Testing SocialManager for EternoDev...");
    const charId = "95323ca3-85c9-4b5e-b4af-08aafa64c6ff";

    // We need to wait a bit for managers to init potentially?
    // But social manager is sync in constructor.

    try {
        const friends = await gameManager.socialManager.getFriends(charId);
        console.log(`Found ${friends.length} friends.`);
        friends.forEach(f => {
            console.log(`- Friend: ${f.friendName}`);
            console.log(`  Activities: ${JSON.stringify(f.activities, null, 2)}`);
            console.log(`  CurrentActivity: ${JSON.stringify(f.currentActivity, null, 2)}`);
        });
    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

test();
