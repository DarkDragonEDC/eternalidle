# NPC Quests

All quests defined in `shared/quests.js`. **Total: 14 quests**

---

## 🧙 The Elder (5 quests) — Tutorial Linear (1→2→3→4→5)

> ### 1. The Beginning of All
> - **ID:** `elder_intro`
> - **Type:** TALK
> - **Objective:** Talk to the Elder and receive a Noob Chest
> - **Rewards:** 1x NOOB_CHEST, 50 XP Combat
> - **Requires:** —

> ### 2. Opening the Gift
> - **ID:** `elder_open_chest`
> - **Type:** OPEN
> - **Objective:** Open the Noob Chest in inventory
> - **Rewards:** 1,000 Silver
> - **Requires:** `elder_intro`

> ### 3. Choose Your Path
> - **ID:** `elder_choose_path`
> - **Type:** EQUIP
> - **Objective:** Equip one of 3 weapons (Sword, Bow or Fire Staff)
> - **Rewards:** 1,000 Silver
> - **Requires:** `elder_open_chest`

> ### 4. Fuel for the Journey
> - **ID:** `elder_equip_food`
> - **Type:** EQUIP
> - **Objective:** Equip T1_FOOD
> - **Rewards:** 1,000 Silver
> - **Requires:** `elder_choose_path`

> ### 5. Getting to Know the Village
> - **ID:** `elder_talk_elara`
> - **Type:** TALK
> - **Objective:** Talk to Elara
> - **Rewards:** 1,000 Silver
> - **Requires:** `elder_equip_food`

---

## 🏹 Bryn the Hunter (3 quests) — No prerequisites

> ### 1. Rabbit Plague
> - **ID:** `bryn_rabbit`
> - **Type:** KILL
> - **Objective:** Kill 20 Rabbits
> - **Rewards:** 1,000 Silver, 150 Proficiency XP

> ### 2. Lurkers
> - **ID:** `bryn_goblin`
> - **Type:** KILL
> - **Objective:** Kill 15 Goblin Scouts
> - **Rewards:** 2,000 Silver, 300 Proficiency XP

> ### 3. The Hog Hunt
> - **ID:** `bryn_hogs`
> - **Type:** KILL
> - **Objective:** Kill 15 Wild Hogs
> - **Rewards:** 5,000 Silver, 500 Proficiency XP

---

## 🌿 Elara the Gatherer (3 quests) — No prerequisites

> ### 1. Fishing for Dinner
> - **ID:** `elara_fish`
> - **Type:** COLLECT
> - **Objective:** Collect 10 T1_FISH
> - **Rewards:** 1,000 Silver, 150 Fishing XP, 10 basic class resources (based on equipped weapon)

> ### 2. Provision Stock
> - **ID:** `elara_food`
> - **Type:** CRAFT
> - **Objective:** Craft 5 T1_FOOD
> - **Rewards:** 2,000 Silver, 300 Cooking XP, 20 basic class resources (based on equipped weapon)

> ### 3. Field Specialty
> - **ID:** `elara_gathering`
> - **Type:** COLLECT
> - **Objective:** Collect 10 basic class resources
> - **Rewards:** 5,000 Silver, 500 Class XP, 10 refined class resources (based on equipped weapon)

---

## ⚒️ Grog the Blacksmith (3 quests) — No prerequisites

> ### 1. The Secret of Steel
> - **ID:** `grog_refine`
> - **Type:** REFINE
> - **Objective:** Refine 10 times (class resource)
> - **Rewards:** 1,000 Silver, 150 Class Refine XP

> ### 2. Elite Forge
> - **ID:** `grog_craft`
> - **Type:** CRAFT
> - **Objective:** Craft 1 armor piece of your class
> - **Rewards:** 2,000 Silver, 300 Class Craft XP, 1x Helmet, 1x Boots, 1x Gloves, 1x Offhand (all T1 class gear)

> ### 3. Ready for Combat
> - **ID:** `grog_equip`
> - **Type:** EQUIP
> - **Objective:** Equip the crafted gear
> - **Rewards:** 5,000 Silver, 100x T1_FOOD

---

## 🔮 Theron the Runekeeper (4 quests) — Requires: `grog_equip`

> ### 1. Face the Ancient
> - **ID:** `theron_worldboss`
> - **Type:** WORLD_BOSS
> - **Objective:** Challenge the World Boss 1 time
> - **Rewards:** 2,000 Silver, 10x Battle Rune Shard

> ### 2. Rune Forging
> - **ID:** `theron_craft_rune`
> - **Type:** CRAFT_RUNE
> - **Objective:** Create 1 rune
> - **Rewards:** 3,000 Silver

> ### 3. Rune Fusion
> - **ID:** `theron_fuse_rune`
> - **Type:** FUSE_RUNE
> - **Objective:** Fuse 1 rune
> - **Rewards:** 4,000 Silver

> ### 4. Rune Empowerment
> - **ID:** `theron_equip_rune`
> - **Type:** EQUIP
> - **Objective:** Equip a combat rune
> - **Rewards:** 200x T1_FOOD
