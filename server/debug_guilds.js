import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkGuilds() {
    console.log("Checking guilds table...");
    const { data: guilds, error } = await supabase
        .from('guilds')
        .select('*')
        .limit(5);

    if (error) {
        console.error("Error fetching guilds:", error);
    } else {
        console.log("Guilds found:", guilds.length);
        if (guilds.length > 0) {
            console.log("Columns:", Object.keys(guilds[0]).join(', '));
            console.log("Sample guild data:", JSON.stringify(guilds[0], null, 2));
        }
    }
}

checkGuilds();
