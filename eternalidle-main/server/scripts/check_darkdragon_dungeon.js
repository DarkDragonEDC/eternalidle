
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const charId = '3ec05682-3886-46fd-9137-f9cb655842b6';
    const { data, error } = await supabase
        .from('dungeon_history')
        .select('*')
        .eq('character_id', charId)
        .order('occurred_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Dungeon History for DarkDragon (${charId}):`, data.length, data);
}

check();
