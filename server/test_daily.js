import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env' });

import { GameManager } from './GameManager.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const mockDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    const gameManager = new GameManager(new Server(createServer()));
    await gameManager.initialize();

    // The user's user_id from previous check: 5093ffaa-4770-4123-a83b-fca97a30601b
    const userId = "5093ffaa-4770-4123-a83b-fca97a30601b";

    // Call getCharacter without a character ID initially to test the fallback,
    // which simulates what happens if charId is not provided or cache happens.
    const char = await gameManager.getCharacter(userId, null);

    console.log("Returned Char ID:", char?.id);
    console.log("Returned Char user_id:", char?.user_id);
    console.log("Returned Char name:", char?.name);

    // Now simulate an F5 (cache hit)
    const charFromCache = await gameManager.getCharacter(userId, char.id);
    console.log("From Cache user_id:", charFromCache?.user_id);

    // Now check canSpin
    const canSpin = await gameManager.dailyRewardManager.canSpin(charFromCache);
    console.log("canSpin output:", canSpin);

    process.exit(0);
}

run();
