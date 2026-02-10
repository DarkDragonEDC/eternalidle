
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepInspect() {
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!chars.length) {
        console.log('No chars.');
        return;
    }

    const char = chars[0];
    console.log('--- DEEP INSPECT ---');
    console.log(`ID: ${char.id} - Name: ${char.name}`);
    console.log('TYPE OF STATE:', typeof char.state);

    // Check if it's a string (double encoded) or object
    if (typeof char.state === 'string') {
        console.log('STATE IS A STRING! IT MIGHT BE DOUBLE ENCODED.');
    } else {
        console.log('Full State JSON:');
        console.log(JSON.stringify(char.state, null, 2));
    }
}

deepInspect();
