import { ITEMS } from './shared/items.js';

console.log("--- TOOL CRAFTING VERIFICATION (HALVED) ---\n");

const tests = [
    { name: 'Pickaxe T1', item: ITEMS.GEAR.TOOLMAKER.PICKAXE[1] },
    { name: 'Pouch T1', item: ITEMS.GEAR.TOOLMAKER.POUCH[1] },
    { name: 'Skinning Knife T1', item: ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[1] },
    { name: 'Sword T1', item: ITEMS.GEAR.WARRIORS_FORGE.MAIN_HAND[1] } // Check other gear too
];

tests.forEach(t => {
    if (t.item) {
        console.log(`${t.name} Requirements:`, JSON.stringify(t.item.req));
    } else {
        console.log(`${t.name}: NOT FOUND`);
    }
});
