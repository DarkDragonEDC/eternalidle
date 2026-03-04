import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Define the preferred order of fields
const FIELD_ORDER = [
    'crowns',
    'health',
    'silver',
    'cosmetics',
    'membership',
    'active_buffs',
    'stats',
    'combat',
    'dungeon',
];

function reorderState(state) {
    if (!state) return state;

    const ordered = {};

    // First, add fields in the preferred order (if they exist)
    for (const key of FIELD_ORDER) {
        if (key in state) {
            ordered[key] = state[key];
        }
    }

    // Then, add any remaining fields that weren't in the order list
    for (const key of Object.keys(state)) {
        if (!(key in ordered)) {
            ordered[key] = state[key];
        }
    }

    return ordered;
}

async function reorganizeState() {
    console.log("=== Reorganizing state fields order ===\n");

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

    for (const char of characters) {
        const state = char.state || {};
        const reordered = reorderState(state);

        // Update in database
        const { error: updateError } = await supabase
            .from('characters')
            .update({ state: reordered })
            .eq('id', char.id);

        if (updateError) {
            console.error(`Error updating ${char.name}:`, updateError);
        } else {
            console.log(`✅ Reorganized: ${char.name}`);
            updated++;
        }
    }

    console.log(`\n=== Reorganization Complete ===`);
    console.log(`Updated: ${updated}`);
}

reorganizeState().catch(console.error);
