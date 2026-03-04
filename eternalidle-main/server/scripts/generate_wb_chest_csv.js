
const fs = require('fs');

// Manually defining drop table to avoid module resolution issues
const CHEST_DROP_TABLE = {
    REFINED_TYPES: ['PLANK', 'BAR', 'CLOTH', 'LEATHER', 'EXTRACT'],
    RARITIES: {
        COMMON: { baseQty: 5, crestChance: 0.01, runeShardRange: [1, 2] },
        UNCOMMON: { baseQty: 6, crestChance: 0.03, runeShardRange: [3, 4] },
        RARE: { baseQty: 8, crestChance: 0.05, runeShardRange: [5, 6] },
        EPIC: { baseQty: 12, crestChance: 0.075, runeShardRange: [7, 8] },
        LEGENDARY: { baseQty: 20, crestChance: 0.10, runeShardRange: [9, 10] }
    }
};

// Manually defining WorldBoss chests based on known pattern
const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

const chests = [];

for (const t of TIERS) {
    for (const r of RARITIES) {
        chests.push({
            id: `T${t}_WORLDBOSS_CHEST_${r}`,
            name: `WorldBoss Chest (${r.charAt(0) + r.slice(1).toLowerCase()})`,
            tier: t,
            rarity: r
        });
    }
}

function generateCSV() {
    try {
        let csvContent = "Current Date: " + new Date().toISOString() + "\n";
        // Fixed: Added correct headers
        csvContent += "ID,Name,Tier,Rarity,Base Qty,Crest Chance,Rune Shard Range\n";

        for (const chest of chests) {
            const dropData = CHEST_DROP_TABLE.RARITIES[chest.rarity];

            if (!dropData) continue;

            const row = [
                chest.id,
                chest.name,
                chest.tier,
                chest.rarity,
                dropData.baseQty,
                (dropData.crestChance * 100) + '%',
                `[${dropData.runeShardRange.join('-')}]`
            ].join(',');

            csvContent += row + "\n";
        }

        fs.writeFileSync('wb_chests.csv', csvContent);
        console.log("CSV generated: wb_chests.csv");

    } catch (error) {
        console.error("Error generating CSV:", error);
    }
}

generateCSV();
