import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkDaily() {
    const { data, error } = await supabase
        .from('daily_rewards')
        .select('*')
        .order('last_spin', { ascending: false })
        .limit(10);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log("Recent spins:");
    data.forEach(d => {
        console.log(`- User: ${d.character_name || d.user_id}, Last Spin: ${d.last_spin}`);
    });
}

checkDaily();
