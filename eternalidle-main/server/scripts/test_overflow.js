
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const charId = '3ec05682-3886-46fd-9137-f9cb655842b6';
    const largeValue = 3000000000; // > 2.1B

    console.log('Trying to insert large value:', largeValue);
    const { error } = await supabase.from('combat_history').insert({
        character_id: charId,
        mob_id: 'TEST_OVERFLOW',
        outcome: 'FLEE',
        xp_gained: largeValue
    });

    if (error) {
        console.error('Insert failed:', error.message, error.details, error.code);
    } else {
        console.log('Insert successful! Table supports large values.');
        // Cleanup
        await supabase.from('combat_history').delete().eq('mob_id', 'TEST_OVERFLOW');
    }
}

check();
