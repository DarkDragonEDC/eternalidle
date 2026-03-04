import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Fields to migrate from state to separate columns
const FIELDS_TO_MIGRATE = ['combat', 'dungeon'];

async function migrateCombatDungeon() {
    console.log("=== Migrating combat and dungeon from state to separate columns ===\n");

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
        let hasChanges = false;
        const updates = { combat: null, dungeon: null };

        // Extract fields from state
        if (state.combat) {
            updates.combat = state.combat;
            delete state.combat;
            hasChanges = true;
        }

        if (state.dungeon) {
            updates.dungeon = state.dungeon;
            delete state.dungeon;
            hasChanges = true;
        }

        if (hasChanges) {
            // Update in database
            const { error: updateError } = await supabase
                .from('characters')
                .update({
                    state,
                    combat: updates.combat,
                    dungeon: updates.dungeon
                })
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
    console.log(`Skipped (no combat/dungeon data): ${skipped}`);
}

migrateCombatDungeon().catch(console.error);
