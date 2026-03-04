
import { getSkillForItem, resolveItem } from '../shared/items.js';

const itemId = 'T1_FISHING_ROD';
const item = resolveItem(itemId);

console.log('Testing Item:', itemId);
console.log('Resolved Item Type:', item ? item.type : 'NOT FOUND');
console.log('Resolved Item ID:', item ? item.id : 'NOT FOUND');

const skillGathering = getSkillForItem(itemId, 'GATHERING');
console.log('Skill (GATHERING):', skillGathering);
