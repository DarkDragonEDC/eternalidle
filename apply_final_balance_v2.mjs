
import { DUNGEONS } from './shared/dungeons.js';
import fs from 'fs';

const finalBalance = {
    1: [7, 8, 9, 10, 12],
    2: [15, 18, 21, 24, 30],
    3: [25, 28, 31, 34, 40],
    4: [45, 50, 55, 60, 75],
    5: [80, 90, 100, 110, 135],
    6: [140, 155, 170, 185, 220],
    7: [190, 210, 230, 250, 300],
    8: [240, 265, 290, 315, 380],
    9: [300, 330, 360, 390, 470],
    10: [380, 420, 460, 500, 600]
};

let content = fs.readFileSync('shared/monsters.js', 'utf8');

for (let t = 1; t <= 10; t++) {
    const dungeon = DUNGEONS[t];
    const mobs = [...dungeon.trashMobs, dungeon.bossId];
    const dmgs = finalBalance[t];

    mobs.forEach((id, idx) => {
        const regex = new RegExp(`(id:\\s*['"]${id}['"](?:.|\\n)*?damage:\\s*)(\\d+)`, 'g');
        content = content.replace(regex, `$1${dmgs[idx]}`);
    });
}

fs.writeFileSync('shared/monsters.js', content, 'utf8');
console.log("Applied final balance to monsters.js");
