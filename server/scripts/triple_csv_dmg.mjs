import fs from 'fs';

const filePath = 'c:/Users/Cliente/Desktop/projetinho/Game/server/combat_mobs.csv';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

// ID,Name,Tier,HP,Damage,Defense,XP,Silver Min,Silver Max,Loot,Image
const newLines = dataLines.map(line => {
    if (!line.trim()) return line;
    const parts = line.split(',');
    const tier = parseInt(parts[2]);
    if (tier >= 2) {
        const damage = parseInt(parts[4]);
        const newDamage = damage * 3;
        console.log(`Updating ${parts[1]} (Tier ${tier}): ${damage} -> ${newDamage}`);
        parts[4] = newDamage.toString();
    }
    return parts.join(',');
});

fs.writeFileSync(filePath, [header, ...newLines].join('\n'));
console.log('Finished updating damage in server/combat_mobs.csv');
