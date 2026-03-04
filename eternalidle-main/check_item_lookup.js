
import { ITEM_LOOKUP, ITEMS } from './shared/items.js';

console.log("--- ITEM LOOKUP CHECK ---");
console.log("Total Items in LOOKUP:", Object.keys(ITEM_LOOKUP).length);
console.log("Sample T1_HERB:", ITEM_LOOKUP['T1_HERB']);
console.log("Sample T1_ORE:", ITEM_LOOKUP['T1_ORE']);
console.log("Sample RABBIT (Check if monsters are here):", ITEM_LOOKUP['RABBIT']);

if (Object.keys(ITEM_LOOKUP).length === 0) {
    console.error("FAILURE: ITEM_LOOKUP is empty!");
} else {
    console.log("SUCCESS: ITEM_LOOKUP is populated.");
}
