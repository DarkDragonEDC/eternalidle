import fs from 'fs';
import { QUESTS } from '../shared/quests.js';

let totalSilver = 0;
const totalItems = {};
const totalXp = {};
let totalProficiencyXp = 0;
let totalClassCraftXp = 0;
let totalClassRefineXp = 0;
let totalClassXp = 0;
let totalClassItems = 0;
let totalClassRefinedItems = 0;
let givesClassEquipment = 0;

for (const q of Object.values(QUESTS)) {
    if (!q.rewards) continue;
    
    if (q.rewards.silver) totalSilver += q.rewards.silver;
    if (q.rewards.proficiencyXp) totalProficiencyXp += q.rewards.proficiencyXp;
    if (q.rewards.useClassCraftXp) totalClassCraftXp += q.rewards.useClassCraftXp;
    if (q.rewards.useClassRefineXp) totalClassRefineXp += q.rewards.useClassRefineXp;
    if (q.rewards.useClassXp) totalClassXp += q.rewards.useClassXp;
    
    if (q.rewards.useClassItems) totalClassItems += q.rewards.useClassItems;
    if (q.rewards.useClassRefinedItems) totalClassRefinedItems += q.rewards.useClassRefinedItems;
    if (q.rewards.useClassEquipment) givesClassEquipment++;
    
    if (q.rewards.items) {
        for (const [itemId, qty] of Object.entries(q.rewards.items)) {
            totalItems[itemId] = (totalItems[itemId] || 0) + qty;
        }
    }
    
    if (q.rewards.xp) {
         for (const [skillId, qty] of Object.entries(q.rewards.xp)) {
            totalXp[skillId] = (totalXp[skillId] || 0) + qty;
        }
    }
}

const output = {
  Silver: totalSilver,
  ClassProficiencyXp: totalProficiencyXp,
  ClassCraftXp: totalClassCraftXp,
  ClassRefineXp: totalClassRefineXp,
  ClassGatherXp: totalClassXp,
  ClassMaterials: totalClassItems,
  ClassRefined: totalClassRefinedItems,
  ClassGearSets: givesClassEquipment,
  Items: totalItems,
  Xp: totalXp
};

fs.writeFileSync('rewards_output.json', JSON.stringify(output, null, 2), 'utf8');
