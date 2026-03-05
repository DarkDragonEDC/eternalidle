
import fs from 'fs';
const content = fs.readFileSync('./shared/monsters.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('BOSS_GOBLIN_SCOUT')) {
        console.log(`${i + 1}: ${line}`);
    }
});
