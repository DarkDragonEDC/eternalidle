import { InventoryManager } from './managers/InventoryManager.js';
import { resolveItem } from '../shared/items.js';

const mockGameManager = {
    markDirty: (id) => console.log('Marked dirty: ' + id),
    inventoryManager: {
        resolveItem: resolveItem
    }
};

const invManager = new InventoryManager(mockGameManager);

const char = {
    id: 'char1',
    state: {
        inventory: {
            'T6_PLANK': 100
        }
    }
};

console.log('--- TEST 1: Common item stacking with trade metadata ---');
console.log('Initial:', char.state.inventory['T6_PLANK']);

// Simulate trade delivery (TradeManager.js:337)
const it = { id: 'T6_PLANK', amount: 50, name: 'T6 Plank' };
invManager.addItemToInventory(char, it.id, it.amount, it);

console.log('After Trade (expected object):', JSON.stringify(char.state.inventory['T6_PLANK']));

const has150 = invManager.hasItems(char, { 'T6_PLANK': 150 });
console.log('hasItems(150):', has150);

invManager.consumeItems(char, { 'T6_PLANK': 50 });
console.log('After consume 50:', JSON.stringify(char.state.inventory['T6_PLANK']));

console.log('\n--- TEST 2: ID collision with signatures ---');
const itSigned = { id: 'T6_PLANK::Creator', amount: 1, name: 'Signed Plank' };
invManager.addItemToInventory(char, itSigned.id, itSigned.amount, itSigned);

console.log('Inventory:', JSON.stringify(char.state.inventory));
console.log('hasItems(101):', invManager.hasItems(char, { 'T6_PLANK': 101 }));

process.exit(0);
