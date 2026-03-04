import fs from 'fs';
import path from 'path';

const runesListPath = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/runes_list.csv';
const consolidatedPath = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/consolidated_runes.csv';

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, ''));
}

function getRarity(stars) {
    const s = parseInt(stars);
    if (s === 1) return 'Common';
    if (s === 2) return 'Rare';
    if (s === 3) return 'Legendary';
    return 'Unknown';
}

const content = fs.readFileSync(runesListPath, 'utf8');
const lines = content.split('\n').filter(line => line.trim() !== '');

const header = parseCSVLine(lines[0]);
// New header: Rune ID, Name, Tier, Stars, Rarity, Activity, Effect Type, Bonus Value (%), Description
const newHeader = [
    header[0], // Rune ID
    header[1], // Name
    header[2], // Tier
    header[3], // Stars
    'Rarity',
    header[4], // Activity
    header[5], // Effect Type
    header[6], // Bonus Value (%)
    header[7]  // Description
];

const processedLines = [newHeader.map(h => `"${h}"`).join(',')];

for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 8) continue;

    const stars = row[3];
    const rarity = getRarity(stars);

    const newRow = [
        row[0], // ID
        row[1], // Name
        row[2], // Tier
        row[3], // Stars
        rarity,
        row[4], // Activity
        row[5], // Type
        row[6], // Bonus
        row[7]  // Desc
    ];

    processedLines.push(newRow.map(val => `"${val.replace(/"/g, '""')}"`).join(','));
}

fs.writeFileSync(consolidatedPath, processedLines.join('\n'), 'utf8');
console.log(`Consolidated ${processedLines.length - 1} runes into ${consolidatedPath}`);
