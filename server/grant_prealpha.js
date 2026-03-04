import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function grantPreAlphaTitle() {
    console.log('Starting Pre-Alpha Player title grant migration...');

    // 1. Fetch all characters
    const { data: characters, error: fetchError } = await supabase
        .from('characters')
        .select('id, name, state');

    if (fetchError) {
        console.error('Error fetching characters:', fetchError);
        return;
    }

    console.log(`Found ${characters.length} characters. Processing...`);

    const NEW_TITLE = 'Pre-Alpha Player';
    const OLD_TITLE = 'Pré-alpha player';
    let updatedCount = 0;

    for (const char of characters) {
        let state = char.state || {};
        if (!state.unlockedTitles) state.unlockedTitles = [];

        const before = JSON.stringify(state.unlockedTitles);

        // Migration: Rename old title and add new if missing
        state.unlockedTitles = state.unlockedTitles.map(t => t === OLD_TITLE ? NEW_TITLE : t);
        if (!state.unlockedTitles.includes(NEW_TITLE)) {
            state.unlockedTitles.push(NEW_TITLE);
        }

        // Unique Cleanup
        state.unlockedTitles = [...new Set(state.unlockedTitles)];

        const after = JSON.stringify(state.unlockedTitles);

        if (before !== after) {
            const { error: updateError } = await supabase
                .from('characters')
                .update({ state })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Error updating character ${char.name} (${char.id}):`, updateError);
            } else {
                updatedCount++;
                console.log(`Granted title to: ${char.name}`);
            }
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} characters.`);
}

grantPreAlphaTitle().catch(err => {
    console.error('Migration failed:', err);
});
