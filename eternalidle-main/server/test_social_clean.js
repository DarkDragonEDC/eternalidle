
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
    const charId = "95323ca3-85c9-4b5e-b4af-08aafa64c6ff";
    console.log("TEST_START");
    try {
        const friends = await gameManager.socialManager.getFriends(charId);
        for (const f of friends) {
            const actNames = f.activities.map(a => a.type + ":" + a.itemId).join(" | ");
            console.log(`FRIEND:${f.friendName} | ACTS:[${actNames}]`);
        }
    } catch (err) {
        console.log("ERROR:" + err.message);
    }
    console.log("TEST_END");
    process.exit(0);
}

test();
