
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpFirstProblemChar() {
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*');

    if (error) { console.error(error); return; }

    console.log(`Scanning ${chars.length} chars...`);

    for (const char of chars) {
        if (char.state && typeof char.state === 'object') {
            const keys = Object.keys(char.state);
            if (keys.includes('state')) {
                console.log(`\n!!! FOUND PROBLEM CHAR: ${char.name} (${char.id}) !!!`);
                console.log('Root State Keys:', keys);
                console.log('--- VALUE OF char.state.state ---');
                console.log(JSON.stringify(char.state.state, null, 2));
                return; // Stop after first match
            }
        }
    }
    console.log('No character with nested state found.');
}

dumpFirstProblemChar();
