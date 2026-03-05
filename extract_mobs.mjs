
import { MONSTERS } from './shared/monsters.js';
import { DUNGEONS } from './shared/dungeons.js';
import fs from 'fs';

const dungeonMobs = {};

Object.values(DUNGEONS).forEach(d => {
    const mobs = [...d.trashMobs, d.bossId];
    mobs.forEach(id => {
        const mob = MONSTERS[d.tier].find(m => m.id === id);
        if (mob) {
            dungeonMobs[id] = {
                health: mob.health,
                defense: mob.defense,
                tier: d.tier
            };
        }
    });
});

fs.writeFileSync('dungeon_mobs.json', JSON.stringify(dungeonMobs, null, 2), 'utf8');
