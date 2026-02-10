
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function surgicalInspect() {
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*');

    if (error) { console.error(error); return; }

    console.log(`Checking ${chars.length} characters.`);

    for (const char of chars) {
        if (!char.state) continue;
        const keys = Object.keys(char.state);

        // Check for 'state' key
        if (keys.includes('state')) {
            console.log(`[FOUND] Char ${char.name} (${char.id}) has a 'state' key!`);
            console.log(`Type of inner state: ${typeof char.state.state}`);
            console.log(`Inner keys: ${char.state.state ? Object.keys(char.state.state) : 'null'}`);
        }
    }
}

surgicalInspect();
