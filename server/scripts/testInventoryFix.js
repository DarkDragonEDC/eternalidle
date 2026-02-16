import { GameManager } from './GameManager.js';
import { InventoryManager } from './managers/InventoryManager.js';

async function testInventoryFix() {
    console.log('--- Testing Inventory Loss Fix ---');
    const gm = new GameManager();
    const im = new InventoryManager(gm);

    // Mock Character
    const char = {
        id: 'test-char',
        state: {
            inventory: {},
            equipment: {
                mainHand: { id: 'T1_BOW', name: 'T1 Bow', type: 'WEAPON' },
                helmet: { id: 'T2_LEATHER_HELMET', name: 'T2 Leather Helmet', type: 'HELMET' }
            },
            skills: {
                HUNTER_PROFICIENCY: { level: 10 },
                WARRIOR_PROFICIENCY: { level: 10 },
                MAGE_PROFICIENCY: { level: 10 }
            }
        }
    };

    // 1. Fill Inventory
    const maxSlots = im.getMaxSlots(char);
    console.log(`Max Slots: ${maxSlots}`);
    for (let i = 0; i < maxSlots; i++) {
        char.state.inventory[`ITEM_${i}`] = 1;
    }
    console.log(`Used Slots: ${im.getUsedSlots(char)}`);

    // 2. Try to unequip helmet
    try {
        console.log('Attempting to unequip T2_LEATHER_HELMET...');
        im.unequipItem = async (uid, cid, slot) => {
            const item = char.state.equipment[slot];
            const returnId = item.id;
            if (!im.canAddItem(char, returnId)) {
                throw new Error("Inventory Full! Cannot unequip item.");
            }
            im.addItemToInventory(char, returnId, 1);
            delete char.state.equipment[slot];
            return { success: true };
        };
        await im.unequipItem('u', 'c', 'helmet');
        console.log('ERROR: Unequip succeeded despite full inventory!');
    } catch (e) {
        console.log(`SUCCESS: Caught expected error: ${e.message}`);
    }

    // 3. Try to switch weapon (Bow -> Sword)
    // T1_BOW requires Hunter gear. T1_SWORD requires Warrior gear.
    // Leather gear should be incompatible.

    // Patch resolveItem/getRequiredProficiencyGroup for test
    const oldResolve = im.resolveItem;
    im.resolveItem = (id) => {
        if (id === 'T1_SWORD') return { id: 'T1_SWORD', type: 'WEAPON', tier: 1 };
        if (id === 'T1_BOW') return { id: 'T1_BOW', type: 'WEAPON', tier: 1 };
        if (id === 'T2_LEATHER_HELMET') return { id: 'T2_LEATHER_HELMET', type: 'HELMET', tier: 2 };
        return { id, type: 'OTHER', tier: 1 };
    };

    // Mocking shared-utils logic roughly
    global.getRequiredProficiencyGroup = (id) => {
        if (id.includes('BOW')) return 'hunter';
        if (id.includes('SWORD')) return 'warrior';
        if (id.includes('LEATHER')) return 'hunter';
        return null;
    };
    global.getLevelRequirement = () => 1;

    // Simulate equipItem logic part
    console.log('Attempting to equip T1_SWORD (should trigger incompatible unequip check)...');
    try {
        // Reuse logic from InventoryManager.js (roughly)
        const itemsToUnequip = [{ slot: 'helmet', id: 'T2_LEATHER_HELMET' }];
        let newSlotsNeeded = 0;
        itemsToUnequip.forEach(item => {
            if (!char.state.inventory[item.id]) newSlotsNeeded++;
        });

        if (im.getUsedSlots(char) + newSlotsNeeded > maxSlots) {
            throw new Error(`Not enough inventory space to unequip incompatible gear (${itemsToUnequip.length} items)!`);
        }
        console.log('ERROR: Weapon switch succeeded despite full inventory!');
    } catch (e) {
        console.log(`SUCCESS: Caught expected error: ${e.message}`);
    }

    console.log('--- Test Complete ---');
}

testInventoryFix();
