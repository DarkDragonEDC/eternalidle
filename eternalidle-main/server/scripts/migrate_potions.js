import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migratePotions() {
    console.log('Starting potion migration (GOLD -> SILVER)...');

    // 1. Migrate Characters
    console.log('Migrating characters...');
    const { data: chars, error: charError } = await supabase.from('characters').select('id, state');
    if (charError) throw charError;

    for (const char of chars) {
        let changed = false;
        const state = char.state;

        if (!state) continue;

        // Inventory migration
        if (state.inventory) {
            for (const itemId in state.inventory) {
                if (itemId.includes('_POTION_GOLD')) {
                    const newId = itemId.replace('_POTION_GOLD', '_POTION_SILVER');
                    const value = state.inventory[itemId];
                    delete state.inventory[itemId];
                    state.inventory[newId] = value;
                    changed = true;
                    console.log(`[Char ${char.id}] Renamed inventory item: ${itemId} -> ${newId}`);
                }
            }
        }

        // Active potions migration
        if (state.active_potions) {
            for (const effect in state.active_potions) {
                const potionId = state.active_potions[effect]?.id;
                if (potionId && potionId.includes('_POTION_GOLD')) {
                    state.active_potions[effect].id = potionId.replace('_POTION_GOLD', '_POTION_SILVER');
                    changed = true;
                    console.log(`[Char ${char.id}] Renamed active potion: ${potionId} -> ${state.active_potions[effect].id}`);
                }
            }
        }

        // Claims migration
        if (state.claims && Array.isArray(state.claims)) {
            state.claims.forEach(claim => {
                if (claim.itemId && claim.itemId.includes('_POTION_GOLD')) {
                    const oldId = claim.itemId;
                    claim.itemId = claim.itemId.replace('_POTION_GOLD', '_POTION_SILVER');
                    if (claim.metadata && claim.metadata.id) {
                        claim.metadata.id = claim.metadata.id.replace('_POTION_GOLD', '_POTION_SILVER');
                    }
                    changed = true;
                    console.log(`[Char ${char.id}] Renamed claim item: ${oldId} -> ${claim.itemId}`);
                }
            });
        }

        if (changed) {
            const { error: updateError } = await supabase.from('characters').update({ state }).eq('id', char.id);
            if (updateError) console.error(`Error updating character ${char.id}:`, updateError);
            else console.log(`[Char ${char.id}] State updated in DB.`);
        }
    }

    // 2. Migrate Market Listings
    console.log('Migrating market listings...');
    const { data: listings, error: listError } = await supabase.from('market_listings').select('id, item_id, item_data');
    if (listError) throw listError;

    for (const listing of listings) {
        let changed = false;
        let newItemId = listing.item_id;
        let newItemData = listing.item_data;

        if (listing.item_id && listing.item_id.includes('_POTION_GOLD')) {
            newItemId = listing.item_id.replace('_POTION_GOLD', '_POTION_SILVER');
            changed = true;
        }

        if (newItemData && newItemData.id && newItemData.id.includes('_POTION_GOLD')) {
            newItemData.id = newItemData.id.replace('_POTION_GOLD', '_POTION_SILVER');
            if (newItemData.name) newItemData.name = newItemData.name.replace('Gold Potion', 'Silver Potion');
            changed = true;
        }

        if (changed) {
            const { error: updateError } = await supabase.from('market_listings').update({
                item_id: newItemId,
                item_data: newItemData
            }).eq('id', listing.id);
            if (updateError) console.error(`Error updating listing ${listing.id}:`, updateError);
            else console.log(`Updated listing ${listing.id}: ${listing.item_id} -> ${newItemId}`);
        }
    }

    // 3. Migrate Market History
    console.log('Migrating market history...');
    const { data: history, error: histError } = await supabase.from('market_history').select('id, item_id, item_data');
    if (histError) throw histError;

    for (const tx of history) {
        let changed = false;
        let newItemId = tx.item_id;
        let newItemData = tx.item_data;

        if (tx.item_id && tx.item_id.includes('_POTION_GOLD')) {
            newItemId = tx.item_id.replace('_POTION_GOLD', '_POTION_SILVER');
            changed = true;
        }

        if (newItemData && newItemData.id && newItemData.id.includes('_POTION_GOLD')) {
            newItemData.id = newItemData.id.replace('_POTION_GOLD', '_POTION_SILVER');
            if (newItemData.name) newItemData.name = newItemData.name.replace('Gold Potion', 'Silver Potion');
            changed = true;
        }

        if (changed) {
            const { error: updateError } = await supabase.from('market_history').update({
                item_id: newItemId,
                item_data: newItemData
            }).eq('id', tx.id);
            if (updateError) console.error(`Error updating history ${tx.id}:`, updateError);
            else console.log(`Updated history ${tx.id}: ${tx.item_id} -> ${newItemId}`);
        }
    }

    console.log('Migration completed.');
}

migratePotions().catch(err => console.error('Migration failed:', err));
