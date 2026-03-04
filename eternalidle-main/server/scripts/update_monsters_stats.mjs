import { MONSTERS } from '../../shared/monsters.js';
import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'combat_mobs_balanced.csv');
const monstersFile = path.join(process.cwd(), '../../shared/monsters.js');

const parseCSV = (content) => {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(',');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        data.push(obj);
    }
    return data;
};

const updatedStats = parseCSV(fs.readFileSync(csvPath, 'utf8'));
const statsMap = {};
updatedStats.forEach(s => {
    statsMap[s.ID] = {
        hp: parseInt(s.HP),
        dmg: parseInt(s.Damage)
    };
});

// We need to read the file as text and replace the values to preserve the file format and comments
let fileContent = fs.readFileSync(monstersFile, 'utf8');

Object.keys(statsMap).forEach(mobId => {
    const stats = statsMap[mobId];

    // Regex to find the monster block and its health/damage
    // This is a bit tricky with regex, so we'll look for the ID and then the next health/damage occurrences
    // Example: 
    // {
    //    "id": "RABBIT",
    //    "name": "Rabbit",
    //    "health": 10,
    //    "damage": 5,

    // Look for "id": "MOB_ID" and then replace health/damage until the next "id" or end of array
    const idRegex = new RegExp(`"id":\\s*"${mobId}"`, 'g');
    const match = idRegex.exec(fileContent);

    if (match) {
        const startIndex = match.index;
        // Find the next block boundary or the end of the current object
        const nextIdIndex = fileContent.indexOf('"id":', startIndex + 10);
        const searchRange = nextIdIndex !== -1 ? fileContent.slice(startIndex, nextIdIndex) : fileContent.slice(startIndex);

        const updatedRange = searchRange
            .replace(/"health":\s*\d+/, `"health": ${stats.hp}`)
            .replace(/"damage":\s*\d+/, `"damage": ${stats.dmg}`);

        fileContent = fileContent.slice(0, startIndex) + updatedRange + (nextIdIndex !== -1 ? fileContent.slice(nextIdIndex) : '');
    }
});

fs.writeFileSync(monstersFile, fileContent);
console.log('✅ shared/monsters.js updated successfully with balanced stats.');
