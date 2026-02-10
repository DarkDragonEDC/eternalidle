
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDoubleNesting() {
    console.log('Starting DB Scan for double nesting...');

    // Fetch all characters
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*');

    if (error) {
        console.error('Error fetching characters:', error);
        return;
    }

    console.log(`Found ${chars.length} characters.`);
    let fixedCount = 0;

    for (const char of chars) {
        if (char.state && char.state.state) {
            console.log(`[FIX] Character ${char.name} (${char.id}) has double nesting!`);

            // Extract the inner state
            const innerState = char.state.state;

            // Merge any other top-level keys if necessary (usually there aren't any important ones if it's just a wrapper)
            // But let's be safe.
            const fixedState = { ...innerState };

            // Update the DB
            const { error: updateError } = await supabase
                .from('characters')
                .update({ state: fixedState })
                .eq('id', char.id);

            if (updateError) {
                console.error(`[ERROR] Failed to update ${char.name}:`, updateError);
            } else {
                console.log(`[SUCCESS] Fixed ${char.name}.`);
                fixedCount++;
            }
        }
    }

    console.log(`Scan complete. Fixed ${fixedCount} characters.`);
}

fixDoubleNesting();
