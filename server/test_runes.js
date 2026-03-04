const fs = require('fs');

const calculate = (tier, stars, effType = 'ATTACK') => {
    // formula from items.js
    const isCombat = ['ATTACK', 'ATTACK_SPEED', 'SAVE_FOOD', 'BURST'].includes(effType);

    if (!isCombat) {
        const scale = [
            1, 1.66, 2.31, 2.97, 3.62, 4.28, 4.93, 5.59, 6.24, 6.9,
            7.55, 8.21, 8.86, 9.52, 10.17, 10.83, 11.48, 12.14, 12.79, 13.45,
            14.1, 14.76, 15.41, 16.07, 16.72, 17.38, 18.03, 18.69, 19.34, 20
        ];
        const index = (tier - 1) * 3 + (stars - 1);
        return scale[Math.min(scale.length - 1, Math.max(0, index))];
    }

    const starBonusMap = { 1: 1, 2: 3, 3: 5 };
    let bonus = (tier - 1) * 5 + (starBonusMap[stars] || stars);

    if (effType === 'ATTACK' || effType === 'ATTACK_SPEED') {
        const combatBonusMap = {
            1: { 1: 0.5, 2: 1.2, 3: 1.8 },
            2: { 1: 2.5, 2: 3.2, 3: 3.9 },
            3: { 1: 4.5, 2: 5.2, 3: 5.9 },
            4: { 1: 6.6, 2: 7.2, 3: 7.9 },
            5: { 1: 8.6, 2: 9.2, 3: 9.9 },
            6: { 1: 10.6, 2: 11.3, 3: 11.9 },
            7: { 1: 12.6, 2: 13.3, 3: 14.0 },
            8: { 1: 14.6, 2: 15.3, 3: 16.0 },
            9: { 1: 16.6, 2: 17.3, 3: 18.0 },
            10: { 1: 18.7, 2: 19.3, 3: 20.0 }
        };
        const tierData = combatBonusMap[tier] || combatBonusMap[1];
        return tierData[stars] || tierData[1];
    }
    return bonus;
};

let output = "--- Rune Scaling Verification ---\n";
for (let t = 1; t <= 10; t++) {
    output += `T${t}: 1* = ${calculate(t, 1)}%, 2* = ${calculate(t, 2)}%, 3* = ${calculate(t, 3)}%\n`;
}

fs.writeFileSync('output_utf8.txt', output, 'utf8');
console.log("Output written to output_utf8.txt");
