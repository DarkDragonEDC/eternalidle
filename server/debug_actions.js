import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debug() {
    console.log("Checking all characters and their action states...");
    const { data, error } = await supabase
        .from('characters')
        .select('id, name, current_activity, state');

    if (error) {
        console.error("Error:", error);
        return;
    }

    data.forEach(char => {
        const hasActivity = char.current_activity !== null;
        const hasCombat = char.state?.combat !== undefined && char.state?.combat !== null;
        const hasDungeon = char.state?.dungeon !== undefined && char.state?.dungeon !== null;

        console.log(`Character: ${char.name} (${char.id})`);
        console.log(` - current_activity: ${JSON.stringify(char.current_activity)}`);
        console.log(` - state.combat: ${char.state?.combat ? 'YES' : 'NO'}`);
        console.log(` - state.dungeon: ${char.state?.dungeon ? 'YES' : 'NO'}`);
        console.log(` - TOTAL: ${hasActivity || hasCombat || hasDungeon ? 'ACTIVE' : 'INACTIVE'}`);
        console.log("-------------------");
    });
}

debug();
