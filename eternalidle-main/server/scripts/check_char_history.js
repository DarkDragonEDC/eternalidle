
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data: chars, error: charsError } = await supabase
        .from('characters')
        .select('id, name, user_id');

    if (charsError) {
        console.error('Error fetching characters:', charsError);
        return;
    }

    console.log('Characters found:', chars.length);
    for (const char of chars) {
        const { count, error } = await supabase
            .from('combat_history')
            .select('*', { count: 'exact', head: true })
            .eq('character_id', char.id);

        console.log(`Char: ${char.name} (${char.id}) - History Count: ${count}`);
    }
}

check();
