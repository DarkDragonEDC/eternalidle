import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listAll() {
    const { data, error } = await supabase
        .from('characters')
        .select('name, user_id, id')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Top 10 Characters:');
    data.forEach(c => console.log(`- ${c.name} (ID: ${c.id}, User: ${c.user_id})`));

    const { data: devChars } = await supabase
        .from('characters')
        .select('name')
        .ilike('name', '%Dev%');

    console.log('Characters with "Dev" in name:', devChars?.map(c => c.name));
}

listAll();
