import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRLS() {
    console.log("Checking RLS on guilds table...");
    // Try to select using the ANON key (if possible)
    const { data, error } = await supabase
        .from('guilds')
        .select('id')
        .limit(1);

    if (error) {
        console.error("Error with current key:", error);
    } else {
        console.log("Read successful. Rows found:", data.length);
    }

    // Check if we can see the same data as the service role
    // (The server usually uses service role if configured)
}

checkRLS();
