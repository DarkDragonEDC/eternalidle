
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
    console.log("Checking schema for ranking columns...");
    try {
        const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'characters' });
        
        // If RPC isn't available, try a direct query to information_schema if possible (Supabase usually restricts this)
        // Alternative: try to select the columns and see if it fails
        const { data: cols, error: err2 } = await supabase.from('characters').select('ranking_total_level, ranking_total_xp, ranking_item_power').limit(1);
        
        if (err2) {
            console.error("Column check failed:", err2.message);
            if (err2.message.includes("column") && err2.message.includes("does not exist")) {
                console.log("RANKING COLUMNS ARE MISSING!");
            }
        } else {
            console.log("Ranking columns EXIST.");
            console.log("Sample values:", cols[0]);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkSchema();
