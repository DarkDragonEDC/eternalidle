
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function list() {
    const { data: chars, error } = await supabase.from('characters').select('id, name, user_id');
    if (error) {
        console.error(error);
        return;
    }
    fs.writeFileSync('all_characters.txt', JSON.stringify(chars, null, 2));
    console.log(`Listed ${chars.length} characters in all_characters.txt`);
}

list();
