import { ITEMS, resolveItem } from '../../shared/items.js';
import { getStoreItem } from '../../shared/orbStore.js';

export class AdminManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async handleCommand(socket, command, args) {
        // PERMISSION CHECK
        const ALLOWED_ADMINS = ['5093ffaa-4770-4123-a83b-fca97a30601b', 'eea1abae-badf-4043-a3bf-1a18f4143dd2'];
        if (!ALLOWED_ADMINS.includes(socket.user.id)) return { success: false, error: "Permission denied." };

        console.log(`[ADMIN] Command '${command}' from ${socket.user.email || 'Guest'} with args:`, args);

        try {
            switch (command) {
                case 'give': return await this.cmdGive(socket, args);
                case 'heal': return await this.cmdHeal(socket, args);
                case 'add_orbs': return await this.cmdAddOrbs(socket, args);
                case 'add_crowns': return await this.cmdAddOrbs(socket, args); // Alias for backward compatibility during transition
                case 'xp': return await this.cmdAddXp(socket, args);
                case 'resetdaily': return await this.cmdResetDaily(socket, args);
                case 'help': return await this.cmdHelp(socket);
                default: return { success: false, error: "Unknown command. Type /help." };
            }
        } catch (err) {
            console.error(`[ADMIN] Error executing ${command}:`, err);
            return { success: false, error: err.message };
        }
    }

    // Helper to resolve target (Self or Other by Name)
    async resolveTarget(socket, targetName) {
        if (!targetName || targetName.toLowerCase() === 'me') {
            return await this.gameManager.getCharacter(socket.user.id, socket.data.characterId);
        }

        const { data, error } = await this.gameManager.supabase
            .from('characters')
            .select('*')
            .ilike('name', targetName)
            .maybeSingle();

        if (error || !data) throw new Error(`Player '${targetName}' not found.`);

        return await this.gameManager.getCharacter(data.user_id, data.id);
    }

    async cmdGive(socket, args) {
        let targetName, itemId, qty, quality, signature;

        let startIndex = 0;
        if (args.length >= 2) {
            const likelyTarget = args[0];
            let isTarget = (likelyTarget.toLowerCase() === 'me');
            if (!isTarget) {
                if (args.length === 3) isTarget = true;
                if (args.length >= 4 && isNaN(parseInt(args[1]))) isTarget = true;
            }

            if (isTarget) {
                targetName = args[0];
                itemId = args[1];
                qty = parseInt(args[2]);
                startIndex = 3;
            } else {
                targetName = 'me';
                itemId = args[0];
                qty = parseInt(args[1]);
                startIndex = 2;
            }
        } else {
            return { success: false, error: "Usage: /give [player?] [item] [qty] [quality?] [signature?]" };
        }

        if (args.length > startIndex) quality = parseInt(args[startIndex]);
        if (args.length > startIndex + 1) signature = args.slice(startIndex + 1).join(' ');

        if (isNaN(qty) || qty <= 0) return { success: false, error: "Invalid quantity." };

        const char = await this.resolveTarget(socket, targetName);

        if (itemId.toLowerCase() === 'gold' || itemId.toLowerCase() === 'silver') {
            char.state.silver = (char.state.silver || 0) + qty;
            await this.saveAndNotify(char);
            return { success: true, message: `Gave ${qty} Silver to ${char.name}.` };
        }

        const storeItem = getStoreItem(itemId);
        if (storeItem) {
            this.gameManager.inventoryManager.addItemToInventory(char, itemId, qty);
            await this.saveAndNotify(char);
            return { success: true, message: `Gave ${qty}x ${storeItem.name} (Store Item) to ${char.name}.` };
        }

        const baseItem = resolveItem(itemId);
        if (!baseItem) return { success: false, error: `Invalid item ID: ${itemId}` };

        let customItem = null;
        let finalItemId = itemId;

        if (quality !== undefined || signature) {
            customItem = { ...baseItem };

            if (quality !== undefined && !isNaN(quality)) {
                customItem.quality = quality;
                if (quality > 0 && !finalItemId.includes('_Q')) {
                    finalItemId += `_Q${quality}`;
                }
            }

            if (signature) {
                customItem.craftedBy = signature;
            }
            if (customItem.craftedBy) {
                customItem.craftedAt = new Date().toISOString();
            }
        }

        const added = this.gameManager.inventoryManager.addItemToInventory(char, finalItemId, qty, customItem);
        if (!added) return { success: false, error: "Failed to add item. Inventory likely full." };

        await this.saveAndNotify(char);

        let msg = `Gave ${qty}x ${baseItem.name}`;
        if (quality !== undefined) msg += ` (Q${quality})`;
        if (signature) msg += ` signed by ${signature}`;
        msg += ` to ${char.name}.`;

        return { success: true, message: msg };
    }

    async cmdAddOrbs(socket, args) {
        // Usage: /add_orbs [target?] [amount]
        let targetName, amount;

        if (args.length === 1) {
            targetName = 'me';
            amount = parseInt(args[0]);
        } else if (args.length === 2) {
            targetName = args[0];
            amount = parseInt(args[1]);
        } else {
            return { success: false, error: "Usage: /add_orbs [player?] [amount]" };
        }

        if (isNaN(amount)) return { success: false, error: "Invalid amount." };

        const char = await this.resolveTarget(socket, targetName);
        this.gameManager.orbsManager.addOrbs(char, amount, 'ADMIN_CMD');
        await this.saveAndNotify(char);
        return { success: true, message: `Added ${amount} Orbs to ${char.name}.` };
    }

    async cmdHeal(socket, args) {
        let targetName = args[0] || 'me';
        const char = await this.resolveTarget(socket, targetName);

        char.state.health = char.state.maxHealth;
        await this.saveAndNotify(char);
        return { success: true, message: `Healed ${char.name} to full health.` };
    }

    async cmdAddXp(socket, args) {
        let targetName, skill, amount;
        if (args.length === 2) {
            targetName = 'me';
            skill = args[0].toUpperCase();
            amount = parseInt(args[1]);
        } else if (args.length === 3) {
            targetName = args[0];
            skill = args[1].toUpperCase();
            amount = parseInt(args[2]);
        } else {
            return { success: false, error: "Usage: /xp [player?] [skill] [amount]" };
        }

        if (isNaN(amount)) return { success: false, error: "Invalid amount." };

        const char = await this.resolveTarget(socket, targetName);
        if (!char.state.skills[skill]) return { success: false, error: `Invalid skill: ${skill}` };

        this.gameManager.addXP(char, skill, amount);
        await this.saveAndNotify(char);
        return { success: true, message: `Added ${amount} XP to ${skill} for ${char.name}.` };
    }

    async cmdResetDaily(socket, args) {
        let targetName = args[0] || 'me';
        const char = await this.resolveTarget(socket, targetName);

        const { error } = await this.gameManager.supabase
            .from('daily_rewards')
            .delete()
            .eq('user_id', char.user_id);

        if (error) {
            return { success: false, error: "Failed to reset daily spin: " + error.message };
        }

        return { success: true, message: `Reset Daily Spin cooldown for ${char.name} (Account-wide).` };
    }

    async cmdHelp(socket) {
        return {
            success: true,
            message: "Commands: /give, /heal, /add_orbs, /xp. (Optional target argument supported)"
        };
    }

    async saveAndNotify(char) {
        await this.gameManager.saveState(char.id, char.state);
        this.gameManager.markDirty(char.id);
    }
}
