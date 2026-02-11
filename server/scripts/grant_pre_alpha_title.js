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

async function grantTitle() {
    console.log('--- Granting "Pré-alpha player" Title to all characters ---');

    // 1. Fetch all characters
    const { data: characters, error: fetchError } = await supabase
        .from('characters')
        .select('id, info');

    if (fetchError) {
        console.error('Error fetching characters:', fetchError);
        return;
    }

    console.log(`Found ${characters.length} characters.`);

    let updatedCount = 0;
    const TITLE = 'Pré-alpha player';

    for (const char of characters) {
        const info = char.info || {};
        let unlockedTitles = info.unlockedTitles || [];

        // Skip if already has the title
        if (unlockedTitles.includes(TITLE)) {
            console.log(`Skipping character ${char.id} - already has title.`);
            continue;
        }

        // Add the title
        unlockedTitles.push(TITLE);

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
            console.log(`Updated character ${char.id} with title "${TITLE}".`);
            updatedCount++;
        }
    }

    console.log(`--- Done! Updated ${updatedCount} characters. ---`);
}

grantTitle();
