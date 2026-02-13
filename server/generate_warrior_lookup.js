
import fs from 'fs';
import path from 'path';

const csvPath = 'warrior_items.csv';
const outputPath = '../shared/warrior_stats_fixed.js';

console.log('Reading CSV...');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.trim().split('\n');
const headers = lines[0].split(',');

// Start building the JS object string
let jsContent = `export const WARRIOR_STATS_FIXED = {\n`;

// Group by ItemID -> Tier -> Quality
const dataMap = {};

// Skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Proper CSV parsing that handles quotes and commas inside quotes
    const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
    const partsMatched = line.match(/(".*?"|[^",]*)(?:,|$)/g) || [];
    const parts = partsMatched.map(p => p.replace(/,$/, '').trim());

    // Use parts directly by index as defined in absolute table
    const parseVal = (str) => {
        if (!str) return 0;
        let s = String(str).trim();
        // Remove quotes if present
        if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
        return parseFloat(s.replace(',', '.')) || 0;
    };

    const itemId = parts[0];
    const qualityName = parts[1];

    // DEFINITIVE Indices: ItemID(0), Quality(1), DMG(2), DEF(3), HP(4), Speed(5), AttackSpeed(6), BlockChance(7)
    const damage = parseVal(parts[2]);
    const defense = parseVal(parts[3]);
    const hp = parseVal(parts[4]);
    const speed = parseVal(parts[5]);
    const attackSpeed = parseVal(parts[6]);
    const blockChance = parseVal(parts[7]);

    // Determine Tier from ItemID (e.g. T1_SWORD -> 1)
    const tierMatch = itemId.match(/^T(\d+)_/);
    const tier = tierMatch ? parseInt(tierMatch[1]) : 1;

    // Determine Quality ID
    const qualityMap = { 'Normal': 0, 'Good': 1, 'Outstanding': 2, 'Excellent': 3, 'Masterpiece': 4 };
    const qualityId = qualityMap[qualityName] !== undefined ? qualityMap[qualityName] : 0;

    // Determine Lookup Name (e.g. T1_SWORD -> Sword)
    // We need to map the ItemID back to the generic name used in items.js generation
    // SWORD, SHIELD, PLATE_ARMOR, PLATE_HELMET, PLATE_BOOTS, PLATE_GLOVES, PLATE_CAPE
    let lookupName = '';
    if (itemId.includes('SWORD')) lookupName = 'Sword';
    else if (itemId.includes('SHIELD')) lookupName = 'Shield';
    else if (itemId.includes('PLATE_ARMOR')) lookupName = 'Plate Armor';
    else if (itemId.includes('PLATE_HELMET')) lookupName = 'Plate Helmet';
    else if (itemId.includes('PLATE_BOOTS')) lookupName = 'Plate Boots';
    else if (itemId.includes('PLATE_GLOVES')) lookupName = 'Plate Gloves';
    else if (itemId.includes('PLATE_CAPE')) lookupName = 'Warrior Cape';

    if (!dataMap[lookupName]) dataMap[lookupName] = {};
    if (!dataMap[lookupName][tier]) dataMap[lookupName][tier] = {};

    const stats = {};
    if (damage > 0) stats.damage = damage;
    if (defense > 0) stats.defense = defense;
    if (hp > 0) stats.hp = hp;
    if (speed > 0) stats.speed = speed;
    if (attackSpeed > 0) stats.attackSpeed = attackSpeed;
    if (blockChance > 0) stats.blockChance = blockChance;

    dataMap[lookupName][tier][qualityId] = stats;
}

// Convert dataMap to JS string
for (const [name, tiers] of Object.entries(dataMap)) {
    jsContent += `    "${name}": {\n`;
    for (const [tier, qualities] of Object.entries(tiers)) {
        jsContent += `        "${tier}": {\n`;
        for (const [qId, stats] of Object.entries(qualities)) {
            jsContent += `            "${qId}": ${JSON.stringify(stats)},\n`;
        }
        // Remove trailing comma
        jsContent = jsContent.slice(0, -2) + '\n';
        jsContent += `        },\n`;
    }
    jsContent = jsContent.slice(0, -2) + '\n';
    jsContent += `    },\n`;
}

jsContent = jsContent.slice(0, -2) + '\n';
jsContent += `};\n`;

fs.writeFileSync(outputPath, jsContent);
console.log(`Generated WARRIOR_STATS_FIXED in ${outputPath}`);
