import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GameManager } from './GameManager.js';
import fs from 'fs';

dotenv.config();

async function test() {
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const gameManager = new GameManager(supabase);
        const testUserId = "someid"; // doesn't matter for just instantiating probably

        const result = await gameManager.createCharacter(testUserId, 'servertest1', false);
        fs.writeFileSync('err.txt', "Success " + JSON.stringify(result));
    } catch(e) {
        fs.writeFileSync('err.txt', e.stack);
    }
}

test().catch(e => fs.writeFileSync('err.txt', e.stack));
