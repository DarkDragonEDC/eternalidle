import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStats() {
    const { data: stats } = await supabase.from('global_stats').select('*').eq('id', 'global').maybeSingle();
    console.log("DB GLOBAL STATS:", JSON.stringify(stats, null, 2));
    
    // Check if fields match what StatsManager.js expects:
    // market_tax_total, trade_tax_total, total_market_tax
    if (stats) {
        const expectedTotal = (Number(stats.market_tax_total) || 0) + (Number(stats.trade_tax_total) || 0);
        console.log(`Calculated sum (Market + Trade): ${expectedTotal}`);
        console.log(`Stored total_market_tax: ${stats.total_market_tax}`);
    }
}

checkStats();
