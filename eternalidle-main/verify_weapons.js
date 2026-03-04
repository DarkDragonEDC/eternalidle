import { ITEMS } from './shared/items.js';

console.log("--- WEAPON CRAFTING VERIFICATION ---\n");

const tests = [
    { name: 'Sword T1', item: ITEMS.GEAR.WARRIORS_FORGE.SWORD[1] },
    { name: 'Bow T1', item: ITEMS.GEAR.HUNTERS_LODGE.BOW[1] },
    { name: 'Fire Staff T1', item: ITEMS.GEAR.MAGES_TOWER.FIRE_STAFF[1] },
    { name: 'Plate Armor T1', item: ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[1] },
    { name: 'Mage Cape T1', item: ITEMS.GEAR.MAGES_TOWER.CAPE[1] }
];

tests.forEach(t => {
    if (t.item) {
        console.log(`${t.name} Requirements:`, JSON.stringify(t.item.req));
    } else {
        console.log(`${t.name}: NOT FOUND`);
    }
});
