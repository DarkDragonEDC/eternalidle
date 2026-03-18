# Eternal Idle Notifications Documentation

This document lists all push and in-game notifications currently implemented in the system, including how they appear, what they say, and what triggers them.

## 📱 Push Notifications
These are sent to your device (Mobile or Desktop) even when the game is closed.

| Notification ID | Title | Message Body | Trigger Condition |
| :--- | :--- | :--- | :--- |
| `push_activity_finished` | Activity Finished! ✅ | Your activity is complete. Tap to start a new one! | When a timed activity (like refining) finishes. |
| `push_hp_recovered` | HP Fully Recovered! ❤️ | You are back to full health and ready for battle! | When your HP reaches maximum (via resting or eating). |
| `push_daily_spin` | Daily Spin Available! 🎡 | Your daily reward is waiting for you... | Triggered daily at Midnight UTC. |
| `push_world_boss` | World Boss Spawned! 🐉 | [Boss Name] is terrorizing the world... | Triggered when the daily World Boss spawns. |
| `push_guild_tasks` | New Guild Tasks! 🛡️ | Fresh daily tasks are available for your guild. | Triggered daily at Midnight UTC for guild members. |
| `push_guild_new_member`| New Guild Member! 🛡️ | A new member has joined your guild. Welcome them! | When a Leader/Officer accepts a player's request. |
| `push_guild_task` | Guild Task Complete! ✅ | Your guild has completed a task: [Task Name]. | When a collaborative guild task is reached. |
| `push_market_sale` | Item Sold! 💵 | Your item [Item] (x[Qty]) was sold for [Price] Silver. | When another player buys an item you listed. |
| `push_market_bought` | Item Bought! 💰 | You bought [Qty]x [Item] for [Price] Silver. | When you buy a listing or your buy order is filled. |
| `push_character_death`| Character Defeated! 💀 | [Character] has been defeated by [Monster]. | When your character's health drops to 0 in combat. |
| `push_dungeon_complete`| Dungeon Complete! 🏰 | You have successfully explored [Dungeon Name]. | When a dungeon run or a full dungeon queue finishes. |
| `push_inventory_full` | Inventory Full! 🎒 | No more space! Free some space to continue looting. | When trying to add items to a filled inventory. |

---

## 🎮 In-Game Notifications
These appear as popups or log entries while you are playing the game.

| Type | Content Example | Trigger Condition |
| :--- | :--- | :--- |
| **SYSTEM** | 📜 Combat Summary <br> ⌛ 01:20:30 <br> 💰 500 Silver <br> ✨ 1200 XP | Appears after finishing combat, refining, gathering, or upon logging in after being offline. |
| **LEVEL_UP** | Your Attack skill raised to level 50! | Triggered whenever any skill level increases. |
| **QUEST** | **Quest Complete!** <br> You completed [Quest Title]. Return to the NPC... | Triggered when all requirements for an active quest are met. |
| **SUCCESS** | You have successfully listed the item on the market. | General confirmation for successful actions (Market, Inventory, Guild). |
| **ERROR** | Insufficient funds to buy this item. | Triggered when an action fails due to missing requirements or full inventory. |
| **QUEUE** | Starting queued task: Refining Iron Bar | Appears when the Action Queue automatically moves to the next item. |

---

## ⚙️ How Triggers Work
1. **Midnight UTC**: A scheduled service checks at midnight every day to reset daily activities (Spin, Boss, Guild Tasks) and sends notifications to all subscribed users.
2. **Real-time Events**: Managers (Market, Combat, Dungeon, etc.) detect state changes (like a sale or death) and immediately call the `PushManager` to notify the specific user.
3. **Queue System**: The `ActivityNotification` system calculates the exact time an action will finish and schedules a push notification to be sent at that future timestamp.
