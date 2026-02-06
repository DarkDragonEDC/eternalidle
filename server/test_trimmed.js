import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Ijk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I'.trim();

const supabase = createClient(url, key);

async function test() {
    console.log('Testing hardcoded connection to:', url);
    try {
        const { data, error } = await supabase.from('characters').select('id').limit(1);
        if (error) {
            console.error('API Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('Success! Found:', data.length, 'characters');
        }
    } catch (e) {
        console.error('System Error:', e.message);
    }
}

test();
