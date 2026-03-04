import { ITEM_LOOKUP } from './shared/items.js';

const keys = Object.keys(ITEM_LOOKUP);
const potionKeys = keys.filter(k => k.includes('POTION'));
console.log(`Total items in ITEM_LOOKUP: ${keys.length}`);
console.log(`Total POTION items: ${potionKeys.length}`);
console.log('Potion Keys:', JSON.stringify(potionKeys, null, 2));

const damagePotions = potionKeys.filter(k => k.includes('DAMAGE'));
console.log('Damage Potion Keys:', JSON.stringify(damagePotions, null, 2));

if (ITEM_LOOKUP['T1_POTION_DAMAGE']) {
    console.log('T1_POTION_DAMAGE is PRESENT');
} else {
    console.log('T1_POTION_DAMAGE is MISSING');
}
