
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    console.error('Available keys:', Object.keys(process.env).filter(k => k.startsWith('SUPA')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- ADDING MASTERPIECE ITEM ---');

    // 1. List Characters
    const { data: chars, error } = await supabase
        .from('characters')
        .select('id, name, user_id');

    if (error) {
        console.error('Error fetching chars:', error);
        return;
    }

    if (!chars || chars.length === 0) {
        console.log('No characters found.');
        return;
    }

    console.log('Available Characters:');
    chars.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.name} (ID: ${c.id})`);
    });

    // In a real interactive script we'd compare input, but here we'll try to find "EternalDev" or take the first one if not explicit.
    // Let's look for a character that might be the user's.
    // The user previously mentioned <EternalDev> as signature. Let's assume the character is the one playing.
    // I made the script auto-select if only 1, or try to search.

    // Auto-select logic for the script usage context:
    // We will target the character named "EternalDev" OR "Cliente" OR verify via arguments if we could.
    // For simplicity, I will apply to the FIRST character found or match a specific name if known.
    // I'll stick to listing and asking user to Edit this file OR just applying to a specific ID if he provides.
    // Since I can't prompt interactively easily here, I will fetch the most recently updated char.

    const targetName = '<EternoDev>';
    const { data: activeChar, error: activeError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', targetName)
        .single();

    if (activeError || !activeChar) {
        console.error('Could not determine active character.');
        return;
    }

    console.log(`\nTargeting most recently active character: ${activeChar.name} (${activeChar.id})`);
    console.log('NOTE: Ensure the game server is STOPPED before running this to prevent overwrite!');

    // 2. Prepare Item
    const itemId = 'T5_FIRE_STAFF::<EternoDev>';
    const itemData = {
        amount: 5,
        quality: 4,
        craftedBy: '<EternoDev>',
        craftedAt: '2026-02-10T22:44:00.000Z'
    };

    // 3. Update Inventory
    const currentInv = activeChar.inventory || {};

    // Log previous state
    console.log(`Previous amount: ${currentInv[itemId]?.amount || 0}`);

    // Set new data
    currentInv[itemId] = itemData;

    // 4. Save
    const { error: updateError } = await supabase
        .from('characters')
        .update({ inventory: currentInv })
        .eq('id', activeChar.id);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('SUCCESS! Item added.');
        console.log(`Added 5x T5_FIRE_STAFF::<EternoDev> (Quality: 4) to ${activeChar.name}`);
    }
}

run();
