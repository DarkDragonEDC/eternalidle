import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path to reach .env in server root
dotenv.config({ path: path.join(__dirname, '../.env') });

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearAllInventories() {
    console.log("Starting global inventory wipe...");

    // Fetch all characters to update their state locally first (safer for JSONB updates if we were merging, but here we are wiping)
    // Actually, we can just fetch IDs and update, or try to update all.
    // However, updating a JSONB column 'state' requires us to read it, modify it, and write it back 
    // because we don't want to wipe 'skills', 'stats', etc.

    const { data: characters, error: fetchError } = await supabase
        .from('characters')
        .select('id, name, state');

    if (fetchError) {
        console.error("Error fetching characters:", fetchError);
        return;
    }

    console.log(`Found ${characters.length} characters.`);

    let successCount = 0;
    let failCount = 0;

    for (const char of characters) {
        try {
            const newState = {
                ...char.state,
                inventory: {} // WIPE
            };

            const { error: updateError } = await supabase
                .from('characters')
                .update({ state: newState })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Failed to update ${char.name} (${char.id}):`, updateError.message);
                failCount++;
            } else {
                console.log(`Cleared inventory for: ${char.name}`);
                successCount++;
            }
        } catch (err) {
            console.error(`Unexpected error for ${char.name}:`, err);
            failCount++;
        }
    }

    console.log(`\nOperation Complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

clearAllInventories();
