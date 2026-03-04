
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { count: combatCount, error: combatError } = await supabase
        .from('combat_history')
        .select('*', { count: 'exact', head: true });

    const { count: dungeonCount, error: dungeonError } = await supabase
        .from('dungeon_history')
        .select('*', { count: 'exact', head: true });

    console.log('Combat History Count:', combatCount);
    if (combatError) console.error('Combat Error:', combatError);

    console.log('Dungeon History Count:', dungeonCount);
    if (dungeonError) console.error('Dungeon Error:', dungeonError);

    if (combatCount > 0) {
        const { data: samples } = await supabase.from('combat_history').select('character_id, mob_id, mob_name').limit(5);
        console.log('Sample Combat History:', samples);
    }
}

check();
