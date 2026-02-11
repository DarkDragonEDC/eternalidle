import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function renameTitle() {
    console.log('--- Cleaning Up & Renaming Titles ---');

    const OLD_TITLE = 'Pré-alpha player';
    const NEW_TITLE = 'Pre-Alpha Player';

    const { data: characters, error: fetchError } = await supabase
        .from('characters')
        .select('id, info');

    if (fetchError) {
        console.error('Error fetching characters:', fetchError);
        return;
    }

    console.log(`Found ${characters.length} characters to check.`);

    let updatedCount = 0;

    for (const char of characters) {
        const info = char.info || {};
        let unlockedTitles = info.unlockedTitles || [];
        const before = JSON.stringify(unlockedTitles);

        // 1. Rename old to new
        unlockedTitles = unlockedTitles.map(t => t === OLD_TITLE ? NEW_TITLE : t);

        // 2. De-duplicate
        unlockedTitles = [...new Set(unlockedTitles)];

        const after = JSON.stringify(unlockedTitles);

        if (before !== after) {
            const newInfo = {
                ...info,
                unlockedTitles
            };

            const { error: updateError } = await supabase
                .from('characters')
                .update({ info: newInfo })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Error updating character ${char.id}:`, updateError);
            } else {
                console.log(`Updated character ${char.id}: Cleaned up titles.`);
                updatedCount++;
            }
        }
    }

    console.log(`--- Done! Updated ${updatedCount} characters. ---`);
    process.exit(0);
}

renameTitle();
