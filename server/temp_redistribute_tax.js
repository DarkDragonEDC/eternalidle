import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function redistribute() {
    const { data, error } = await supabase
        .from('global_stats')
        .select('*')
        .eq('id', 'global')
        .single();

    if (error) {
        console.error('Error fetching stats:', error);
        return;
    }

    const total = Number(data.total_market_tax) || 0;
    const marketPart = Math.floor(total * 0.80);
    const tradePart = total - marketPart;

    console.log(`Total: ${total} | New Market: ${marketPart} | New Trade: ${tradePart}`);

    const { error: updateError } = await supabase
        .from('global_stats')
        .update({
            market_tax_total: marketPart,
            trade_tax_total: tradePart,
            updated_at: new Date().toISOString()
        })
        .eq('id', 'global');

    if (updateError) {
        console.error('Error updating stats:', updateError);
    } else {
        console.log('Successfully redistributed tax data.');
    }
}

redistribute();
