
import { MONSTERS } from './shared/monsters.js';
import fs from 'fs';

const newDataStr = `Rabbit,12,23
Goblin Scout,13,24
Wild Hog,14,25
Fox,15,27
Snake,16,28
Wolf,17,29
Dire Rat,18,31
Stag,19,32
Mountain Goat,20,34
Bandit Thug,21,36
Bear,22,37
Mountain Goblin,23,39
Highland Cow,24,41
Harpy,25,43
Rogue Knight,26,45
Dire Wolf,27,48
Ghost Knight,28,50
Snow Leopard,29,53
Giant Eagle,30,55
Ash Ghoul,31,58
Ogre,32,61
War Ogre,33,64
Swamp Troc,34,67
Crimson Bat,35,70
Corrupted Paladin,37,74
Mountain Troll,39,78
Armored Troll,41,81
Tundra Bear,43,86
Sky Stalker,45,90
Executioner,47,94
Dragon Whelp,50,99
Fire Drake,52,104
Lava Hound,55,109
Storm Wraith,58,115
Rune Guardian,60,120
Ancient Golem,63,126
Obsidian Golem,67,133
Glacier Giant,70,139
Void Stalker,73,146
Abyssal Knight,77,154
Elder Dragon,81,161
Void Dragon,85,169
Nebula Serpent,89,178
Star Devourer,94,187
Cosmic Horror,98,196
Ancient Dragon,103,206
Void Dragon Lord,108,216
Galaxy Eater,114,227
Void Reaper,119,238
Eternal Watcher,125,250`;

const newData = {};
newDataStr.split('\n').forEach(line => {
    const [name, xp, gold] = line.split(',');
    newData[name.trim()] = { xp: parseInt(xp), gold: parseInt(gold) };
});

const updatedMonsters = JSON.parse(JSON.stringify(MONSTERS));

Object.keys(updatedMonsters).forEach(tier => {
    updatedMonsters[tier].forEach(mob => {
        if (newData[mob.name]) {
            mob.xp = newData[mob.name].xp;
            mob.silver = [newData[mob.name].gold, newData[mob.name].gold];
        }
    });
});

const fileContent = `export const MONSTERS = ${JSON.stringify(updatedMonsters, null, 4)};`;
fs.writeFileSync('./shared/monsters.js', fileContent);
console.log('XP e Gold dos monstros atualizados com sucesso!');
