# 📄 Patch Notes — v1.6.8 — Major Update: Village, Quests & World Boss 2.0

> Version: **1.6.8**

---

## 🗺️ NEW FEATURE: Adventure Village
A new page with interactive NPCs and a narrative progression system.

- New **"Village"** tab.
- Interactive NPC grid.
- Visual status indicators on each NPC:
  - 🟢 **Ready** — quest available (pulsing green border).
  - 🔒 **Locked** — requirements not met (dark overlay with padlock).
- Clicking an NPC opens a dialogue with their available quests.

---

## 📜 NEW SYSTEM: Quests

### NPCs and Quests
- **5 NPCs** with stories and chained quests:
  - **Elder** (5 quests)
  - **Elara** (4 quests)
  - **Grog** (3 quests)
  - **Theron** (4 quests)
  - **Bryn** (3 quests)
- **16 quests** in total with sequential progression.
- Varied rewards: Silver, XP, items, and class gear.

## 🐉 WORLD BOSS 2.0 — Dual System (Daily + Window)

The World Boss system has been completely rewritten**:

### Daily Boss
- **The Celestial Ravager** (formerly "The Ancient Dragon") — 24h cycle.
- Available from 00:00 UTC to 23:50 UTC.
- No HP — players compete for damage ranking.
- Rewards based on damage milestones (T1-T10 WB Chests).

### Window Boss (New!)
- Random rotating boss with an **8-hour** cycle (3 windows per day).
- Boss with **real HP** that can be collectively reduced by all players!
- 10 boss tiers with unique names:
  - T1: **Void Slime Monarch** 
  - T2: **Ancient Arbor Sentinel** 
  - T3: **Obsidian Dune Stalker** 
  - T4: **The Frost Sovereign** 
  - T5: **The Ethereal Predator** 
  - T6: **Chaos Entity X-0** 
  - T7: **Ancient Arcanist Golem** 
  - T8: **The Infernal Dreadknight** 
  - T9: **Soul-Stalker of the Abyss** 
  - T10: **The Primordial Star-Eater** 
- Boss can be **defeated** collectively → special reward: **Enhancement Chest**.

### World Boss Panel — Improvements
- New tabs: **BOSS** and **REWARDS**.
- **BOSS** tab: shows active boss, live ranking, and attack button.
- **REWARDS** tab: lists all pending rewards from previous sessions.
- Info button (ℹ️) with a complete boss guide (schedules, mechanics, rewards).
- **Boss Info** and **History** sub-tabs — view the last 3 Window Boss sessions and their rankings.
- Real-time HP bar showing the boss's current HP (e.g., `2.4M / 2.5M`).
- Ranking with animated medals (Gold 🥇, Silver 🥈, Bronze 🥉).
- Numeric badge for pending rewards on the REWARDS tab.

### World Boss Combat — Improvements
- New combat UI with scaled damage floaters.
- Animated boss health bar with dynamic gradient.
- Dynamic backgrounds based on boss tier.
- Improved "Combat Finished" screen: shows final damage, ranking position, and remaining time.

---

## 🔨 NEW SYSTEM: Equipment Enhancement

### Enhancement Stones
- **21 types of Enhancement Stones** added (7 slots × 3 classes: Warrior, Hunter, Mage).
- Each stone is specific to a class and equipment slot.

### Enhancement Chest (New Item)
- When opened, drops a random enhancement stone from the 21 types.
- Obtained as a reward for collectively defeating the Window Boss.

### How Enhancement Works
- Combat equipment (weapon, off-hand, armor, helmet, boots, gloves, cape) can be enhanced.
- The enhancement stone must match the item's **class** and **slot**.
- **Enhancement limits by tier**:
  - T1-T3: up to +5
  - T4-T6: up to +10
  - T7-T9: up to +15
  - T10: up to +20
- **Cost per enhancement**:
  - Silver: `Tier × 1,000 × (Current Level + 1)`
  - Stones: T1-T6 = 1 stone, T7-T9 = 2 stones, T10 = 3 stones
- **Bonus**: +2% to **all** attributes per enhancement level.

### Enhancement Interface
- New enhancement screen accessible from inventory ("Enhance" button on eligible items).
- Stat preview before and after enhancement.
- Display of silver and stone costs.
- Enhancement level (+X) visible across all panels: inventory, profile, inspection, and equipment selection.

---

## 🖥️ Interface Improvements

### Profile and Stats
- Enhancement level (+X) displayed on profile equipment slots.
- Stat calculation with enhanced items fixed and more accurate.
- Detailed stat breakdown by source (base, quality, enhancement, runes).


### Guild — Tasks
- Guild task generation revamped:
  - 1 task per raw material.
  - 1 task per refined material.
  - 1 food task.
  - 1 potion task.
  - More predictable and varied than the previous system.

---

## 🔧 Bug Fixes
- **Chest consumed twice**: Fixed a bug where chests were consumed in duplicate when opened.
- **Inventory wipe protection**: Safety system added to prevent inventory loss during saves.
- **More stable server**: Invalid VAPID keys no longer crash the server.

---

## 🔄 Other Improvements
- Overall server performance improved.
- Character selection now performs a clean reconnection to the server.
