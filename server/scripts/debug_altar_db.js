import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debug() {
    console.log("Checking characters table...");
    const { data: chars, error: charError } = await supabase
        .from('characters')
        .select('name, ranking_altar_donated, state->altar_total_donated')
        .order('ranking_altar_donated', { ascending: false })
        .limit(5);

    if (charError) console.error("Char Error:", charError);
    else console.log("Top chars by altar_donated:", chars);

    console.log("\nChecking leaderboards table...");
    const { data: lb, error: lbError } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('ranking_type', 'ALTAR_DONATION')
        .limit(5);

    if (lbError) console.error("LB Error:", lbError);
    else console.log("LB entries for ALTAR_DONATION:", lb);
}

debug();
