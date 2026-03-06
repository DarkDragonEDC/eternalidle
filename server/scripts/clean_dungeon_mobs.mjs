import fs from 'fs';
import { MONSTERS } from '../../shared/monsters.js';

const newMonsters = {};

for (const tier in MONSTERS) {
    newMonsters[tier] = MONSTERS[tier].filter(mob => !mob.dungeonOnly);
}

const content = `export const MONSTERS = ${JSON.stringify(newMonsters, null, 4)};\n`;
fs.writeFileSync('../../shared/monsters.js', content, 'utf-8');
console.log('Finalizado: Monstros dungeonOnly removidos.');
