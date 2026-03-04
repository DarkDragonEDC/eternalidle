import { ITEMS, ITEM_LOOKUP, resolveItem } from './shared/items.js';

console.log('Testing item resolution for T1_POTION_DAMAGE...');
const item = resolveItem('T1_POTION_DAMAGE');
if (item) {
    console.log('SUCCESS: Item found!');
    console.log(JSON.stringify(item, null, 2));
} else {
    console.log('FAILURE: Item not found.');
    console.log('Checking ITEM_LOOKUP keys...');
    const keys = Object.keys(ITEM_LOOKUP);
    const damagePotions = keys.filter(k => k.includes('POTION_DAMAGE'));
    console.log('Found damage potion keys:', damagePotions);
}
