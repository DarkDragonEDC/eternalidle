
import fs from 'fs';
import path from 'path';

const csvPath = 'mage_items_fixed.csv';
const outputPath = '../shared/mage_stats_fixed.js';

console.log('Reading CSV...');
try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    // Headers: Name,Tier,IP,DMG,HP,DEF,SPEED,CRIT (8 columns)

    let jsContent = `export const MAGE_STATS_FIXED = {\n`;

    // Group by LookupName -> Tier -> Quality
    const dataMap = {};

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

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

        // Name,Tier,IP,DMG,HP,DEF,SPEED,CRIT
        const nameFull = parts[0];
        const tierStr = parts[1]; // T1
        // const ip = parts[2];
        const dmgStr = parts[3];
        const hpStr = parts[4];
        const defStr = parts[5];
        const speedStr = parts[6];
        const critStr = parts[7];

        if (!nameFull) continue;

        // Parse Tier (remove T)
        const tier = parseInt(tierStr.replace('T', ''));

        // Map Quality and Lookup Name from nameFull
        // Format: "{Rarity} {Item Name}" 
        // Example: "Normal Fire Staff", "Masterpiece Tome"
        let qualityId = 0;
        let rarity = '';
        let lookupName = '';

        if (nameFull.startsWith('Normal')) { qualityId = 0; rarity = 'Normal'; }
        else if (nameFull.startsWith('Good')) { qualityId = 1; rarity = 'Good'; }
        else if (nameFull.startsWith('Outstanding')) { qualityId = 2; rarity = 'Outstanding'; }
        else if (nameFull.startsWith('Excellent')) { qualityId = 3; rarity = 'Excellent'; }
        else if (nameFull.startsWith('Masterpiece')) { qualityId = 4; rarity = 'Masterpiece'; }

        lookupName = nameFull.replace(rarity, '').trim();

        const parseVal = (str) => {
            if (!str) return 0;
            // Remove dots (thousands) and replace comma with dot (decimal)
            let val = str.replace(/\./g, '').replace(',', '.');
            return parseFloat(val);
        };

        const damage = parseVal(dmgStr);
        const hp = parseVal(hpStr);
        const defense = parseVal(defStr);
        const speed = parseVal(speedStr);
        const crit = parseVal(critStr);

        if (!dataMap[lookupName]) dataMap[lookupName] = {};
        if (!dataMap[lookupName][tier]) dataMap[lookupName][tier] = {};

        dataMap[lookupName][tier][qualityId] = {
            damage,
            hp,
            defense,
            speed,
            crit
        };
    }

    // Convert to JS string
    for (const [name, tiers] of Object.entries(dataMap)) {
        jsContent += `    "${name}": {\n`;
        for (const [tier, qualities] of Object.entries(tiers)) {
            jsContent += `        "${tier}": {\n`;
            for (const [q, stats] of Object.entries(qualities)) {
                const parts = [];
                if (stats.damage) parts.push(`"damage": ${stats.damage}`);
                if (stats.hp) parts.push(`"hp": ${stats.hp}`);
                if (stats.defense) parts.push(`"defense": ${stats.defense}`);
                if (stats.speed) parts.push(`"speed": ${stats.speed}`);
                if (stats.crit) parts.push(`"crit": ${stats.crit}`);

                jsContent += `            "${q}": { ${parts.join(', ')} }${q == 4 ? '' : ','}\n`;
            }
            jsContent += `        }${tier == 10 ? '' : ','}\n`;
        }
        jsContent += `    },\n`;
    }

    jsContent += `};\n`;
    fs.writeFileSync(outputPath, jsContent);
    console.log('Successfully generated ' + outputPath);

} catch (err) {
    console.error('Error:', err);
}
