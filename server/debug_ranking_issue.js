
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRankingData() {
    console.log("Starting diagnostic...");

    try {
        // Total characters
        const { count: total, error: err1 } = await supabase.from('characters').select('id', { count: 'exact' });
        if (err1) throw new Error(`Total count error: ${JSON.stringify(err1)}`);
        console.log(`Total characters: ${total}`);

        // Characters with default ranking values
        const { count: defaulted, error: err2 } = await supabase.from('characters')
            .select('id', { count: 'exact' })
            .eq('ranking_total_level', 1)
            .eq('ranking_total_xp', 0);
        
        if (err2) throw new Error(`Defaulted count error: ${JSON.stringify(err2)}`);
        console.log(`Characters with default ranking (Lvl 1, XP 0): ${defaulted}`);

        // Characters with NULL ranking values
        const { count: nulls, error: err3 } = await supabase.from('characters')
            .select('id', { count: 'exact' })
            .or('ranking_total_level.is.null,ranking_total_xp.is.null');

        if (err3) throw new Error(`Nulls count error: ${JSON.stringify(err3)}`);
        console.log(`Characters with NULL ranking: ${nulls}`);

        // Characters in Normal ranking (according to query logic)
        const { count: normalCount, error: err4 } = await supabase.from('characters')
            .select('id', { count: 'exact' })
            .not('is_admin', 'eq', true);
        
        if (err4) throw new Error(`Normal count error: ${JSON.stringify(err4)}`);
        console.log(`Potential candidates for ranking (Non-admins): ${normalCount}`);

        // Sample 10 characters
        const { data: samples, error: err5 } = await supabase.from('characters')
            .select('name, skills, ranking_total_level, ranking_total_xp')
            .limit(10);

        if (err5) throw new Error(`Samples error: ${JSON.stringify(err5)}`);
        
        console.log("\nSamples:");
        samples.forEach(s => {
            const totalXpInSkills = s.skills ? Object.values(s.skills).reduce((acc, sk) => acc + (sk.totalXp || 0), 0) : 'N/A';
            console.log(`- ${s.name}: ColumnLevel=${s.ranking_total_level}, ColumnXP=${s.ranking_total_xp}, CalculatedXP=${totalXpInSkills}`);
        });

    } catch (e) {
        console.error("DIAGNOSTIC FAILED:", e.message);
    }
}

checkRankingData();
