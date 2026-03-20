import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const attemptId = '20ec52ca-2570-4b81-bb37-3cc9558eb52b';
    const { data: attempt, error: e1 } = await supabase
        .from('world_boss_attempts')
        .select('*, world_boss_sessions(*)')
        .eq('id', attemptId)
        .single();
    
    if (e1) {
        console.error('Error fetching attempt:', e1);
        return;
    }

    console.log('Attempt Data:');
    console.log(JSON.stringify(attempt, null, 2));
}

check();
