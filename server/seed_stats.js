import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedHistory() {
    console.log("Seeding global_stats history...");
    
    const { data: current } = await supabase.from('global_stats').select('*').eq('id', 'global').maybeSingle();
    
    if (!current) {
        console.error("Global stats record not found. Please run the server once first.");
        return;
    }

    const total = current.total_market_tax || 151047;
    const history = [];
    const now = new Date();
    
    // Seed last 6 days
    for (let i = 6; i >= 1; i--) {
        const d = new Date();
        d.setUTCDate(now.getUTCDate() - i);
        // Random increase between 5k and 25k
        const amount = Math.floor(Math.random() * 20000) + 5000;
        history.push({
            date: d.toISOString(),
            amount: amount
        });
    }

    // Adjust tax_24h_ago to make "Today" look active
    // Let's say today we already collected 1,234 silver
    const todayCollected = 1234;
    const tax_24h_ago = total - todayCollected;

    const { error } = await supabase
        .from('global_stats')
        .update({
            history: history,
            tax_24h_ago: tax_24h_ago,
            last_snapshot_at: now.toISOString()
        })
        .eq('id', 'global');

    if (error) {
        console.error("Error seeding history:", error);
    } else {
        console.log("Successfully seeded 6 days of history and adjusted baseline.");
    }
}

seedHistory();
