
import { createClient } from '@supabase/supabase-js';

const URL = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(URL, KEY);

async function diagnose() {
    console.log("Diagnosing Production Ranking...");
    try {
        // 1. Check if columns exist by trying to select them
        const { data: cols, error: colErr } = await supabase.from('characters').select('ranking_total_level, ranking_total_xp, ranking_item_power').limit(1);
        
        if (colErr) {
            console.error("Column check FAILED:", colErr.message);
        } else {
            console.log("Ranking columns EXIST on production.");
            console.log("Sample values:", cols[0]);
        }

        // 2. Count characters with 0/NULL ranking
        const { count: zeroXp, error: zeroErr } = await supabase.from('characters')
            .select('id', { count: 'exact' })
            .eq('ranking_total_xp', 0);
        console.log(`Characters with 0 ranking_total_xp: ${zeroXp}`);

        // 3. Count characters with NULL ranking
        const { count: nullXp, error: nullErr } = await supabase.from('characters')
            .select('id', { count: 'exact' })
            .is('ranking_total_xp', null);
        console.log(`Characters with NULL ranking_total_xp: ${nullXp}`);

        // 4. Sample top players by XP column to see if it's working
        const { data: topPlayers, error: topErr } = await supabase.from('characters')
            .select('name, ranking_total_xp, ranking_total_level, is_admin')
            .order('ranking_total_xp', { ascending: false })
            .limit(10);
        
        console.log("\nTop 10 by ranking_total_xp column:");
        topPlayers?.forEach((p, i) => {
            console.log(`${i+1}. ${p.name} - XP: ${p.ranking_total_xp}, Lvl: ${p.ranking_total_level}, Admin: ${p.is_admin}`);
        });

    } catch (e) {
        console.error("DIAGNOSTIC ERROR:", e);
    }
}

diagnose();
