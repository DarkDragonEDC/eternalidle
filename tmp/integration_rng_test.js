
import { ActivityManager } from '../server/managers/ActivityManager.js';
import { ITEM_LOOKUP } from '../shared/items.js';

// Mock GameManager to isolate the ActivityManager logic for testing
class MockGameManager {
    constructor() {
        this.inventoryManager = {
            calculateStats: () => ({ globals: { qualityChance: 0 }, xpBonus: {}, duplication: {} }),
            hasItems: () => true,
            consumeItems: () => {},
            addItemToInventory: (char, itemId, qty, metadata) => {
                this.recordCraft(itemId);
                return true;
            }
        };
        this.results = {};
    }

    addXP() { return false; }
    saveState() {}

    recordCraft(itemId) {
        this.results[itemId] = (this.results[itemId] || 0) + 1;
    }
}

async function runIntegrationTest() {
    const mockGM = new MockGameManager();
    const activityManager = new ActivityManager(mockGM);
    
    const char = { name: 'TestUser', state: { inventory: {} } };
    const item = ITEM_LOOKUP['T6_PLATE_CAPE'];
    
    if (!item) {
        console.error("Item T6_PLATE_CAPE not found!");
        return;
    }

    console.log(`--- RUNNING INTEGRATION TEST: 1000x ${item.name} ---`);
    console.log(`Using exact logic from ActivityManager.processCrafting`);

    for (let i = 0; i < 1000; i++) {
        await activityManager.processCrafting(char, item);
    }

    const total = 1000;
    const summary = {
        'Normal': mockGM.results['T6_PLATE_CAPE'] || 0,
        'Good': mockGM.results['T6_PLATE_CAPE_Q1'] || 0,
        'Outstanding': mockGM.results['T6_PLATE_CAPE_Q2'] || 0,
        'Excellent': mockGM.results['T6_PLATE_CAPE_Q3'] || 0,
        'Masterpiece': mockGM.results['T6_PLATE_CAPE_Q4'] || 0
    };

    console.log("\nResults:");
    for (const [name, count] of Object.entries(summary)) {
        console.log(`${name}: ${count} (${(count/total*100).toFixed(1)}%)`);
    }
}

runIntegrationTest();
