import fs from 'fs';

const csvPath = 'proficiency_rebalance.csv';
const newDamageValues = [
    "16,5", "17,3", "18,2", "19,1", "20,1", "21,1", "22,1", "23,2", "24,4", "25,6",
    "26,9", "28,3", "29,7", "31,2", "32,7", "34,3", "36,1", "37,9", "39,8", "41,7",
    "43,8", "46,0", "48,3", "50,7", "53,3", "55,9", "58,7", "61,7", "64,8", "68,0",
    "71,4", "75,0", "78,7", "82,7", "86,8", "91,1", "95,7", "100,5", "105,5", "110,8",
    "116,3", "122,1", "128,2", "134,6", "141,4", "148,4", "155,9", "163,7", "171,8", "180,4",
    "189,4", "198,9", "208,9", "219,3", "230,3", "241,8", "253,9", "266,6", "279,9", "293,9",
    "308,6", "324,0", "340,2", "357,2", "375,1", "393,8", "413,5", "434,2", "455,9", "478,7",
    "502,7", "527,8", "554,2", "581,9", "611,0", "641,5", "673,6", "707,3", "742,7", "779,8",
    "818,8", "859,7", "902,7", "947,8", "995,2", "1045,0", "1097,2", "1152,1", "1209,7", "1270,2",
    "1333,7", "1400,4", "1470,4", "1543,9", "1621,1", "1702,2", "1787,3", "1876,6", "1970,5", "2069,0"
];

try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const header = lines[0];
    const newLines = [header];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Level,Warrior_DMG,Warrior_HP,Warrior_DEF,Warrior_SpeedBonus,Hunter_DMG,Hunter_HP,Hunter_DEF,Hunter_SpeedBonus,Mage_DMG,Mage_HP,Mage_DEF,Mage_SpeedBonus
        // Parse CSV line handling quotes
        const parts = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);

        const level = parseInt(parts[0]);
        if (level >= 1 && level <= 100) {
            let newVal = newDamageValues[level - 1];
            // Add quotes if it has a comma
            if (newVal.includes(',')) {
                newVal = `"${newVal}"`;
            }
            parts[9] = newVal; // Mage_DMG is at index 9
        }

        // Reconstruct line with quotes if necessary
        const reconstructedLine = parts.map(p => {
            if (p.includes(',') && !p.startsWith('"')) {
                return `"${p}"`;
            }
            return p;
        }).join(',');
        newLines.push(reconstructedLine);
    }

    fs.writeFileSync(csvPath, newLines.join('\n') + '\n');
    console.log('Successfully updated Mage_DMG in ' + csvPath);

} catch (err) {
    console.error('Error:', err);
}
