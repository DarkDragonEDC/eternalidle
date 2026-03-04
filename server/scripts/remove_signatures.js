
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ITEM_LOOKUP } from '../../shared/items.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const equippableTypes = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_PICKAXE', 'TOOL_AXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'];

async function cleanCharacters() {
    console.log("--- Cleaning Characters ---");
    let { data: characters, error } = await supabase
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    let updatedCount = 0;

    for (const char of characters) {
        let changed = false;
        const inv = char.state.inventory || {};

        for (const key of Object.keys(inv)) {
            if (key.includes('::')) {
                const [baseId, signature] = key.split('::');
                const itemDef = ITEM_LOOKUP[baseId];

                // If item relies on signature (Equippable), keep it.
                // If item is NOT equippable (Food, Potion, Rune, Resource), remove signature.
                if (itemDef && !equippableTypes.includes(itemDef.type)) {
                    // console.log(`Found invalid signature on ${char.name}: ${key} (Type: ${itemDef.type})`);

                    const amount = (typeof inv[key] === 'object') ? inv[key].amount : inv[key];

                    // Add to base ID
                    if (typeof inv[baseId] === 'object') {
                        inv[baseId].amount += amount;
                    } else {
                        inv[baseId] = (inv[baseId] || 0) + amount;
                    }

                    // Remove signed entry
                    delete inv[key];
                    changed = true;
                }
            }
        }

        if (changed) {
            const { error: updateError } = await supabase
                .from('characters')
                .update({ state: char.state })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Failed to update ${char.name}:`, updateError);
            } else {
                console.log(`Cleaned inventory for ${char.name}`);
                updatedCount++;
            }
        }
    }
    console.log(`Characters Updated: ${updatedCount}`);
}

async function cleanMarket() {
    console.log("--- Cleaning Market Listings ---");
    // Fetch listings with signatures
    const { data: listings, error } = await supabase
        .from('market_listings')
        .select('*')
        .like('item_id', '%::%'); // items with signature

    if (error) {
        console.error("Error fetching market listings:", error);
        return;
    }

    console.log(`Found ${listings.length} signed listings.`);
    let updatedCount = 0;

    for (const listing of listings) {
        const [baseId, signature] = listing.item_id.split('::');
        const itemDef = ITEM_LOOKUP[baseId];

        if (itemDef && !equippableTypes.includes(itemDef.type)) {
            // Invalid signature for this type
            // Update listing to strip signature and remove metadata
            const { error: updateError } = await supabase
                .from('market_listings')
                .update({
                    item_id: baseId,
                    metadata: null // Clear metadata (craftedBy)
                })
                .eq('id', listing.id);

            if (updateError) {
                console.error(`Failed to update listing ${listing.id}:`, updateError);
            } else {
                // console.log(`Cleaned listing ${listing.id} (${listing.item_id} -> ${baseId})`);
                updatedCount++;
            }
        }
    }
    console.log(`Market Listings Cleaned: ${updatedCount}`);
}

async function run() {
    await cleanCharacters();
    await cleanMarket();
    process.exit(0);
}

run();
