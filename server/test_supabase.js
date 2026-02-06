import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    console.log('Testing connection to:', process.env.SUPABASE_URL);
    const { data, error } = await supabase.from('characters').select('id').limit(1);
    if (error) {
        console.error('Error selecting from characters:', error);
    } else {
        console.log('Successfully selected from characters. Found:', data.length);
    }
}

test();
