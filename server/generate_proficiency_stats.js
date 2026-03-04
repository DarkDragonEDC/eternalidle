
import fs from 'fs';
import path from 'path';

const csvPath = 'proficiency_rebalance.csv';
const outputPath = '../shared/proficiency_stats.js';

console.log('Reading Proficiency CSV...');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.trim().split('\n');
const headers = lines[0].split(',');

// Map column names to internal keys
// Hunter_DMG,Hunter_HP,Warrior_DMG,Warrior_HP,Mage_DMG,Mage_HP
const data = {
    warrior: {},
    hunter: {},
    mage: {}
};

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values like "4,8"
    const parts = [];
    let currentPart = '';
    let inQuotes = false;
    for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            parts.push(currentPart);
            currentPart = '';
        } else {
            currentPart += char;
        }
    }
    parts.push(currentPart);

    const lvl = parseInt(parts[0]);
    if (isNaN(lvl)) continue;

    const parseVal = (str) => parseFloat(String(str).replace(',', '.'));

    // Level(0), Warrior(1,2,3,4), Hunter(5,6,7,8), Mage(9,10,11,12)
    data.warrior[lvl] = {
        dmg: parseVal(parts[1]),
        hp: parseVal(parts[2]),
        def: parseVal(parts[3]),
        speedBonus: parseVal(parts[4])
    };
    data.hunter[lvl] = {
        dmg: parseVal(parts[5]),
        hp: parseVal(parts[6]),
        def: parseVal(parts[7]),
        speedBonus: parseVal(parts[8])
    };
    data.mage[lvl] = {
        dmg: parseVal(parts[9]),
        hp: parseVal(parts[10]),
        def: parseVal(parts[11]),
        speedBonus: parseVal(parts[12])
    };
}

let jsContent = `/**
 * Proficiency Stats Lookup Table
 * Generated on ${new Date().toISOString()}
 */

export const PROFICIENCY_STATS = ${JSON.stringify(data, null, 4)};

/**
 * Helper to get proficiency stats for a given level and class.
 * Ensures we don't crash on levels > 100.
 */
export const getProficiencyStats = (group, level) => {
    const lvl = Math.min(100, Math.max(1, Math.floor(level)));
    const stats = PROFICIENCY_STATS[group] || {};
    return stats[lvl] || { dmg: 0, hp: 0, def: 0, speedBonus: 0 };
};
`;

fs.writeFileSync(outputPath, jsContent);
console.log(`Generated proficiency stats in ${outputPath}`);
