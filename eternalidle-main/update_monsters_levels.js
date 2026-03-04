
import { MONSTERS } from './shared/monsters.js';
import fs from 'fs';

const updatedMonsters = JSON.parse(JSON.stringify(MONSTERS));
const levelsPattern = [1, 2, 4, 6, 8];

Object.keys(updatedMonsters).forEach(tierStr => {
    const tier = parseInt(tierStr);
    let combatMobIndex = 0;

    updatedMonsters[tierStr].forEach(mob => {
        // Apenas mobs que não são dungeonOnly e dão XP (mobs de combate do mundo aberto)
        if (!mob.dungeonOnly && mob.xp > 0) {
            const subIndex = combatMobIndex + 1;
            mob.subTier = `${tier}.${subIndex}`;
            mob.level = (tier - 1) * 10 + levelsPattern[combatMobIndex];
            combatMobIndex++;
        } else if (mob.dungeonOnly) {
            // Para mobs de dungeon, vamos deixar um nível base do Tier para referência, se necessário
            mob.level = (tier - 1) * 10 + 5;
        }
    });
});

const fileContent = `export const MONSTERS = ${JSON.stringify(updatedMonsters, null, 4)};`;
fs.writeFileSync('./shared/monsters.js', fileContent);
console.log('Níveis de monstros atualizados com sucesso!');
