const fs = require('fs');

const calculate = (t, s) => {
    // formula from items.js: (tier - 1) * 5 + starBonus (1, 3, 5)
    const bonus = (t - 1) * 5 + (s === 1 ? 1 : s === 2 ? 3 : 5);
    // ATTACK rune logic: bonus * 0.6
    const raw = bonus * 0.6;
    return Math.max(1, Number(raw.toFixed(1)));
};

let output = "--- Rune Scaling Verification ---\n";
for (let t = 1; t <= 10; t++) {
    output += `T${t}: 1* = ${calculate(t, 1)}%, 2* = ${calculate(t, 2)}%, 3* = ${calculate(t, 3)}%\n`;
}

fs.writeFileSync('output_utf8.txt', output, 'utf8');
console.log("Output written to output_utf8.txt");
