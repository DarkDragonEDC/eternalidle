
import fs from 'fs';
import path from 'path';

const csvPath = 'hunter_items_fixed.csv';
const outputPath = '../shared/hunter_stats_fixed.js'; // Temporary output

console.log('Reading CSV...');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.trim().split('\n');
const headers = lines[0].split(',');

// Start building the JS object string
let jsContent = `export const HUNTER_STATS_FIXED = {\n`;

// Group by ItemID -> Tier -> Quality
const dataMap = {};

// Skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values (e.g. "23,4")
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

    // ItemID,Tier,QualityName,Damage,Defense,HP,Speed,AttackSpeed
    const itemID = parts[0];
    const tier = parseInt(parts[1]);
    const qualityName = parts[2]; // Not used for key, but for verification maybe

    // Map quality name to ID (0-4)
    let qualityId = 0;
    switch (qualityName.trim()) {
        case 'Normal': qualityId = 0; break;
        case 'Good': qualityId = 1; break;
        case 'Outstanding': qualityId = 2; break;
        case 'Excellent': qualityId = 3; break;
        case 'Masterpiece': qualityId = 4; break;
    }

    const damage = parseFloat(parts[3].replace(',', '.'));
    const defense = parseFloat(parts[4].replace(',', '.'));
    const hp = parseFloat(parts[5].replace(',', '.'));
    const speed = parseFloat(parts[6].replace(',', '.'));
    // const attackSpeed = parseFloat(parts[7].replace(',', '.')); 
    // Ignoring AttackSpeed as discussed, using Speed as the main stat for cooldown/speed

    // Extract Base ID (remove T{Tier}_)
    // Actually, distinct items might share structure. 
    // MAGE_STATS_FIXED used "Fire Staff" key. 
    // Here user provided T1_BOW. 
    // Let's use the exact ID from user CSV as key if possible, OR map it to the "lookupName".
    // "T1_BOW" -> lookupName "Bow"? 
    // In items.js, T1_BOW has lookupName "Bow". T2_BOW has lookupName "Bow".
    // So we should group by lookupName.

    let lookupName = '';
    if (itemID.includes('_BOW')) lookupName = 'Bow';
    else if (itemID.includes('_TORCH')) lookupName = 'Torch';
    else if (itemID.includes('_LEATHER_ARMOR')) lookupName = 'Leather Armor';
    else if (itemID.includes('_LEATHER_HELMET')) lookupName = 'Leather Helmet';
    else if (itemID.includes('_LEATHER_BOOTS')) lookupName = 'Leather Boots';
    else if (itemID.includes('_LEATHER_GLOVES')) lookupName = 'Leather Gloves';
    else if (itemID.includes('_LEATHER_CAPE')) lookupName = 'Leather Cape';

    if (!dataMap[lookupName]) dataMap[lookupName] = {};
    if (!dataMap[lookupName][tier]) dataMap[lookupName][tier] = {};

    dataMap[lookupName][tier][qualityId] = {
        damage,
        defense,
        hp,
        speed
    };
}

// Convert dataMap to string
for (const [name, tiers] of Object.entries(dataMap)) {
    jsContent += `    "${name}": {\n`;
    for (const [tier, qualities] of Object.entries(tiers)) {
        jsContent += `        "${tier}": {\n`;
        for (const [q, stats] of Object.entries(qualities)) {
            // Only include non-zero stats to save space? Or explicit 0?
            // User provided explicit 0s.
            const statEntries = [];
            if (stats.damage > 0) statEntries.push(`"damage": ${stats.damage}`);
            if (stats.defense > 0) statEntries.push(`"defense": ${stats.defense}`);
            if (stats.hp > 0) statEntries.push(`"hp": ${stats.hp}`);
            if (stats.speed > 0) statEntries.push(`"speed": ${stats.speed}`);

            // Add efficiency placeholder (calculated elsewhere or omitted for fixed stats?)
            // Mage stats had efficiency. User CSV doesn't have efficiency.
            // We'll omit it for now, assuming `resolveItem` handles efficiency if missing or we dont need it.
            // Actually, for gathering tools efficiency is key. For Weapons/Armor, maybe not used?
            // Hunter items are weapons/armor.

            jsContent += `            "${q}": { ${statEntries.join(', ')} }${q == 4 ? '' : ','}\n`;
        }
        jsContent += `        }${tier == 10 ? '' : ','}\n`;
    }
    jsContent += `    },\n`;
}

jsContent += `};\n`;

fs.writeFileSync(outputPath, jsContent);
console.log('Generated HUNTER_STATS_FIXED in ' + outputPath);
