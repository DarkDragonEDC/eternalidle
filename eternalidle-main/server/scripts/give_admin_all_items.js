import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ITEMS } from '../../shared/items.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ITEM_LOOKUP = {};
const flattenItems = (obj) => {
    for (const key in obj) {
        if (obj[key] && obj[key].id) {
            ITEM_LOOKUP[obj[key].id] = obj[key];
        } else if (typeof obj[key] === 'object') {
            flattenItems(obj[key]);
        }
    }
};

async function giveAllItems() {
    console.log("Generating full item list...");
    flattenItems(ITEMS);
    const allItemIds = Object.keys(ITEM_LOOKUP);
    console.log(`Found ${allItemIds.length} unique items.`);

    console.log("Looking for ADMIN characters...");

    // Fetch all characters
    const { data: characters, error: fetchError } = await supabase
        .from('characters')
        .select('id, name, state');

    if (fetchError) {
        console.error("Error fetching characters:", fetchError);
        return;
    }

    const adminChars = characters.filter(c => c.name.toLowerCase().includes('admin'));

    if (adminChars.length === 0) {
        console.error("No characters found with 'admin' in their name.");
        return;
    }

    console.log(`Found ${adminChars.length} admin character(s): ${adminChars.map(c => c.name).join(', ')}`);

    for (const char of adminChars) {
        const newInventory = {};
        allItemIds.forEach(id => {
            newInventory[id] = 1;
        });

        console.log(`Setting inventory for ${char.name} with ${Object.keys(newInventory).length} items...`);

        const newState = {
            ...char.state,
            inventory: newInventory
        };

        const { error: updateError } = await supabase
            .from('characters')
            .update({ state: newState })
            .eq('id', char.id);

        if (updateError) {
            console.error(`Failed to update ${char.name}:`, updateError);
        } else {
            console.log(`Successfully updated inventory for ${char.name}`);
        }
    }
}

giveAllItems();
