import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStats() {
    console.log("Checking global_stats...");
    const { data: stats, error: statsError } = await supabase
        .from('global_stats')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

    if (statsError) {
        console.error("Error fetching stats:", statsError);
    } else {
        console.log("Global Stats:", JSON.stringify(stats, null, 2));
    }

    console.log("\nChecking active players (characters with activity)...");
    const { data: active, error: activeError } = await supabase
        .from('characters')
        .select('user_id')
        .not('current_activity', 'is', null);

    if (activeError) {
        console.error("Error fetching active players:", activeError);
    } else {
        const unique = new Set((active || []).map(c => c.user_id)).size;
        console.log(`Active Players Count: ${unique}`);
        // console.log("Data sample:", JSON.stringify(active?.slice(0, 5), null, 2));
    }
}

checkStats();
