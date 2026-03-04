
import fs from 'fs';
import { ITEMS, TIERS, QUALITIES, resolveItem } from '../shared/items.js';

const HUNTER_TYPES = [
    'BOW',
    'TORCH',
    'LEATHER_ARMOR',
    'LEATHER_HELMET',
    'LEATHER_BOOTS',
    'LEATHER_GLOVES',
    'LEATHER_CAPE'
];

const HEADERS = [
    'ItemID', 'Name', 'Tier', 'Quality', 'QualityName',
    'Damage', 'Defense', 'HP', 'Speed', 'AttackSpeed',
    'Value', 'XP', 'CraftTime'
];

const rows = [];
rows.push(HEADERS.join(','));

console.log('Generating Hunter Items CSV...');

const processItem = (tier, type, itemDef) => {
    if (!itemDef) return;

    // We iterate through qualities 0-4
    for (let q = 0; q <= 4; q++) {
        // Resolve the item stats for this quality
        // resolveItem(id, quality)
        const resolved = resolveItem(itemDef.id, q);

        if (!resolved) {
            console.warn(`Could not resolve ${itemDef.id} Q${q}`);
            continue;
        }

        const stats = resolved.stats || {};

        // Extract values
        const row = [
            resolved.id,
            resolved.name, // Name already includes suffix if resolveItem handles it, or we append it
            tier,
            q,
            QUALITIES[q].name,
            stats.damage || 0,
            stats.defense || 0,
            stats.hp || 0,
            stats.speed || 0,
            stats.attackSpeed || 0,
            resolved.value || 0, // Sell price
            resolved.xp || 0,    // Craft XP
            resolved.time || 0   // Craft Time
        ];

        rows.push(row.join(','));
    }
};

// Iterate through Hunter items in ITEMS.GEAR.HUNTERS_LODGE
// The structure in items.js is ITEMS.GEAR.HUNTERS_LODGE[TYPE][TIER]
const lodgeItems = ITEMS.GEAR.HUNTERS_LODGE;

// We need to match our list of types to the keys in lodgeItems
for (const type of HUNTER_TYPES) {
    const typeGroup = lodgeItems[type];
    if (!typeGroup) {
        console.warn(`Type ${type} not found in HUNTERS_LODGE`);
        continue;
    }

    for (const tier of TIERS) {
        const item = typeGroup[tier];
        if (item) {
            processItem(tier, type, item);
        }
    }
}

const outputPath = 'hunter_items.csv';
fs.writeFileSync(outputPath, rows.join('\n'));
console.log(`CSV generated at ${outputPath}`);
