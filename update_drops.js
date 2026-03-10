const fs = require('fs');
const path = require('path');

const monstersPath = path.join(__dirname, 'shared', 'monsters.js');
let content = fs.readFileSync(monstersPath, 'utf8');

// The pattern looks like: "T1_WOOD": 0.2
// We only want to replace 0.2 to 0.1 for resources.
const regex = /("T\d+_(WOOD|ORE|HIDE|FIBER|HERB|FISH)":\s*)0\.2/g;

const newContent = content.replace(regex, '$10.1');

fs.writeFileSync(monstersPath, newContent);
console.log('Updated drop rates from 0.2 to 0.1');
