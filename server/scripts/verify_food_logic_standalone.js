function processFoodMock(char, nowOverride = null, maxHp = 1000, unitHeal = 200, foodSaver = 0) {
    let food = char.state.equipment.food;
    const inCombat = !!char.state.combat;
    let currentHp = inCombat ? (char.state.combat.playerHealth || 0) : (char.state.health || 0);
    let eatenCount = 0;
    let totalHealed = 0;
    let savedCount = 0;

    const COOLDOWN_MS = 5000;
    const lastFoodAt = char.state.lastFoodAt || 0;
    const now = nowOverride || Date.now();

    if (now - lastFoodAt < COOLDOWN_MS) return { used: false, amount: 0 };

    const missing = maxHp - currentHp;
    const hpPercent = (currentHp / maxHp) * 100;

    if (food.amount > 0 && (missing >= unitHeal || hpPercent < 40)) {
        const actualHeal = Math.min(unitHeal, missing);
        if (actualHeal <= 0 && hpPercent >= 40) return { used: false, amount: 0 };

        currentHp = currentHp + actualHeal;
        const savedFood = foodSaver > 0 && Math.random() * 100 < foodSaver;
        if (!savedFood) {
            char.state.equipment.food.amount--;
            food.amount--;
        } else {
            savedCount++;
        }

        eatenCount = 1;
        totalHealed = actualHeal;
        char.state.lastFoodAt = now;

        char.state.health = currentHp;
        if (inCombat) {
            char.state.combat.playerHealth = currentHp;
        }
    }

    return { used: eatenCount > 0, amount: totalHealed, eaten: eatenCount, savedCount };
}

const char = {
    state: {
        health: 500,
        lastFoodAt: 0,
        equipment: {
            food: { id: 'T4_FOOD', amount: 10 }
        }
    }
};

console.log('--- STANDALONE TEST 1: Initial Eat ---');
let res = processFoodMock(char, 10000);
console.log(`Eat at 10s: used=${res.used}, healed=${res.amount}, remaining=${char.state.equipment.food.amount}, hp=${char.state.health}`);
console.log(`Last Food At: ${char.state.lastFoodAt}`);

console.log('\n--- STANDALONE TEST 2: Rapid Eat (2s later) ---');
res = processFoodMock(char, 12000);
console.log(`Eat at 12s: used=${res.used} (Expected: false)`);

console.log('\n--- STANDALONE TEST 3: Wait for CD (6s later) ---');
res = processFoodMock(char, 16000);
console.log(`Eat at 16s: used=${res.used} (Expected: true), remaining=${char.state.equipment.food.amount}, hp=${char.state.health}`);

console.log('\n--- STANDALONE TEST 4: No Waste Rule (HP too high) ---');
char.state.health = 950;
res = processFoodMock(char, 22000);
console.log(`Eat at 22s (HP 950/1000, heal 200): used=${res.used} (Expected: false)`);

console.log('\n--- STANDALONE TEST 5: Dangerous HP (< 40%) Overrides No Waste ---');
char.state.health = 300;
res = processFoodMock(char, 28000);
console.log(`Eat at 28s (HP 300/1000): used=${res.used} (Expected: true), health=${char.state.health}`);
