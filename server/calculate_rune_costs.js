
const tiers = 10;
const starsPerTier = 3;
const baseCostFactor = 2500;

let csv = "Tier,Current Stars,Next Level,Merge Cost (Silver),Cumulative Cost from T1 1* (Silver)\n";

let cumulativeCost = 0;
let runesAtCurrentLevel = 1; // We want to calculate cost to make 1 of the NEXT level

// To calculate cumulative: 
// To make 1 of Level(N+1), we need 2 of Level(N).
// Cost(N+1) = 2 * Cost(N) + MergeCost(N)
// Base case: Cost(T1 1*) = 0 (we have it)

let costs = {
    "T1 1*": 0
};

for (let t = 1; t <= tiers; t++) {
    for (let s = 1; s <= starsPerTier; s++) {
        const currentLabel = `T${t} ${s}*`;
        let nextTier = t;
        let nextStars = s + 1;

        if (s === 3) {
            if (t === tiers) break;
            nextTier = t + 1;
            nextStars = 1;
        }

        const nextLabel = `T${nextTier} ${nextStars}*`;
        const mergeCost = 2 * t;

        // Cumulative cost to make 1 of nextLabel:
        // We need TWO of currentLabel, plus the merge cost
        costs[nextLabel] = (2 * costs[currentLabel]) + mergeCost;

        csv += `${t},${s},${nextLabel},${mergeCost},${costs[nextLabel]}\n`;
    }
}

console.log(csv);
