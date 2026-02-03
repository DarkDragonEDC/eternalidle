
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    console.log("Inspecting DB...");
    const { data, error } = await supabase
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} characters.`);

    for (const char of data) {
        console.log(`--- Character: ${char.name} ---`);
        const inv = char.state?.inventory || {};

        // Check for specific items
        const potion = inv['T10_POTION_XP'];
        const chest = inv['T10_CHEST_MASTERPIECE'];
        const normalChest = inv['T10_CHEST_NORMAL'];

        if (potion || chest || normalChest) {
            console.log(`inventory: {`);
            if (potion) console.log(`  "T10_POTION_XP": ${JSON.stringify(potion)},`);
            if (chest) console.log(`  "T10_CHEST_MASTERPIECE": ${JSON.stringify(chest)},`);
            if (normalChest) console.log(`  "T10_CHEST_NORMAL": ${JSON.stringify(normalChest)},`);
            console.log(`}`);
        } else {
            console.log("(No relevant items found)");
        }
    }
}

inspect();
