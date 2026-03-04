
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    console.log("Searching for combatants...");
    const { data, error } = await supabase
        .from('characters')
        .select('id, name, combat, dungeon, state')
        .or('combat.not.is.null,dungeon.not.is.null');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} potential combatants.`);
    data.forEach(c => {
        console.log(`Char: ${c.name} (${c.id})`);
        console.log(`  Combat: ${JSON.stringify(c.combat)}`);
        console.log(`  Dungeon: ${JSON.stringify(c.dungeon)}`);
        console.log(`  StateCombat: ${JSON.stringify(c.state?.combat)}`);
    });
}

check();
