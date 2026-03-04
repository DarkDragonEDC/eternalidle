import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching all characters...");
    const { data: chars, error } = await supabase.from('characters').select('id, name, inventory');

    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    const total = chars.length;
    console.log(`Found ${total} characters to update.`);

    let completed = 0;
    let failed = 0;

    // Process in chunks of 50
    const chunkSize = 50;

    for (let i = 0; i < total; i += chunkSize) {
        const chunk = chars.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async (char) => {
            const inv = char.inventory || {};

            // Handled normalized amount vs object structure (if any)
            let currentQty = 0;
            if (typeof inv['NOOB_CHEST'] === 'number') currentQty = inv['NOOB_CHEST'];
            else if (typeof inv['NOOB_CHEST'] === 'object' && inv['NOOB_CHEST'] !== null) currentQty = inv['NOOB_CHEST'].amount || 0;

            // Add 1 NOOB_CHEST
            inv['NOOB_CHEST'] = currentQty + 1;

            const { error: updateError } = await supabase
                .from('characters')
                .update({ inventory: inv })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Failed to update ${char.name}:`, updateError.message);
                failed++;
            }
            completed++;
        }));

        console.log(`Progress: ${completed}/${total} (Failed: ${failed})`);
    }

    console.log("Successfully finished adding NOOB_CHEST to all players.");
}

main();
