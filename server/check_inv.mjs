import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Cliente/Desktop/projetinho/Game/server/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('characters').select('name, state').in('name', ['EternoDev', 'DarkDragon', 'DARKDRAGON']);
    if (error) { console.error(error); return; }

    for (const char of data) {
        if (char && char.state && char.state.inventory) {
            console.log('--- Character found ---', char.name);
            const inv = char.state.inventory;
            const keys = Object.keys(inv).filter(k => k.toLowerCase().includes('map') || k.toLowerCase().includes('t1_'));
            console.log('Map/T1 items in inventory:');
            for (const k of keys) {
                console.log(`'${k}':`, inv[k]);
            }
        }
    }
}
check();
