
const QUALITIES = {
    0: { id: 0, name: 'Normal', suffix: '', chance: 0.699, ipBonus: 0, color: '#fff' },
    1: { id: 1, name: 'Good', suffix: '_Q1', chance: 0.20, ipBonus: 20, color: '#4caf50' },
    2: { id: 2, name: 'Outstanding', suffix: '_Q2', chance: 0.09, ipBonus: 50, color: '#4a90e2' },
    3: { id: 3, name: 'Excellent', suffix: '_Q3', chance: 0.01, ipBonus: 100, color: '#9013fe' },
    4: { id: 4, name: 'Masterpiece', suffix: '_Q4', chance: 0.001, ipBonus: 200, color: '#f5a623' }
};

const BASE_QUALITY_CHANCES = {
    1: { q4: 1.40, q3: 9.80, q2: 14.40, q1: 30.00 },
    10: { q4: 0.05, q3: 0.45, q2: 4.50, q1: 20.00 }
};

function simulateCraft(tier, qualityBonus, iterations = 100000) {
    const results = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    const tierStats = BASE_QUALITY_CHANCES[tier];
    const mult = 1 + (qualityBonus / 100);

    const q4C = tierStats.q4 * mult;
    const q3C = tierStats.q3 * mult;
    const q2C = tierStats.q2 * mult;
    const q1C = tierStats.q1 * mult;

    const t4 = 100 - q4C;
    const t3 = t4 - q3C;
    const t2 = t3 - q2C;
    const t1 = t2 - q1C;

    for (let i = 0; i < iterations; i++) {
        const rand = Math.random() * 100;
        let quality = 0;
        if (rand > t4) quality = 4;
        else if (rand > t3) quality = 3;
        else if (rand > t2) quality = 2;
        else if (rand > t1) quality = 1;
        results[quality]++;
    }

    console.log(`Simulation (Tier ${tier}, Bonus ${qualityBonus}%):`);
    for (let q = 0; q <= 4; q++) {
        console.log(`  Q${q} (${QUALITIES[q].name}): ${(results[q] / iterations * 100).toFixed(2)}%`);
    }
}

console.log("--- CRAFTING QUALITY SIMULATION ---");
simulateCraft(1, 0);
simulateCraft(1, 5); // +5% quality bonus
simulateCraft(10, 0);
simulateCraft(10, 50); // +50% quality bonus

console.log("\n--- LOOT DROP SIMULATION ---");
function simulateDrops(chance, multiplier, iterations = 100000) {
    let hits = 0;
    const finalChance = chance * multiplier;
    for (let i = 0; i < iterations; i++) {
        if (Math.random() < finalChance) hits++;
    }
    console.log(`Drop (Base ${chance*100}%, Mult ${multiplier}x): ${(hits/iterations*100).toFixed(2)}%`);
}

simulateDrops(0.03, 1.0); // 3% map
simulateDrops(0.01, 1.0); // 1% map (planned)
simulateDrops(0.10, 1.0); // 10% wood
simulateDrops(0.03, 1.15); // 3% with 15% drop bonus
