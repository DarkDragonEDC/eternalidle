
import { DUNGEONS } from './shared/dungeons.js';
import { MONSTERS } from './shared/monsters.js';

// Flatten monsters for easy lookup
const allMonsters = {};
Object.values(MONSTERS).forEach(tierList => {
    tierList.forEach(m => {
        allMonsters[m.id] = m;
    });
});

console.log("| Tier | Mob Name | New Damage |");
console.log("|------|----------|------------|");

for (let t = 1; t <= 10; t++) {
    const dungeon = DUNGEONS[t];
    const mobIds = [...dungeon.trashMobs, dungeon.bossId];

    mobIds.forEach(id => {
        const mob = allMonsters[id];
        if (mob) {
            console.log(`| ${t} | ${mob.name} | ${mob.damage} |`);
        } else {
            console.log(`| ${t} | ${id} (NOT FOUND) | - |`);
        }
    });
}
