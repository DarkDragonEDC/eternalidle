import fs from 'fs';

const filePath = 'c:/Users/Cliente/Desktop/projetinho/Game/combat_monsters_stats.csv';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

// Tier,ID,Name,Health,Damage,Defense,Silver Min,Silver Max,XP,Loot
const newLines = dataLines.map(line => {
    if (!line.trim()) return line;
    const parts = line.split(',');
    const tier = parseInt(parts[0]);
    if (tier >= 2) {
        const damage = parseInt(parts[4]);
        const newDamage = damage * 3;
        console.log(`Updating ${parts[2]} (Tier ${tier}): ${damage} -> ${newDamage}`);
        parts[4] = newDamage.toString();
    }
    return parts.join(',');
});

fs.writeFileSync(filePath, [header, ...newLines].join('\n'));
console.log('Finished updating damage in combat_monsters_stats.csv');
