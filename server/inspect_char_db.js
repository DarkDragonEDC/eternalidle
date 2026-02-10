
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCharacter() {
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching character:', error);
        return;
    }

    if (!chars || chars.length === 0) {
        console.log('No characters found.');
        return;
    }

    const char = chars[0];
    console.log('--- Character Inspection ---');
    console.log('ID:', char.id);
    console.log('Name:', char.name);
    console.log('State Type:', typeof char.state);

    if (char.state) {
        // console.log('State Dump:', JSON.stringify(char.state).substring(0, 200) + '...');
        console.log('State Keys:', Object.keys(char.state));
        console.log('State.skills:', char.state.skills ? 'Present' : 'Missing');
        console.log('State.silver:', char.state.silver);

        // Check for double nesting (state.state)
        if (char.state.state) {
            console.log('WARNING: Detected double nesting (state.state)!');
            console.log('Inner State Keys:', Object.keys(char.state.state));
        }
    } else {
        console.log('State is null or undefined');
    }
}

inspectCharacter();
