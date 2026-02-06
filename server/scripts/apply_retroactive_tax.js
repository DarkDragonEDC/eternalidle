import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    const amountToAdd = 21185407;
    console.log('Adding retroactive amount:', amountToAdd);

    try {
        const { data: current, error: fetchError } = await supabase
            .from('global_stats')
            .select('*')
            .eq('id', 'global')
            .single();

        if (fetchError) {
            console.error('Fetch Error:', fetchError);
            return;
        }

        const oldTotal = Number(current.total_market_tax) || 0;
        const newTotal = oldTotal + amountToAdd;

        const { error: updateError } = await supabase
            .from('global_stats')
            .update({
                total_market_tax: newTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'global');

        if (updateError) {
            console.error('Update Error:', updateError);
        } else {
            console.log('Success! Old Total:', oldTotal, 'New Total:', newTotal);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

run();
