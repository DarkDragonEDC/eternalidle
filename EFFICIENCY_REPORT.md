# Efficiency Audit Report

## Summary

After reviewing the codebase, the following performance inefficiencies were identified. They are ordered roughly by estimated impact.

---

### 1. `calculateStats()` called repeatedly inside batch loops (HIGH IMPACT)

**Files:** `GameManager.js` (processBatchActions, processBatchCombat, processTick), `CombatManager.js` (processCombatRound)

`InventoryManager.calculateStats()` is an expensive function: it iterates over all equipment, resolves every item from the shared lookup, computes rune bonuses, parses active buffs, and builds large stat objects. Despite this cost, it is called **on every single iteration** inside tight loops:

- `processBatchActions` (line ~773): calls `calculateStats` inside a loop that can run thousands of iterations during offline catchup.
- `processBatchCombat` (line ~819): calls `calculateStats` once before the loop, but `processCombatRound` calls it again on **every round** (line 101).
- `processTick` (line ~1319, ~1403, ~1514): calls `calculateStats` multiple times per tick for session XP tracking, combat, and the final status return.
- `processFood` (line ~1615): calls `calculateStats` just to read `maxHP`, even when called from within combat rounds that already computed stats.

**Fix applied in this PR:** Cache `calculateStats` per character per tick cycle to avoid redundant recomputation.

---

### 2. `flushDirtyCharacters()` persists sequentially (MEDIUM IMPACT)

**File:** `GameManager.js`, line 107-114

The periodic flush iterates over all dirty characters and `await`s each `persistCharacter` call one-by-one. Each call does a Supabase UPDATE (network round-trip). With many dirty characters, this serializes N network requests.

Note: `persistAllDirty` (line 726) already uses `Promise.all` for parallel persistence, but `flushDirtyCharacters` does not.

**Suggestion:** Use `Promise.all` (like `persistAllDirty` already does) or just call `persistAllDirty` instead.

---

### 3. `findRefinedItem()` scans entire item catalog on every gathering action (MEDIUM IMPACT)

**File:** `ActivityManager.js`, line 224-242

Every time a gathering action triggers auto-refine logic, `findRefinedItem` does a nested loop over `ITEMS.REFINED` and potentially `ITEMS.CONSUMABLE.FOOD` to find which refined item uses the given raw material. This is O(categories * items) on every single action.

**Suggestion:** Build a one-time lookup map `rawId -> refinedId` at module initialization.

---

### 4. `getLeaderboard()` fetches up to 2000 full character records (MEDIUM IMPACT)

**File:** `GameManager.js`, line 1655-1765

Each leaderboard request fetches up to 2000 rows with `state`, `skills`, and `info` columns from the database, then sorts them in-memory. Even with the 30-minute cache TTL, each cache miss is very heavy.

**Suggestion:** Fetch only the columns needed for sorting (`id`, `name`, `skills`, `state->isIronman`, `info->membership`). Avoid fetching the full `state` blob.

---

### 5. `persistCharacter()` deep-clones state via `JSON.parse(JSON.stringify(...))` (LOW-MEDIUM IMPACT)

**File:** `GameManager.js`, line 605

Every persistence call deep-clones the entire character state object. For characters with large inventories or combat logs, this can be expensive - especially when persistence runs every 15 seconds for all dirty characters.

**Suggestion:** Use `structuredClone()` (available in Node 17+) or restructure to avoid the full clone by extracting fields directly.

---

### 6. Duplicated efficiency/skill maps across multiple methods (LOW IMPACT)

**Files:** `ActivityManager.js` (lines 45-63, 135-142, 250-256, 367-374)

The same skill-to-resource mapping objects (`efficiencyMap`, `refiningMap`, `craftingMap`) are recreated as new object literals on every call to `startActivity`, `processGathering`, `processRefining`, and `processCrafting`. These are static data.

**Suggestion:** Hoist them to module-level constants.
