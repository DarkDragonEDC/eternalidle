
import { ITEMS, resolveItem } from '../../shared/items.js';

console.log("Verifying WorldBoss Chests...");

let errorCount = 0;

for (let t = 1; t <= 10; t++) {
    const qualities = ['NORMAL', 'GOOD', 'OUTSTANDING', 'EXCELLENT', 'MASTERPIECE'];

    for (const q of qualities) {
        const id = `T${t}_WORLDBOSS_CHEST_${q}`;
        const item = resolveItem(id);

        if (!item) {
            console.error(`[FAIL] Item ${id} not found!`);
            errorCount++;
        } else {
            if (!item.name.includes("WorldBoss Chest")) {
                console.error(`[FAIL] Item ${id} has wrong name: ${item.name}`);
                errorCount++;
            }
            if (item.tier !== t) {
                console.error(`[FAIL] Item ${id} has wrong tier: ${item.tier}`);
                errorCount++;
            }
            // console.log(`[OK] ${id} verified.`);
        }
    }
}

if (errorCount === 0) {
    console.log("SUCCESS: All WorldBoss Chests verified correctly!");
} else {
    console.log(`FAILURE: ${errorCount} errors found.`);
    process.exit(1);
}
