// This script simulates the EXACT import chain the server uses
import { ITEMS, ITEM_LOOKUP, resolveItem } from '../shared/items.js';

console.log('=== COMPREHENSIVE POTION DIAGNOSTIC ===');
console.log(`ITEM_LOOKUP total entries: ${Object.keys(ITEM_LOOKUP).length}`);

// Check all damage potions T1-T10
for (let t = 1; t <= 10; t++) {
    const id = `T${t}_POTION_DAMAGE`;
    const inLookup = !!ITEM_LOOKUP[id];
    const resolved = resolveItem(id);
    console.log(`  ${id}: LOOKUP=${inLookup}, RESOLVE=${resolved ? resolved.name : 'NULL'}`);
}

// Check if ITEMS.GEAR.ALCHEMY_LAB.DAMAGE exists
console.log('\n--- ITEMS.GEAR.ALCHEMY_LAB structure ---');
if (ITEMS.GEAR.ALCHEMY_LAB) {
    console.log('ALCHEMY_LAB keys:', Object.keys(ITEMS.GEAR.ALCHEMY_LAB));
    if (ITEMS.GEAR.ALCHEMY_LAB.DAMAGE) {
        console.log('DAMAGE tiers:', Object.keys(ITEMS.GEAR.ALCHEMY_LAB.DAMAGE));
        const t1 = ITEMS.GEAR.ALCHEMY_LAB.DAMAGE[1];
        if (t1) {
            console.log('  T1 Damage Potion:', JSON.stringify({ id: t1.id, name: t1.name, type: t1.type, tier: t1.tier }));
        }
    } else {
        console.log('DAMAGE key is MISSING from ALCHEMY_LAB!');
    }
} else {
    console.log('ALCHEMY_LAB is MISSING from ITEMS.GEAR!');
}

// Check if ITEMS.CONSUMABLE.DAMAGE exists
console.log('\n--- ITEMS.CONSUMABLE structure ---');
if (ITEMS.CONSUMABLE) {
    console.log('CONSUMABLE keys:', Object.keys(ITEMS.CONSUMABLE));
    if (ITEMS.CONSUMABLE.DAMAGE) {
        console.log('DAMAGE tiers:', Object.keys(ITEMS.CONSUMABLE.DAMAGE));
    }
}

// List all POTION keys currently in ITEM_LOOKUP
const potionKeys = Object.keys(ITEM_LOOKUP).filter(k => k.includes('POTION'));
console.log(`\n--- All ${potionKeys.length} POTION keys in ITEM_LOOKUP ---`);
potionKeys.forEach(k => console.log(`  ${k}`));

console.log('\n=== END DIAGNOSTIC ===');
