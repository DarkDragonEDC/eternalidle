import fs from 'fs';
import path from 'path';

const monstersPath = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/shared/monsters.js';
let content = fs.readFileSync(monstersPath, 'utf8');

// Simple regex replace for health values of dungeon mobs
// This is actually tricky because shared/monsters.js uses an export const object.
// I'll parse it as a temporary object by removing the export part.

const jsonContent = content.replace('export const MONSTERS = ', '').replace(';', '');
const MONSTERS = JSON.parse(jsonContent);

for (const tier in MONSTERS) {
    MONSTERS[tier] = MONSTERS[tier].map(monster => {
        if (monster.dungeonOnly) {
            monster.health = Math.floor(monster.health * 1.5);
        }
        return monster;
    });
}

const newContent = `export const MONSTERS = ${JSON.stringify(MONSTERS, null, 4)};`;
fs.writeFileSync(monstersPath, newContent, 'utf8');
console.log('HP updated successfully');
