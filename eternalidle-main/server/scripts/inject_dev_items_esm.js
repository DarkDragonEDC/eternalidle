import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function injectItems() {
    console.log('Starting item injection for DevIron...');

    const { data: char, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', '<DevIron>')
        .single();

    if (fetchError || !char) {
        console.error('Character DevIron not found:', fetchError);
        return;
    }

    console.log(`Found character: ${char.id}`);

    let inventory = {}; // Start with a clean slate to avoid duplicates
    char.state.extraInventorySlots = 9999;

    const mageSlots = ['FIRE_STAFF', 'TOME', 'CLOTH_ARMOR', 'CLOTH_HELMET', 'CLOTH_BOOTS', 'CLOTH_GLOVES', 'CAPE'];
    const qualities = [0, 1, 2, 3, 4];
    const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (const t of tiers) {
        for (const slot of mageSlots) {
            for (const q of qualities) {
                const baseId = `T${t}_${slot}`;
                const storageKey = q === 0 ? baseId : `${baseId}::Q${q}::DevIron`;
                inventory[storageKey] = {
                    amount: 1,
                    quality: q,
                    craftedBy: 'DevIron'
                };
            }
        }
    }

    // Combat Runes (Confirmed official effects)
    const combatRuneEffects = ['ATTACK', 'SAVE_FOOD', 'BURST', 'ATTACK_SPEED'];
    const stars = [1, 2, 3, 4, 5]; // 1-3 are standard, 4-5 are bonus

    for (const t of tiers) {
        for (const eff of combatRuneEffects) {
            for (const s of stars) {
                const runeId = `T${t}_RUNE_ATTACK_${eff}_${s}STAR`;
                inventory[runeId] = {
                    amount: 1,
                    stars: s
                };
            }
        }
    }

    char.state.inventory = inventory;
    const { error: updateError } = await supabase
        .from('characters')
        .update({ state: char.state })
        .eq('id', char.id);

    if (updateError) {
        console.error('Error updating character:', updateError);
    } else {
        console.log('Successfully injected items and expanded inventory for DevIron!');
    }
}

injectItems();
