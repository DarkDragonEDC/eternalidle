import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Fields to migrate from state to info
const FIELDS_TO_MIGRATE = [
    'stats',
    'health',
    'silver',
    'crowns',
    'membership',
    'active_buffs',
    'inventorySlots',
    'extraInventorySlots',
    'unlockedTitles'
];

async function migrateToInfoColumn() {
    console.log("=== Migrating fields from state to info column ===\n");
    console.log("Fields to migrate:", FIELDS_TO_MIGRATE.join(', '), "\n");

    // Fetch all characters
    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, name, state, info');

    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    console.log(`Found ${characters.length} characters to process.\n`);

    let updated = 0;
    let skipped = 0;

    for (const char of characters) {
        const state = char.state || {};
        const info = char.info || {};
        let hasChanges = false;

        // Move fields from state to info
        for (const field of FIELDS_TO_MIGRATE) {
            if (field in state) {
                info[field] = state[field];
                delete state[field];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // Update in database
            const { error: updateError } = await supabase
                .from('characters')
                .update({ state, info })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Error updating ${char.name}:`, updateError);
            } else {
                console.log(`✅ Migrated: ${char.name}`);
                updated++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Migrated: ${updated}`);
    console.log(`Skipped (no changes needed): ${skipped}`);
}

migrateToInfoColumn().catch(console.error);
