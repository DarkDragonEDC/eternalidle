
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path to .env based on script location (root of project)
dotenv.config({ path: path.join(__dirname, 'server/.env') });

// Fallback if running from server/scripts or similar (try both)
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '.env') });
}

console.log("Connecting to Supabase...");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const TARGET_ITEM = 'T10_WORLDBOSS_CHEST_MASTERPIECE';
const TARGET_QTY = 9999999;
const TARGET_CHAR_NAME = 'ironmn'; // Based on previous logs

async function giveItem() {
    console.log(`Looking for character: ${TARGET_CHAR_NAME}...`);

    // Fetch character
    const { data: characters, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .ilike('name', TARGET_CHAR_NAME);

    if (fetchError) {
        console.error("Error fetching character:", fetchError);
        return;
    }

    if (!characters || characters.length === 0) {
        console.error(`Character '${TARGET_CHAR_NAME}' not found.`);
        return;
    }

    const char = characters[0];
    console.log(`Found character: ${char.name} (ID: ${char.id})`);

    let inventory = char.state.inventory || {};

    // Add items
    const currentQty = inventory[TARGET_ITEM] || 0;
    // Handle object vs number storage
    const currentAmount = typeof currentQty === 'object' ? currentQty.amount : Number(currentQty);

    // Set to fixed high amount or add? User asked for 9999999. Let's set it or add it.
    // "add... to my inventory".
    inventory[TARGET_ITEM] = TARGET_QTY;

    console.log(`Setting ${TARGET_ITEM} to ${TARGET_QTY}...`);

    const newState = {
        ...char.state,
        inventory: inventory
    };

    const { error: updateError } = await supabase
        .from('characters')
        .update({ state: newState })
        .eq('id', char.id);

    if (updateError) {
        console.error("Failed to update character:", updateError);
    } else {
        console.log("Successfully updated inventory!");
    }
}

giveItem();
