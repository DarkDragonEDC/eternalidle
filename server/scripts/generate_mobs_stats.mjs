import { MONSTERS } from '../../shared/monsters.js';
import fs from 'fs';

const csvRows = ['Mob ID,Name,Tier,HP,Damage,Defense,XP,Attack Speed (h/s),Silver Min,Silver Max,Loot'];

Object.keys(MONSTERS).forEach(tier => {
    const list = MONSTERS[tier];
    list.forEach(mob => {
        // Only non-dungeon-only mobs
        if (mob.dungeonOnly) return;

        const silver = mob.silver || [0, 0];
        const lootItems = mob.loot ? Object.entries(mob.loot).map(([item, chance]) => `${item}(${(chance * 100).toFixed(2)}%)`).join(';') : '';

        // Default attack speed from CombatManager.js is 1000ms
        const hps = "1.00";

        csvRows.push([
            mob.id,
            mob.name,
            mob.tier || tier,
            mob.health,
            mob.damage,
            mob.defense || 0,
            mob.xp || 0,
            hps,
            silver[0],
            silver[1],
            `"${lootItems}"`
        ].join(','));
    });
});

fs.writeFileSync('combat_mobs_stats.csv', csvRows.join('\n'));
console.log('✅ CSV generated: combat_mobs_stats.csv');
