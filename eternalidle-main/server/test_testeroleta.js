import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { DailyRewardManager } from './managers/DailyRewardManager.js';
import { GameManager } from './GameManager.js';
const mockDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    // GameManager expects (supabase) as first arg
    const gameManager = new GameManager(mockDb);
    // Wait, does it need initialized? 
    // In GameManager.js: this.statsPromise = this.loadGlobalStats(); 
    // It doesn't have an async initialize() method exposed or required for getCharacter usually.
    // But let's check if loadGlobalStats fails? It swallows error in loop but maybe not initial promise.

    // We need to wait for statsPromise? 
    // But let's just try calling getCharacter directly.

    const { data: dbChar } = await mockDb.from('characters').select('*').eq('name', 'testeroleta').single();
    if (!dbChar) return console.log("No testeroleta");

    console.log("Full char loaded from DB directly:", dbChar.name, "user_id:", dbChar.user_id);
    console.log("isIronman in DB:", dbChar.state?.isIronman);

    try {
        // Use getCharacter properly
        const char = await gameManager.getCharacter(dbChar.user_id, dbChar.id);
        console.log("getCharacter success.");

        const canSpin = await gameManager.dailyRewardManager.canSpin(char);
        console.log("canSpin output for testeroleta via GameManager:", canSpin);
    } catch (err) {
        console.error("GameManager logic failed:", err);
    }

    process.exit(0);
}

run();
