import fs from 'fs';

const monstersPath = 'c:/Users/Cliente/Desktop/projetinho/Game/shared/monsters.js';
const combatMobsCsvPath = 'c:/Users/Cliente/Desktop/projetinho/Game/server/combat_mobs.csv';
const monsterStatsCsvPath = 'c:/Users/Cliente/Desktop/projetinho/Game/combat_monsters_stats.csv';
const targetHP = 2500;

// 1. Update shared/monsters.js
let monstersContent = fs.readFileSync(monstersPath, 'utf8');
let monstersLines = monstersContent.split('\n');
let currentTier = null;
let updatedMonsters = monstersLines.map(line => {
    const tierMatch = line.match(/^\s*"(\d+)":\s*\[/);
    if (tierMatch) currentTier = parseInt(tierMatch[1]);
    if (currentTier === 1) {
        const hpMatch = line.match(/^(\s*"health":\s*)(\d+)(,?\s*)$/);
        if (hpMatch) return `${hpMatch[1]}${targetHP}${hpMatch[3]}`;
    }
    return line;
}).join('\n');
fs.writeFileSync(monstersPath, updatedMonsters);
console.log('Updated shared/monsters.js T1 health to 2500');

// 2. Update server/combat_mobs.csv (ID,Name,Tier,HP,Damage,...)
let combatMobsContent = fs.readFileSync(combatMobsCsvPath, 'utf8');
let combatMobsLines = combatMobsContent.split('\n');
let updatedCombatMobs = combatMobsLines.map(line => {
    if (!line.trim() || line.startsWith('ID,')) return line;
    const parts = line.split(',');
    if (parseInt(parts[2]) === 1) {
        parts[3] = targetHP.toString();
    }
    return parts.join(',');
}).join('\n');
fs.writeFileSync(combatMobsCsvPath, updatedCombatMobs);
console.log('Updated server/combat_mobs.csv T1 health to 2500');

// 3. Update combat_monsters_stats.csv (Tier,ID,Name,Health,...)
let monsterStatsContent = fs.readFileSync(monsterStatsCsvPath, 'utf8');
let monsterStatsLines = monsterStatsContent.split('\n');
let updatedMonsterStats = monsterStatsLines.map(line => {
    if (!line.trim() || line.startsWith('Tier,')) return line;
    const parts = line.split(',');
    if (parseInt(parts[0]) === 1) {
        parts[3] = targetHP.toString();
    }
    return parts.join(',');
}).join('\n');
fs.writeFileSync(monsterStatsCsvPath, updatedMonsterStats);
console.log('Updated combat_monsters_stats.csv T1 health to 2500');
