
const { getSkillForItem, getRequiredProficiencyGroup } = require('./shared/items.js');

const itemId = 'T1_FISHING_ROD';

console.log('Testing Item:', itemId);

const profGroup = getRequiredProficiencyGroup(itemId);
console.log('Proficiency Group:', profGroup);

const skillGathering = getSkillForItem(itemId, 'GATHERING');
console.log('Skill (GATHERING):', skillGathering);

const skillRefining = getSkillForItem(itemId, 'REFINING');
console.log('Skill (REFINING):', skillRefining);

const skillCrafting = getSkillForItem(itemId, 'CRAFTING');
console.log('Skill (CRAFTING):', skillCrafting);

const combined = skillGathering || skillRefining || skillCrafting;
console.log('Combined Logic Result:', combined);
