
const { MONSTERS } = require('./shared/monsters.js');

let errors = 0;
const expectedSequence = [0.01, 0.015, 0.02, 0.025, 0.03];

for (let tier = 1; tier <= 10; tier++) {
    const monsters = MONSTERS[tier.toString()];
    if (!monsters) {
        console.error(`Tier ${tier} not found!`);
        errors++;
        continue;
    }

    const mapKey = `T${tier}_DUNGEON_MAP`;
    console.log(`Checking Tier ${tier} (${mapKey})...`);

    // Check first 5 monsters
    for (let i = 0; i < 5; i++) {
        const monster = monsters[i];
        if (!monster) {
            console.error(`Monster index ${i} in Tier ${tier} not found!`);
            errors++;
            continue;
        }

        const actual = monster.loot[mapKey];
        const expected = expectedSequence[i];

        if (actual !== expected) {
            console.error(`[ERROR] Tier ${tier}, Monster ${monster.id}: Expected ${expected}, got ${actual}`);
            errors++;
        } else {
            // console.log(`[OK] Tier ${tier}, Monster ${monster.id}: ${actual}`);
        }
    }
}

if (errors === 0) {
    console.log("All dungeon map drop rates are correct!");
    process.exit(0);
} else {
    console.error(`Finished with ${errors} errors.`);
    process.exit(1);
}
