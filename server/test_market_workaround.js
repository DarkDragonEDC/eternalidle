import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testMarketWorkaround() {
    console.log("Testing Market Workaround...");

    // 1. Try to list an item (simulating the insert)
    console.log("Step 1: Attempting to insert a test listing (ignoring seller_character_id column)...");
    const { data: insertData, error: insertError } = await supabase
        .from('market_listings')
        .insert({
            seller_id: 'fb85064e-3655-401a-8d18-396a972c68f0', // Notch's user_id
            seller_name: 'Notch',
            item_id: 'T1_WOOD',
            item_data: {
                id: 'T1_WOOD',
                name: 'Wood',
                tier: 1,
                seller_character_id: '710b1716-babd-4cb0-b4a6-cd563829c3a9' // Notch's character_id
            },
            amount: 1,
            price: 100
        })
        .select();

    if (insertError) {
        console.error("FAILED to insert:", insertError.message);
        return;
    }
    console.log("SUCCESS: Item inserted into market_listings.");

    // 2. Try to retrieve and check the virtual field
    console.log("Step 2: Retrieving listings and checking virtual seller_character_id...");
    const { data: fetchData, error: fetchError } = await supabase
        .from('market_listings')
        .select('*')
        .eq('id', insertData[0].id)
        .single();

    if (fetchError) {
        console.error("FAILED to fetch:", fetchError.message);
    } else {
        const virtualId = fetchData.seller_character_id || fetchData.item_data?.seller_character_id;
        console.log("Retrieved Listing:", JSON.stringify(fetchData, null, 2));
        console.log("Virtual seller_character_id found:", virtualId);

        if (virtualId === '710b1716-babd-4cb0-b4a6-cd563829c3a9') {
            console.log("VERIFICATION PASSED: Workaround is working as expected.");
        } else {
            console.log("VERIFICATION FAILED: Virtual ID does not match.");
        }
    }

    // Cleanup
    console.log("Step 3: Cleaning up test listing...");
    await supabase.from('market_listings').delete().eq('id', insertData[0].id);
    console.log("Cleanup complete.");
}

testMarketWorkaround();
