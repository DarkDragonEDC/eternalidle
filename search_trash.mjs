
import fs from 'fs';
const content = fs.readFileSync('./shared/monsters.js', 'utf8');
const lines = content.split('\n');
const mobs = ['ROCK_ELEMENTAL_T1', 'GIANT_SPIDER_T1', 'GOBLIN_KING', 'DG_RABBIT'];
lines.forEach((line, i) => {
    mobs.forEach(mob => {
        if (line.includes(`"${mob}"`)) {
            console.log(`${i + 1}: ${line}`);
        }
    });
});
