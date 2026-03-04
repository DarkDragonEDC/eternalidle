import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('characters')
        .select('name, state, skills, inventory, equipment, info')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach(char => {
        console.log(`Char: ${char.name}`);
        console.log(`- Skills Column: ${char.skills ? Object.keys(char.skills).length : 'NULL'}`);
        console.log(`- Inventory Column: ${char.inventory ? Object.keys(char.inventory).length : 'NULL'}`);
        console.log(`- State Column has skills: ${char.state && char.state.skills ? 'YES' : 'NO'}`);
        console.log('---');
    });
}

check();
