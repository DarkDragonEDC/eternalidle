
import { resolveItem } from './shared/items.js';

const tests = [
    { id: 'T1_FIRE_STAFF', expected: { damage: 37078, speed: 26 } },
    { id: 'T10_FIRE_STAFF_Q4', expected: { damage: 404949, speed: 284.7 } },
    { id: 'T1_TOME', expected: { damage: 16876, critChance: 0.46 } },
    { id: 'T10_TOME_Q4', expected: { damage: 185000, critChance: 5.0 } },
    { id: 'T1_CLOTH_ARMOR', expected: { hp: 27366, defense: 45.6 } },
    { id: 'T10_CLOTH_ARMOR_Q4', expected: { hp: 300000, defense: 500 } },
    { id: 'T1_CLOTH_BOOTS', expected: { hp: 10314, defense: 17.2, speed: 30.3 } },
    { id: 'T10_CLOTH_BOOTS_Q4', expected: { hp: 112500, defense: 187.5, speed: 332.22 } },
    { id: 'T1_MAGE_CAPE', expected: { damage: 6751, speed: 13, efficiency: { GLOBAL: 1.37 } } },
    { id: 'T10_MAGE_CAPE_Q4', expected: { damage: 74000, speed: 142.32, efficiency: { GLOBAL: 15.0 } } }
];

let failed = false;
for (const test of tests) {
    const item = resolveItem(test.id);
    if (!item) {
        console.error(`FAIL: Item ${test.id} not found.`);
        failed = true;
        continue;
    }

    for (const [key, expectedVal] of Object.entries(test.expected)) {
        let actualVal = item.stats[key];

        if (typeof expectedVal === 'object') {
            for (const subKey in expectedVal) {
                if (Math.abs(expectedVal[subKey] - actualVal[subKey]) > 0.1) {
                    console.error(`FAIL: ${test.id} ${key}.${subKey} -> Expected ${expectedVal[subKey]}, got ${actualVal[subKey]}`);
                    console.error('Actual Item:', JSON.stringify(item, null, 2));
                    failed = true;
                }
            }
        } else {
            // Speed/Crit/GlobalEff rounding check
            if (Math.abs(expectedVal - actualVal) > 0.5) {
                console.error(`FAIL: ${test.id} ${key} -> Expected ${expectedVal}, got ${actualVal}`);
                console.error('Actual Item:', JSON.stringify(item, null, 2));
                failed = true;
            }
        }
    }
}

if (!failed) {
    console.log('✅ All Mage Rebalance tests passed! Stats match CSV values.');
} else {
    process.exit(1);
}
