import { formatNumber } from "../../utils/format.js";

export const registerInventoryHandlers = (socket, gameManager, io) => {
  const COMBAT_GEAR_TYPES = ["WEAPON", "ARMOR", "HELMET", "BOOTS", "GLOVES", "CAPE", "OFF_HAND"];
  const FARM_TOOL_TYPES = ["TOOL", "TOOL_AXE", "TOOL_PICKAXE", "TOOL_KNIFE", "TOOL_SICKLE", "TOOL_ROD", "TOOL_POUCH"];
  const COMBAT_GEAR_SLOTS = ["mainHand", "offHand", "chest", "helmet", "boots", "gloves", "cape"];
  const FARM_TOOL_SLOTS = ["tool", "tool_axe", "tool_pickaxe", "tool_knife", "tool_sickle", "tool_rod", "tool_pouch"];

  function checkEquipmentLock(char, itemType, itemId) {
    const inCombat = !!char.state?.combat || !!char.state?.dungeon;
    const isFarming = !!char.current_activity;
    if (itemType === "FOOD") return null;
    if (inCombat) {
      if (COMBAT_GEAR_TYPES.includes(itemType)) return "Cannot change gear during combat! Flee or finish first.";
      if (itemType === "RUNE" && itemId && itemId.includes("_COMBAT_")) return "Cannot change combat runes during combat! Flee or finish first.";
    }
    if (isFarming) {
      if (FARM_TOOL_TYPES.includes(itemType)) return "Cannot change tools during an activity! Stop the activity first.";
      if (itemType === "RUNE" && itemId && (itemId.includes("_GATHERING_") || itemId.includes("_REFINING_") || itemId.includes("_TOOLS_"))) return "Cannot change farm runes during an activity! Stop the activity first.";
    }
    return null;
  }

  function checkEquipmentLockBySlot(char, slot) {
    const inCombat = !!char.state?.combat || !!char.state?.dungeon;
    const isFarming = !!char.current_activity;
    if (slot === "food") return null;
    if (inCombat) {
      if (COMBAT_GEAR_SLOTS.includes(slot)) return "Cannot change gear during combat! Flee or finish first.";
      if (slot.startsWith("rune_COMBAT_")) return "Cannot change combat runes during combat! Flee or finish first.";
    }
    if (isFarming) {
      if (FARM_TOOL_SLOTS.includes(slot)) return "Cannot change tools during an activity! Stop the activity first.";
      if (slot.startsWith("rune_GATHERING_") || slot.startsWith("rune_REFINING_") || slot.startsWith("rune_TOOLS_")) return "Cannot change farm runes during an activity! Stop the activity first.";
    }
    return null;
  }

  socket.on("equip_item", async ({ itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char) {
          const item = gameManager.inventoryManager.resolveItem(itemId);
          if (item) {
            const lockError = checkEquipmentLock(char, item.type, itemId);
            if (lockError) return socket.emit("action_result", { success: false, message: lockError });
          }
        }
        const result = await gameManager.equipItem(socket.user.id, socket.data.characterId, itemId, quantity);
        socket.emit("item_equipped", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("unequip_item", async ({ slot }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char) {
          const lockError = checkEquipmentLockBySlot(char, slot);
          if (lockError) return socket.emit("action_result", { success: false, message: lockError });
        }
        const result = await gameManager.unequipItem(socket.user.id, socket.data.characterId, slot);
        socket.emit("item_unequipped", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("switch_equipment_set", async ({ setIndex }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char && (char.state?.combat || char.state?.dungeon || char.current_activity)) {
          return socket.emit("action_result", { success: false, message: "Cannot switch equipment sets during an activity!" });
        }
        const result = await gameManager.inventoryManager.switchEquipmentSet(socket.user.id, socket.data.characterId, setIndex);
        socket.emit("equipment_set_switched", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("unlock_equipment_set", async ({ setIndex }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.inventoryManager.unlockEquipmentSet(socket.user.id, socket.data.characterId, setIndex);
        socket.emit("equipment_set_unlocked", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("sell_item", async ({ itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.sellItem(socket.user.id, socket.data.characterId, itemId, quantity);
        socket.emit("item_sold", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("dismantle_item", async ({ itemId, quantity = 1 }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.dismantleItem(socket.user.id, socket.data.characterId, itemId, quantity);
        socket.emit("item_dismantled", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("use_item", async ({ itemId, quantity = 1 }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.consumeItem(socket.user.id, socket.data.characterId, itemId, quantity);
        socket.emit("item_used", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, false, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("deposit_to_bank", async ({ itemId, quantity = 1 }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (!char) throw new Error("Character not found");
        if (!char.state.bank) char.state.bank = { items: {}, slots: 10 };
        const bank = char.state.bank;
        if (!bank.items) bank.items = {};
        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;
        const entry = inv[itemId];
        if (!entry) throw new Error("You don't have this item");
        const availableQty = typeof entry === "object" ? entry.amount || 0 : Number(entry) || 0;
        if (availableQty < 1) throw new Error("You don't have enough of this item");
        const qty = Math.min(quantity, availableQty);
        const usedBankSlots = Object.keys(bank.items || {}).filter(k => {
          const e = bank.items[k];
          return typeof e === "object" ? (e.amount || 0) > 0 : (Number(e) || 0) > 0;
        }).length;
        const bankEntry = bank.items[itemId];
        const isNewSlot = !bankEntry || (typeof bankEntry === "object" ? (bankEntry.amount || 0) <= 0 : (Number(bankEntry) || 0) <= 0);
        if (isNewSlot && usedBankSlots >= (bank.slots || 10)) {
          return socket.emit("action_result", { success: false, message: `Bank is full! (${usedBankSlots}/${bank.slots || 10} slots)` });
        }
        let metadata = null;
        if (typeof entry === "object") { metadata = { ...entry }; delete metadata.amount; }
        if (typeof entry === "object") { entry.amount = (entry.amount || 0) - qty; if (entry.amount <= 0) delete inv[itemId]; }
        else { inv[itemId] = (Number(inv[itemId]) || 0) - qty; if (inv[itemId] <= 0) delete inv[itemId]; }
        if (metadata) {
          if (!bank.items[itemId] || typeof bank.items[itemId] !== "object") {
            const currentBankQty = Number(bank.items[itemId]) || 0;
            bank.items[itemId] = { amount: currentBankQty };
          }
          Object.assign(bank.items[itemId], metadata);
          bank.items[itemId].amount = (bank.items[itemId].amount || 0) + qty;
        } else {
          if (typeof bank.items[itemId] === "object") bank.items[itemId].amount = (bank.items[itemId].amount || 0) + qty;
          else bank.items[itemId] = (Number(bank.items[itemId]) || 0) + qty;
        }
        gameManager.markDirty(char.id);
        socket.emit("action_result", { success: true, message: `Deposited ${qty}x ${itemId} to bank.` });
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, false, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("withdraw_from_bank", async ({ itemId, quantity = 1 }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (!char) throw new Error("Character not found");
        if (!char.state.bank) char.state.bank = { items: {}, slots: 10 };
        const bank = char.state.bank;
        if (!bank.items) bank.items = {};
        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;
        const bankEntry = bank.items[itemId];
        if (!bankEntry) throw new Error("Item not found in bank");
        const bankQty = typeof bankEntry === "object" ? bankEntry.amount || 0 : Number(bankEntry) || 0;
        if (bankQty < 1) throw new Error("You don't have enough of this item in the bank");
        const qty = Math.min(quantity, bankQty);
        const invManager = gameManager.inventoryManager;
        const entryInInv = inv[itemId];
        const isNewInvSlot = !entryInInv || (typeof entryInInv === "object" ? (entryInInv.amount || 0) <= 0 : (Number(entryInInv) || 0) <= 0);
        const itemData = invManager.resolveItem(itemId);
        if (isNewInvSlot && itemData && !itemData.noInventorySpace) {
          if (invManager.getUsedSlots(char) >= invManager.getMaxSlots(char)) {
            return socket.emit("action_result", { success: false, message: "Inventory is full!" });
          }
        }
        let metadata = null;
        if (typeof bankEntry === "object") { metadata = { ...bankEntry }; delete metadata.amount; }
        if (typeof bankEntry === "object") { bankEntry.amount = (bankEntry.amount || 0) - qty; if (bankEntry.amount <= 0) delete bank.items[itemId]; }
        else { bank.items[itemId] = (Number(bank.items[itemId]) || 0) - qty; if (bank.items[itemId] <= 0) delete bank.items[itemId]; }

        if (metadata) {
          if (!inv[itemId] || typeof inv[itemId] !== "object") {
            const currentInvQty = Number(inv[itemId]) || 0;
            inv[itemId] = { amount: currentInvQty };
          }
          Object.assign(inv[itemId], metadata);
          inv[itemId].amount = (inv[itemId].amount || 0) + qty;
        } else {
          if (typeof inv[itemId] === "object") inv[itemId].amount = (inv[itemId].amount || 0) + qty;
          else inv[itemId] = (Number(inv[itemId]) || 0) + qty;
        }
        gameManager.markDirty(char.id);
        socket.emit("action_result", { success: true, message: `Withdrew ${qty}x ${itemId} from bank.` });
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, false, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("buy_bank_slot", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (!char) throw new Error("Character not found");
        if (!char.state.bank) char.state.bank = { items: {}, slots: 10 };
        const bank = char.state.bank;
        const currentSlots = bank.slots || 10;
        if (currentSlots >= 50) return socket.emit("action_result", { success: false, message: "Bank is already at maximum capacity (50 slots)!" });
        const cost = 10000 + (currentSlots - 10) * 5000;
        const silver = char.state.silver || 0;
        if (silver < cost) {
          return socket.emit("action_result", { success: false, message: `Not enough Silver! Need ${formatNumber(cost)} (you have ${formatNumber(silver)})` });
        }
        char.state.silver -= cost;
        bank.slots = currentSlots + 1;
        gameManager.markDirty(char.id);
        socket.emit("action_result", { success: true, message: `Bank expanded to ${bank.slots} slots! (-${formatNumber(cost)} Silver)` });
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, false, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("craft_rune", async ({ shardId, qty = 1, category = "GATHERING" }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.craftRune(socket.user.id, socket.data.characterId, shardId, qty, category);
        if (result.success) {
          socket.emit("craft_rune_success", result);
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        } else socket.emit("error", { message: result.error });
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("upgrade_rune", async ({ runeId, qty = 1 }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.upgradeRune(socket.user.id, socket.data.characterId, runeId, qty);
        if (result.success) {
          socket.emit("craft_rune_success", result);
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        } else socket.emit("error", { message: result.error });
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("auto_merge_runes", async ({ filters = {} } = {}) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.autoMergeRunes(socket.user.id, socket.data.characterId, filters);
        socket.emit("craft_rune_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("unequip_all_runes", async ({ type }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char) {
          const inCombat = !!char.state?.combat || !!char.state?.dungeon;
          const isFarming = !!char.current_activity;
          if (inCombat && type?.toUpperCase() === "COMBAT") return socket.emit("action_result", { success: false, message: "Cannot change combat runes during combat!" });
          if (isFarming && ["GATHERING", "REFINING", "TOOLS"].includes(type?.toUpperCase())) return socket.emit("action_result", { success: false, message: "Cannot change farm runes during an activity!" });
        }
        const result = await gameManager.inventoryManager.unequipAllRunes(socket.user.id, socket.data.characterId, type);
        if (result.success) {
          socket.emit("action_success", { message: `Unequipped all ${type} runes.` });
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("auto_equip_runes", async ({ type }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (char) {
          const inCombat = !!char.state?.combat || !!char.state?.dungeon;
          const isFarming = !!char.current_activity;
          if (inCombat && type?.toUpperCase() === "COMBAT") return socket.emit("action_result", { success: false, message: "Cannot change combat runes during combat!" });
          if (isFarming && ["GATHERING", "REFINING", "TOOLS"].includes(type?.toUpperCase())) return socket.emit("action_result", { success: false, message: "Cannot change farm runes during an activity!" });
        }
        const result = await gameManager.inventoryManager.autoEquipRunes(socket.user.id, socket.data.characterId, type);
        if (result.success) {
          socket.emit("action_success", { message: `Auto-equipped best ${type} runes.` });
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("enhance_item", async ({ itemStorageKey, stoneStorageKey }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.inventoryManager.enhanceItem(socket.user.id, socket.data.characterId, itemStorageKey, stoneStorageKey);
        socket.emit("item_enhanced", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });
};
