import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    const { data, error } = await supabase.from('characters').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("KEYS:", Object.keys(data[0]));
    } else {
        console.log("No chars");
    }
}
test();
