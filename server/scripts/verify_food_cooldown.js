const { GameManager } = require('../GameManager');

async function testFoodCooldown() {
    const mockGameManager = {
        inventoryManager: {
            resolveItem: (id) => ({ id, healPercent: 20 }), // Heals 20%
            calculateStats: () => ({ maxHP: 1000, foodSaver: 0 })
        }
    };

    const gm = new GameManager(null);
    gm.inventoryManager = mockGameManager.inventoryManager;

    const char = {
        name: 'TestChar',
        state: {
            health: 500,
            lastFoodAt: 0,
            equipment: {
                food: { id: 'T4_FOOD', amount: 10 }
            }
        }
    };

    console.log('--- TEST 1: Initial Eat ---');
    let result = gm.processFood(char, 10000);
    console.log(`Eat at 10s: used=${result.used}, healed=${result.amount}, remaining=${char.state.equipment.food?.amount}`);
    console.log(`Last Food At: ${char.state.lastFoodAt}`);

    console.log('\n--- TEST 2: Rapid Eat (2s later) ---');
    result = gm.processFood(char, 12000);
    console.log(`Eat at 12s: used=${result.used} (Expected: false)`);

    console.log('\n--- TEST 3: Wait for CD (6s later) ---');
    result = gm.processFood(char, 16000);
    console.log(`Eat at 16s: used=${result.used} (Expected: true), remaining=${char.state.equipment.food?.amount}`);

    console.log('\n--- TEST 4: No Waste Rule (HP too high) ---');
    char.state.health = 950; // Max 1000, 20% heal is 200. 950+200 > 1000.
    result = gm.processFood(char, 22000);
    console.log(`Eat at 22s (HP 950/1000): used=${result.used} (Expected: false)`);

    console.log('\n--- TEST 5: Dangerous HP (< 40%) Overrides No Waste ---');
    char.state.health = 300; // 30% HP
    result = gm.processFood(char, 28000);
    console.log(`Eat at 28s (HP 300/1000): used=${result.used} (Expected: true), health=${char.state.health}`);
}

testFoodCooldown();
