
import fs from 'fs';
import { ITEMS, TIERS, QUALITIES, resolveItem } from '../shared/items.js';

const WARRIOR_TYPES = [
    'SWORD',
    'SHEATH',
    'PLATE_ARMOR',
    'PLATE_HELMET',
    'PLATE_BOOTS',
    'PLATE_GLOVES',
    'PLATE_CAPE'
];

const HEADERS = [
    'ItemID', 'Name', 'Tier', 'Quality', 'QualityName',
    'Damage', 'Defense', 'HP', 'Speed', 'AttackSpeed', 'BlockChance',
    'Value', 'XP', 'CraftTime'
];

const rows = [];
rows.push(HEADERS.join(','));

console.log('Generating Warrior Items CSV...');

const processItem = (tier, type, itemDef) => {
    if (!itemDef) return;

    // We iterate through qualities 0-4
    for (let q = 0; q <= 4; q++) {
        // Resolve the item stats for this quality
        const resolved = resolveItem(itemDef.id, q);

        if (!resolved) {
            console.warn(`Could not resolve ${itemDef.id} Q${q}`);
            continue;
        }

        const stats = resolved.stats || {};

        // Extract values
        const row = [
            resolved.id,
            resolved.name,
            tier,
            q,
            QUALITIES[q].name,
            stats.damage || 0,
            stats.defense || 0,
            stats.hp || 0,
            stats.speed || 0,
            stats.attackSpeed || 0,
            stats.blockChance || 0, // Shield specific
            resolved.value || 0,
            resolved.xp || 0,
            resolved.time || 0
        ];

        rows.push(row.join(','));
    }
};

const forgeItems = ITEMS.GEAR.WARRIORS_FORGE;

for (const type of WARRIOR_TYPES) {
    const typeGroup = forgeItems[type];
    if (!typeGroup) {
        console.warn(`Type ${type} not found in WARRIORS_FORGE`);
        continue;
    }

    for (const tier of TIERS) {
        const item = typeGroup[tier];
        if (item) {
            processItem(tier, type, item);
        }
    }
}

const outputPath = 'warrior_items.csv';
fs.writeFileSync(outputPath, rows.join('\n'));
console.log(`CSV generated at ${outputPath}`);
