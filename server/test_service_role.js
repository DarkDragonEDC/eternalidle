import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

console.log('Testing with URL:', SUPABASE_URL);
console.log('Key length:', SUPABASE_KEY?.length);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log('Attempting to fetch characters (should bypass RLS if SERVICE_ROLE)...');
    const { data, error, count } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Character count:', count);
        console.log('Permissions check passed.');
    }
}

test();
