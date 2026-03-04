
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    let output = '';
    const { data: counts, error } = await supabase.rpc('get_combat_history_counts_per_char');

    if (error) {
        output += 'RPC failed, trying raw query...\n';
        const { data, error: queryError } = await supabase
            .from('combat_history')
            .select('character_id');

        if (queryError) {
            output += `Query Error: ${queryError.message}\n`;
            fs.writeFileSync('history_report.txt', output);
            return;
        }

        const aggregation = {};
        data.forEach(row => {
            aggregation[row.character_id] = (aggregation[row.character_id] || 0) + 1;
        });

        const sorted = Object.entries(aggregation).sort((a, b) => b[1] - a[1]);
        output += 'Top 40 characters by history count:\n';
        for (let i = 0; i < Math.min(40, sorted.length); i++) {
            const [id, count] = sorted[i];
            const { data: char } = await supabase.from('characters').select('name').eq('id', id).single();
            output += `Char: ${char ? char.name : 'UNKNOWN'} (${id}) - Count: ${count}\n`;
        }
    } else {
        output += `Top characters by history count (RPC):\n${JSON.stringify(counts, null, 2)}\n`;
    }

    fs.writeFileSync('history_report.txt', output);
    console.log('Report saved to history_report.txt');
}

check();
