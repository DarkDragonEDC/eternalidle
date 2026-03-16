
const BASE_QUALITY_CHANCES = {
    6: { q4: 0.65, q3: 4.61, q2: 8.90, q1: 24.44 }
};

const QUALITIES = {
    0: 'Normal',
    1: 'Good',
    2: 'Outstanding',
    3: 'Excellent',
    4: 'Masterpiece'
};

function simulateCrafts(tier, iterations = 100, qualityBonus = 0) {
    const results = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    const tierStats = BASE_QUALITY_CHANCES[tier];
    
    // Logic from server/managers/ActivityManager.js
    const mult = 1 + (qualityBonus / 100);
    const q4C = tierStats.q4 * mult;
    const q3C = tierStats.q3 * mult;
    const q2C = tierStats.q2 * mult;
    const q1C = tierStats.q1 * mult;

    const t4 = 100 - q4C;
    const t3 = t4 - q3C;
    const t2 = t3 - q2C;
    const t1 = t2 - q1C;

    console.log(`--- SIMULATING ${iterations} CRAFTS (Tier ${tier}, Bonus: ${qualityBonus}%) ---`);
    
    for (let i = 0; i < iterations; i++) {
        const rand = Math.random() * 100;
        let quality = 0;
        if (rand > t4) quality = 4;
        else if (rand > t3) quality = 3;
        else if (rand > t2) quality = 2;
        else if (rand > t1) quality = 1;
        results[quality]++;
    }

    for (let q = 0; q <= 4; q++) {
        console.log(`${QUALITIES[q]}: ${results[q]} (${(results[q]/iterations*100).toFixed(1)}%)`);
    }
}

simulateCrafts(6, 1000, 0);
