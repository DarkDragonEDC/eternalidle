
import fs from 'fs';

const csv = fs.readFileSync('user_mage_data.csv', 'utf8');
const lines = csv.split('\n');

const statsGrid = {};

for (const line of lines) {
    if (line.startsWith('Name') || !line.trim()) continue;

    if (line.includes('Masterpiece Fire Staff') && line.includes('T10')) {
        console.log('RAW LINE:', line);
    }
    const parts = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
            current += char; // Keep quotes for cleanParts to handle
        } else if (char === ',' && !inQuote) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);
    const cleanParts = parts.map(p => {
        let val = p.replace(/"/g, '').trim();
        if (val.includes(',') || (val.includes('.') && val.split('.').pop().length === 3)) {
            val = val.replace(/\./g, '').replace(',', '.');
        }
        return val;
    });

    const fullName = cleanParts[0];
    const tier = parseInt(cleanParts[1].replace('T', ''));
    const rarity = cleanParts[2];

    const qualitiesMap = { 'Normal': 0, 'Good': 1, 'Outstanding': 2, 'Excellent': 3, 'Masterpiece': 4 };
    const qualityId = qualitiesMap[rarity];

    let baseName = fullName;
    for (const qName of Object.keys(qualitiesMap)) {
        if (baseName.startsWith(qName + ' ')) {
            baseName = baseName.replace(qName + ' ', '');
            break;
        }
    }

    if (!statsGrid[baseName]) statsGrid[baseName] = {};
    if (!statsGrid[baseName][tier]) statsGrid[baseName][tier] = {};

    const statObj = {};
    if (cleanParts[4]) statObj.damage = parseFloat(cleanParts[4]);
    if (cleanParts[5]) statObj.hp = parseFloat(cleanParts[5]);
    if (cleanParts[6]) statObj.defense = parseFloat(cleanParts[6]);
    if (cleanParts[7]) statObj.speed = parseFloat(cleanParts[7]);
    if (cleanParts[8]) statObj.critChance = parseFloat(cleanParts[8]);
    if (cleanParts[9]) statObj.efficiency = { GLOBAL: parseFloat(cleanParts[9]) };

    statsGrid[baseName][tier][qualityId] = statObj;
}

fs.writeFileSync('mage_full_data.js', `export const MAGE_STATS_FIXED = ${JSON.stringify(statsGrid, null, 4)};`, 'utf8');
console.log('Generated mage_full_data.js');
