import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findCharacterActivity() {
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .ilike('name', '%eternoiron%'); // Searching for T3RNO or Eterno items

    const result = {
        success: !error,
        error,
        characters: data || []
    };

    fs.writeFileSync('result.json', JSON.stringify(result, null, 2));
    console.log('Result written to result.json');
}

findCharacterActivity();
