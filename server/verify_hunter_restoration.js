
import { getSkillForItem } from '../shared/items.js';
import { INITIAL_SKILLS } from '../shared/skills.js';

async function verifyHunterSkill() {
    console.log("--- Verification: Hunter Skill Mapping ---");

    // Test Bow
    const bowSkill = getSkillForItem('T1_BOW', 'CRAFTING');
    console.log(`T1_BOW CRAFTING skill: ${bowSkill} (Expected: HUNTER_CRAFTER)`);

    // Test Leather Armor
    const leatherSkill = getSkillForItem('T1_LEATHER_ARMOR', 'CRAFTING');
    console.log(`T1_LEATHER_ARMOR CRAFTING skill: ${leatherSkill} (Expected: HUNTER_CRAFTER)`);

    // Test Hunter Cape
    const capeSkill = getSkillForItem('T1_HUNTER_CAPE', 'CRAFTING');
    console.log(`T1_HUNTER_CAPE CRAFTING skill: ${capeSkill} (Expected: HUNTER_CRAFTER)`);

    console.log("\n--- Verification: Initial Skills ---");
    console.log(`HUNTER_CRAFTER in INITIAL_SKILLS: ${!!INITIAL_SKILLS.HUNTER_CRAFTER}`);

    if (bowSkill === 'HUNTER_CRAFTER' && leatherSkill === 'HUNTER_CRAFTER' && INITIAL_SKILLS.HUNTER_CRAFTER) {
        console.log("\n✅ CORE LOGIC VERIFIED");
    } else {
        console.log("\n❌ CORE LOGIC VERIFICATION FAILED");
    }
}

verifyHunterSkill().catch(console.error);
