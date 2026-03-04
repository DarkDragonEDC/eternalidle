
import { calculateSurvivalTime } from './client/src/utils/combat.js';

// Mock data
const playerStats = { damage: 100, defense: 500, maxHP: 1000, attackSpeed: 1000 };
const mobNoDmg = { id: 'test_1', health: 100, damage: 0, xp: 10, silver: [1, 1], level: 1 };
const mobSmallDmg = { id: 'test_2', health: 100, damage: 10, xp: 10, silver: [1, 1], level: 1 };
const foodItem = { id: 'T1_FOOD', healPercent: 5 }; // 50 HP

console.log("--- TEST: No Damage ---");
const res1 = calculateSurvivalTime(playerStats, mobNoDmg, null, 0, 1000);
console.log(`Expected: Unlimited, Got: ${res1.text}`);

console.log("\n--- TEST: Long Survival (no limit) ---");
// With 1000 food and small damage, it should be very long
const res2 = calculateSurvivalTime(playerStats, mobSmallDmg, foodItem, 10000, 1000);
console.log(`Duration: ${res2.text}, Seconds: ${res2.seconds}`);
if (res2.text.includes('d')) {
    console.log("OK: Days format detected!");
}

console.log("\n--- TEST: Color Coding ---");
const res3 = calculateSurvivalTime(playerStats, mobSmallDmg, null, 0, 1000);
console.log(`Color (no food): ${res3.color} (Expected: orange/default from formatSurvival)`);

const mobHighDmg = { id: 'test_3', health: 100, damage: 200, xp: 10, silver: [1, 1], level: 1 };
const res4 = calculateSurvivalTime(playerStats, mobHighDmg, foodItem, 100, 1000);
console.log(`Color (high dmg > heal): ${res4.color} (Expected: #ff4444)`);
