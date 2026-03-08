
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkSchema() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    const columnsToCheck = [
        'id', 'library_level', 'guild_hall_level',
        'gathering_xp_level', 'gathering_duplic_level', 'gathering_auto_level',
        'refining_xp_level', 'refining_duplic_level', 'refining_effic_level',
        'crafting_xp_level', 'crafting_duplic_level', 'crafting_effic_level'
    ];

    console.log("Checking all guild building columns...");
    for (const col of columnsToCheck) {
        const { error } = await supabase.from('guilds').select(col).limit(1);
        if (error) {
            console.log(`Column '${col}': MISSING (${error.message})`);
        } else {
            console.log(`Column '${col}': EXISTS`);
        }
    }
}

checkSchema();
