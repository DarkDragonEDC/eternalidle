import { InventoryManager } from './managers/InventoryManager.js';
import { resolveItem } from '../shared/items.js';
import { pruneState } from './utils/statePruner.js';

const mockGameManager = {
    markDirty: (id) => {},
    inventoryManager: {
        resolveItem: resolveItem
    },
    addNotification: (char, type, msg) => console.log(`[NOTIFICATION] ${type}: ${msg}`)
};

const invManager = new InventoryManager(mockGameManager);

// MOCK TRADEMANAGER LOGIC (Deliver function)
const deliver = (targetChar, items) => {
    items.forEach(it => {
        const hasMetadata = it.craftedBy || it.quality > 0 || it.stars > 0 || it.enhancement > 0;
        invManager.addItemToInventory(targetChar, it.id, it.amount, hasMetadata ? it : null);
    });
};

const char = {
    id: 'char1',
    state: {
        inventory: {
            'T6_PLANK': 100
        }
    }
};

console.log('--- VERIFICATION 1: Normal Stackable Item ---');
// Simulate trade delivery of a common item
const normalItem = { id: 'T6_PLANK', amount: 50, name: 'Plank' };
deliver(char, [normalItem]);

console.log('Result for T6_PLANK (Expected: Number 150):', char.state.inventory['T6_PLANK']);
if (typeof char.state.inventory['T6_PLANK'] === 'number') {
    console.log('✅ PASS: Common item stayed as a number.');
} else {
    console.error('❌ FAIL: Common item became an object.');
}

console.log('\n--- VERIFICATION 2: Signed Item ---');
const signedItem = { id: 'T6_PLANK::Creator', amount: 1, name: 'Signed Plank', craftedBy: 'Creator', quality: 0, stars: 0, enhancement: 0 };
deliver(char, [signedItem]);

console.log('Result for Signed Item:', JSON.stringify(char.state.inventory['T6_PLANK::Creator']));
if (typeof char.state.inventory['T6_PLANK::Creator'] === 'object' && char.state.inventory['T6_PLANK::Creator'].craftedBy === 'Creator') {
    console.log('✅ PASS: Signed item correctly converted to object with metadata.');
} else {
    console.error('❌ FAIL: Signed item metadata missing or wrong format.');
}

console.log('\n--- VERIFICATION 3: Pruning ---');
const pruned = pruneState(char.state);
console.log('Pruned Signed Item:', JSON.stringify(pruned.inventory['T6_PLANK::Creator']));
if (pruned.inventory['T6_PLANK::Creator'] && pruned.inventory['T6_PLANK::Creator'].craftedBy === 'Creator' && pruned.inventory['T6_PLANK::Creator'].id === 'T6_PLANK::Creator') {
    console.log('✅ PASS: Metadata preserved during pruning.');
} else {
    console.error('❌ FAIL: Metadata stripped during pruning.');
}

process.exit(0);
