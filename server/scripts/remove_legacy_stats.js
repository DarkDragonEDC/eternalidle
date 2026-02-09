import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function removeLegacyStats() {
    console.log("=== Removing legacy str/agi/int from state.stats ===\n");

    // Fetch all characters
    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    console.log(`Found ${characters.length} characters to process.\n`);

    let updated = 0;
    let skipped = 0;

    for (const char of characters) {
        const state = char.state || {};
        const stats = state.stats || {};

        // Check if legacy fields exist
        if ('str' in stats || 'agi' in stats || 'int' in stats) {
            // Remove legacy fields
            delete stats.str;
            delete stats.agi;
            delete stats.int;

            state.stats = stats;

            // Update in database
            const { error: updateError } = await supabase
                .from('characters')
                .update({ state })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Error updating ${char.name}:`, updateError);
            } else {
                console.log(`✅ Cleaned: ${char.name}`);
                updated++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already clean): ${skipped}`);
}

removeLegacyStats().catch(console.error);
