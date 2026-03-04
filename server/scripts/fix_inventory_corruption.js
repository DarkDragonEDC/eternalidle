// scripts/fix_inventory_corruption.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
// Setup environment
// We are running from the server root, so .env is in current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Server uses SUPABASE_KEY or VITE_SUPABASE_ANON_KEY.
// If SUPABASE_KEY is a service role key (usually starts differently or is longer), it works.
// We'll prioritize SERVICE_ROLE_KEY if present, else fallback to SUPABASE_KEY.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase URL or Service Key in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fixCorruption() {
    console.log("Starting Inventory Corruption Fix...");

    // Fetch all characters
    // Using a loop for pagination if needed, but for now just one big fetch (adjust limit if >1000 users)
    const { data: chars, error } = await supabase
        .from('characters')
        .select('id, name, inventory, state');

    if (error) {
        console.error("Error fetching chars:", error);
        return;
    }

    console.log(`Scanning ${chars.length} characters...`);
    let fixedCount = 0;

    for (const char of chars) {
        let dirty = false;
        let inv = char.inventory || (char.state && char.state.inventory);

        // If inventory is inside state (legacy or current structure depending on migration status)
        // The script needs to robustly handle both or just the canonical source.
        // The codebase seems to use a separate `inventory` column now, but `state.inventory` is also used/synced.

        // Let's check the canonical `inventory` column first.
        if (inv && typeof inv === 'object') {
            for (const key of Object.keys(inv)) {
                const val = inv[key];

                // CHECK 1: Detect "[object Object]1" string
                if (typeof val === 'string' && val.includes('[object Object]')) {
                    console.log(`[FIX] Found corruption in ${char.name} (${char.id}): Item ${key} = "${val}"`);

                    // Attempt to rescue. If it ends in "1", assume quantity 1?
                    // Or if it's a tool, it likely should be an object.
                    // Safest bet for now: convert to basic object with qty 1 if it looks like dynamic item, 
                    // or number 1 if simple item.

                    // Logic: If key implies tool/equipment, make it object. Else number.
                    const isEquip = key.includes('TOOL_') || key.includes('WEAPON') || key.includes('ARMOR');

                    if (isEquip) {
                        inv[key] = { amount: 1 }; // Reset to clean state
                    } else {
                        inv[key] = 1;
                    }
                    dirty = true;
                }

                // CHECK 2: Detect corrupted object with NaN amount effectively
                // (Less likely to be the string issue, but good to check)
            }
        }

        if (dirty) {
            // Update DB
            // We need to update specifically the column where we found it.
            // If `char.inventory` existed, update that column.
            if (char.inventory) {
                const { error: updateError } = await supabase
                    .from('characters')
                    .update({ inventory: inv })
                    .eq('id', char.id);

                if (updateError) console.error(`Failed to update ${char.name}:`, updateError);
                else {
                    console.log(`Saved fix for ${char.name}`);
                    fixedCount++;
                }
            } else if (char.state && char.state.inventory) {
                // Legacy path inside state
                const { error: updateError } = await supabase
                    .from('characters')
                    .update({ state: char.state })
                    .eq('id', char.id);
                if (updateError) console.error(`Failed to update state for ${char.name}:`, updateError);
                else {
                    console.log(`Saved state fix for ${char.name}`);
                    fixedCount++;
                }
            }
        }
    }

    console.log(`Finished. Fixed ${fixedCount} characters.`);
}

fixCorruption();
