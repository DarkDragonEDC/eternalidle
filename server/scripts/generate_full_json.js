import { ITEMS } from '../../shared/items.js';
import fs from 'fs';

const ITEM_LOOKUP = {};
const flattenItems = (obj) => {
    for (const key in obj) {
        if (obj[key] && obj[key].id) {
            ITEM_LOOKUP[obj[key].id] = obj[key];
        } else if (typeof obj[key] === 'object') {
            flattenItems(obj[key]);
        }
    }
};

flattenItems(ITEMS);
const inventory = {};
Object.keys(ITEM_LOOKUP).forEach(id => {
    inventory[id] = 1;
});

const fullState = {
    inventory: inventory,
    stats: {
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100
    },
    skills: {},
    equipment: {},
    position: { x: 0, y: 0 }
};

fs.writeFileSync('full_admin_state.json', JSON.stringify(fullState, null, 2));
console.log("Generated full_admin_state.json with " + Object.keys(inventory).length + " items.");
