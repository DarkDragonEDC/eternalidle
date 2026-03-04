
import { MONSTERS } from './shared/monsters.js';
import fs from 'fs';

let csvContent = 'Name,SubTier,Level,Tier,XP,Gold\n';

Object.keys(MONSTERS).sort((a, b) => Number(a) - Number(b)).forEach(tier => {
    MONSTERS[tier].forEach(mob => {
        // FILTER: Somente mobs que dão XP e NÃO são de dungeon
        if (mob.xp > 0 && !mob.dungeonOnly) {
            const gold = mob.silver ? mob.silver[0] : 0;
            const subTier = mob.subTier || 'N/A';
            const level = mob.level || 'N/A';
            csvContent += `"${mob.name}",${subTier},${level},${mob.tier},${mob.xp},${gold}\n`;
        }
    });
});

fs.writeFileSync('combat_mobs_info.csv', csvContent);
console.log('Arquivo combat_mobs_info.csv atualizado (apenas mobs de combate mundo aberto)!');
