const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function injectItems() {
    console.log('Starting item injection for DevIron...');

    // 1. Get Character
    const { data: char, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', 'DevIron')
        .single();

    if (fetchError || !char) {
        console.error('Character DevIron not found:', fetchError);
        return;
    }

    console.log(`Found character: ${char.id}`);

    let inventory = char.state.inventory || {};

    // 2. Set Max Slots (using extraInventorySlots)
    // getMaxSlots: base (30/50) + extraInventorySlots
    char.state.extraInventorySlots = 9999;

    // 3. Generate Mage Gear (T1-T10, Qualities 0-4)
    const mageSlots = ['FIRE_STAFF', 'TOME', 'CLOTH_ARMOR', 'CLOTH_HELMET', 'CLOTH_BOOTS', 'CLOTH_GLOVES', 'CAPE'];
    const qualities = [0, 1, 2, 3, 4];
    const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (const t of tiers) {
        for (const slot of mageSlots) {
            for (const q of qualities) {
                const baseId = `T${t}_${slot}`;
                const storageKey = q === 0 ? baseId : `${baseId}::DevIron`;

                inventory[storageKey] = {
                    amount: 1,
                    quality: q,
                    craftedBy: 'DevIron'
                };
            }
        }
    }

    // 4. Generate All Combat Runes (All Tiers, 1-5 Stars)
    const combatRuneEffects = ['ATTACK', 'HP', 'DEFENSE', 'SPEED', 'BURST', 'ATTACK_SPEED', 'SAVE_FOOD'];
    const stars = [1, 2, 3, 4, 5];

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

    // 5. Update state and Database
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
