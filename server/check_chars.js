import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('characters').select('*');
    if (error) {
        console.error(error);
        return;
    }

    data.forEach(char => {
        if (char.name.toLowerCase().includes('admin')) {
            console.log('--- CHARACTER START ---');
            console.log(`NAME: ${char.name}`);
            console.log(`COMBAT: ${JSON.stringify(char.state.combat, null, 2)}`);
            console.log('--- CHARACTER END ---');
        }
    });
}

check();
