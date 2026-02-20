
const ITEM_LOOKUP = {
    'FOOD_T4': { id: 'FOOD_T4', heal: 460, healPercent: 0 }
};

class MockInventoryManager {
    calculateStats(char) {
        return {
            hp: 3150,
            defense: 500,
            foodSaver: 25, // 25% save chance
            maxHP: 3150
        };
    }
}

class MockGameManager {
    constructor() {
        this.inventoryManager = new MockInventoryManager();
        this._stateChanged = false;
    }

    processFood(char, nowOverride = null) {
        if (!char.state.equipment || !char.state.equipment.food) return { used: false, amount: 0 };
        const food = char.state.equipment.food;

        const freshDef = ITEM_LOOKUP[food.id || food.item_id];
        if (!freshDef) return { used: false, amount: 0 };

        const inCombat = !!char.state.combat;
        const stats = this.inventoryManager.calculateStats(char, nowOverride);
        const maxHp = stats.maxHP;
        let currentHp = inCombat ? (char.state.combat.playerHealth || 0) : (char.state.health || 0);

        const COOLDOWN_MS = 5000;
        const lastFoodAt = char.state.lastFoodAt || 0;
        const now = nowOverride || Date.now();

        if (now - lastFoodAt < COOLDOWN_MS) return { used: false };
        if (currentHp >= maxHp) return { used: false };

        let unitHeal = freshDef.heal || 100;
        const missing = maxHp - currentHp;
        const hpPercent = (currentHp / maxHp) * 100;

        if (food.amount > 0 && (missing >= unitHeal || hpPercent < 40)) {
            const actualHeal = Math.min(unitHeal, missing);
            currentHp += actualHeal;

            const foodSaver = stats.foodSaver || 0;
            let savedCount = 0;
            // Force save for testing if we want, but here we just use the real probability
            const savedFood = foodSaver > 0 && Math.random() * 100 < foodSaver;

            if (!savedFood) {
                char.state.equipment.food.amount--;
            } else {
                savedCount++;
            }

            char.state.health = currentHp;
            char.state.lastFoodAt = now;

            if (inCombat) {
                const combat = char.state.combat;
                combat.playerHealth = currentHp;
                combat.foodConsumed = (combat.foodConsumed || 0) + 1;
                combat.savedFoodCount = (combat.savedFoodCount || 0) + savedCount;
                char._stateChanged = true;
            }

            return { used: true, eaten: 1, savedCount: savedCount };
        }
        return { used: false };
    }
}

const gm = new MockGameManager();
const char = {
    state: {
        health: 2000,
        equipment: {
            food: { id: 'FOOD_T4', amount: 100 }
        },
        combat: {
            playerHealth: 2000,
            foodConsumed: 0,
            savedFoodCount: 0
        },
        lastFoodAt: 0
    }
};

console.log("--- TEST 1: First Eat (Combat) ---");
let now = Date.now();
let res = gm.processFood(char, now);
console.log("Result:", res);
console.log("Stats: Consumed:", char.state.combat.foodConsumed, "Saved:", char.state.combat.savedFoodCount);

console.log("\n--- TEST 2: Cooldown Block ---");
res = gm.processFood(char, now + 1000);
console.log("Result (expected fail):", res.used);

console.log("\n--- TEST 3: Second Eat (after 5s) ---");
now += 5100;
res = gm.processFood(char, now);
console.log("Result:", res);
console.log("Stats: Consumed:", char.state.combat.foodConsumed, "Saved:", char.state.combat.savedFoodCount);

console.log("\n--- TEST 4: No Waste Rule (HP High) ---");
char.state.combat.playerHealth = 3100; // Missing only 50
char.state.health = 3100;
now += 6000;
res = gm.processFood(char, now);
console.log("Result (expected fail - fits only 50/460):", res.used);
console.log("Stats remains the same:", char.state.combat.foodConsumed);

console.log("\n--- TEST 5: Emergency Heal (HP < 40%) ---");
char.state.combat.playerHealth = 500; // Missing 2650, but fits is not the issue here
// Even if heal fits, we test the override. 
// But if heal fits 460 into 2650, it would eat anyway.
// Let's test where it DOESN'T fit perfectly but HP is low.
// Actually if HP is low, it SHOULD eat even if heal is HUGE (which it usually is).
console.log("HP: 500 (15%). Missing 2650. UnitHeal 460.");
res = gm.processFood(char, now);
console.log("Result (expected success):", res.used);
console.log("Final Consumed:", char.state.combat.foodConsumed);
