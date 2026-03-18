import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GameManager } from './GameManager.js';
import fs from 'fs';

dotenv.config();

async function run() {
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        const gameManager = new GameManager(supabase);
        
        const { data: users } = await supabase.auth.admin.listUsers();
        const testUserId = users.users[0].id;

        const result = await gameManager.createCharacter(testUserId, 'servertest2', false);
        
        fs.writeFileSync('result.json', JSON.stringify({ success: true, result }, null, 2), 'utf8');
        console.log("ALL DONE SUCCESS");
        
        if (result && result.id) {
           await gameManager.deleteCharacter(testUserId, result.id);
        }
        process.exit(0);
    } catch(e) {
        fs.writeFileSync('result.json', JSON.stringify({ success: false, error: e.message, stack: e.stack }, null, 2), 'utf8');
        console.log("ALL DONE ERROR");
        process.exit(1);
    }
}

run();
