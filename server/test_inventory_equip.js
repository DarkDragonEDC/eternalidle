
import { InventoryManager } from './managers/InventoryManager.js';

// Mock GameManager
const mockGameManager = {
    getCharacter: async (userId, charId) => {
        return {
            id: charId,
            state: {
                inventory: {
                    'T1_FISHING_ROD': 1
                },
                equipment: {},
                skills: {
                    FISHING: { level: 2, xp: 0 },
                    ORE_MINER: { level: 0, xp: 0 } // Set to 0 to force fail if it requires Mining
                }
            },
            userId: userId
        };
    },
    saveState: async () => { }
};

const inventoryManager = new InventoryManager(mockGameManager);

async function testEquip() {
    console.log("Testing Equip of T1_FISHING_ROD...");
    try {
        await inventoryManager.equipItem('user1', 'char1', 'T1_FISHING_ROD');
        console.log("Equip SUCCESS!");
    } catch (e) {
        console.log("Equip FAILED:", e.message);
    }
}

testEquip();
