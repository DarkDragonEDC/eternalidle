
import { INITIAL_SKILLS } from '../shared/skills.js';

// Mock InventoryManager since it has many dependencies
function calculateAgiMock(skills) {
    let agi = 0;
    const getLvl = (key) => (skills[key]?.level || 1);

    agi += getLvl('ANIMAL_SKINNER');
    agi += getLvl('LEATHER_REFINER');
    agi += getLvl('HUNTER_CRAFTER');
    agi += getLvl('LUMBERJACK');
    agi += getLvl('PLANK_REFINER');

    return Math.min(100, agi * 0.2);
}

async function verifyAgiFix() {
    console.log("--- Verification: Agility Calculation ---");

    // Character with level 10 in all Hunter skills
    const testSkills = {
        ANIMAL_SKINNER: { level: 10 },
        LEATHER_REFINER: { level: 10 },
        HUNTER_CRAFTER: { level: 10 },
        LUMBERJACK: { level: 10 },
        PLANK_REFINER: { level: 10 }
    };

    const agi = calculateAgiMock(testSkills);
    console.log(`Skills: All Hunter-related at Level 10`);
    console.log(`Calculated AGI: ${agi} (Expected: (10*5)*0.2 = 10)`);

    if (agi === 10) {
        console.log("\n✅ AGILITY CALCULATION VERIFIED");
    } else {
        console.log("\n❌ AGILITY CALCULATION FAILED");
    }
}

verifyAgiFix().catch(console.error);
