
import fs from 'fs';
import path from 'path';

const csvPath = 'mage_items_fixed.csv';
const outputPath = '../shared/mage_stats_fixed.js';

console.log('Reading CSV...');
try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    // Headers: Name,Tier,Rarity,IP,DMG,HP,DEF,SPEED,CRIT,GLOBAL_EFF

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

        // Name,Tier,Rarity,IP,DMG,HP,DEF,SPEED,CRIT,GLOBAL_EFF
        const nameFull = parts[0];
        const tierStr = parts[1]; // T1
        const rarity = parts[2];
        // const ip = parts[3];
        const dmgStr = parts[4];
        const hpStr = parts[5];
        const defStr = parts[6];
        const speedStr = parts[7];
        const critStr = parts[8];
        const effStr = parts[9];

        // Parse Tier (remove T)
        const tier = parseInt(tierStr.replace('T', ''));

        // Map Quality
        let qualityId = 0;
        switch (rarity.trim()) {
            case 'Normal': qualityId = 0; break;
            case 'Good': qualityId = 1; break;
            case 'Outstanding': qualityId = 2; break;
            case 'Excellent': qualityId = 3; break;
            case 'Masterpiece': qualityId = 4; break;
        }

        const parseVal = (str) => {
            if (!str) return 0;
            // Handle "1.023" as 1023 if it was meant to be thousands separator?
            // Wait, look at the CSV:
            // "Normal Fire Staff,T8,Normal,800,1.023,0,,"143,2",,"
            // "1.023" here likely means 1023 damage.
            // "Normal Fire Staff,T1,Normal,100,185,0,,26,,"
            // 185 is < 1000.
            // But "1.023" in common usage might mean 1 + fraction in US/UK, or 1023 in EU/BR.
            // Given "185" for T1 and "1.023" for T8? T8 should be higher. So 1023 makes sense.
            // Let's assume dot is thousands separator if 3 digits follow?
            // Actually, in previous CSVs, user used comma for decimals: "23,4"
            // So dot is likely thousands separator.
            // Let's remove dots.
            // BUT wait, "1.586" for T9 Masterpiece. Is that 1586?
            // Let's look at T7 Masterpiece: 974.
            // T8 Normal: 1.023. This is definitely 1023.

            // So remove dots, replace comma with dot (for decimal).
            let val = str.replace(/\./g, '').replace(',', '.');
            return parseFloat(val);
        };

        const damage = parseVal(dmgStr);
        const hp = parseVal(hpStr);
        const defense = parseVal(defStr);
        const speed = parseVal(speedStr);
        const crit = parseVal(critStr);
        const eff = parseVal(effStr);

        // Determine Lookup Name
        let lookupName = '';
        if (nameFull.includes('Fire Staff')) lookupName = 'Fire Staff';
        else if (nameFull.includes('Tome')) lookupName = 'Tome';
        else if (nameFull.includes('Cloth Armor')) lookupName = 'Cloth Armor';
        else if (nameFull.includes('Cloth Helmet')) lookupName = 'Cloth Helmet';
        else if (nameFull.includes('Cloth Boots')) lookupName = 'Cloth Boots';
        else if (nameFull.includes('Cloth Gloves')) lookupName = 'Cloth Gloves';
        else if (nameFull.includes('Mage Cape')) lookupName = 'Mage Cape';

        if (!dataMap[lookupName]) dataMap[lookupName] = {};
        if (!dataMap[lookupName][tier]) dataMap[lookupName][tier] = {};

        dataMap[lookupName][tier][qualityId] = {
            damage,
            hp,
            defense,
            speed,
            crit,
            efficiency: eff
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
                if (stats.efficiency) parts.push(`"efficiency": ${stats.efficiency}`);

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
