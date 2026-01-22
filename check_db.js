import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('characters')
        .select('id, name')
        .eq('name', 'Admin');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result:', data);
    }
}

check();
