import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Try multiple .env locations
const envPaths = ['./.env', '../.env'];
let envLoaded = false;
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        envLoaded = true;
        console.log(`Loaded env from ${p}`);
        break;
    }
}

if (!envLoaded) {
    console.error("Could not find .env file!");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkCharacters() {
    console.log("Checking characters in DB...");
    
    // Total characters
    const { count, error: countError } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error("Error counting characters:", countError);
        return;
    }
    console.log(`Total characters: ${count}`);

    // All characters sample
    const { data: allChars, error: allErr } = await supabase
        .from('characters')
        .select('name, state')
        .limit(10);
    
    if (allErr) {
        console.error("Error fetching sample:", allErr);
    } else {
        console.log("Sample characters (first 10):");
        allChars.forEach(c => {
            console.log(` - ${c.name}: Ironman=${c.state?.isIronman}`);
        });
    }

    // Ironman test
    const { count: ironmanCount, error: ironmanErr } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .contains('state', { isIronman: true });

    console.log(`Ironman characters (filter 'contains'): ${ironmanCount} (Error: ${ironmanErr?.message || 'none'})`);

    // Normal test (not contains ironman)
    const { count: normalCount, error: normalErr } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .not('state', 'cs', '{"isIronman": true}');

    console.log(`Normal characters (filter 'not cs'): ${normalCount} (Error: ${normalErr?.message || 'none'})`);
}

checkCharacters();
