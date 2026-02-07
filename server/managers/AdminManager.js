import { ITEMS } from '../../shared/items.js';
import { getStoreItem } from '../../shared/crownStore.js';

export class AdminManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async handleCommand(socket, command, args) {
        // PERMISSION CHECK
        const ALLOWED_ADMINS = ['5093ffaa-4770-4123-a83b-fca97a30601b'];
        if (!ALLOWED_ADMINS.includes(socket.user.id)) return { success: false, error: "Permission denied." };

        console.log(`[ADMIN] Command '${command}' from ${socket.user.email} with args:`, args);

        try {
            switch (command) {
                case 'give': return await this.cmdGive(socket, args);
                case 'heal': return await this.cmdHeal(socket, args);
                case 'add_crowns': return await this.cmdAddCrowns(socket, args);
                case 'xp': return await this.cmdAddXp(socket, args);
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

        // Search for character by name (case-insensitive)
        const { data, error } = await this.gameManager.supabase
            .from('characters')
            .select('*')
            .ilike('name', targetName)
            .maybeSingle();

        if (error || !data) throw new Error(`Player '${targetName}' not found.`);

        // Hydrate state just in case we need to modify it
        // Note: If the player is ONLINE, we should try to find them in the GameManager cache first to edit "hot" memory
        // But getCharacter handles cache lookup by ID. We found ID via DB.
        // So we call getCharacter with the found ID.
        return await this.gameManager.getCharacter(data.user_id, data.id);
    }

    async cmdGive(socket, args) {
        // Usage: /give [target?] [itemId] [qty]
        // Examples: 
        // /give gold 100 -> gives self 100 gold
        // /give PlayerTwo gold 100 -> gives PlayerTwo 100 gold

        let targetName, itemId, qty;

        // Primitive parsing logic
        if (args.length === 2) {
            // /give [itemId] [qty] (Target = Self)
            targetName = 'me';
            itemId = args[0];
            qty = parseInt(args[1]);
        } else if (args.length === 3) {
            // /give [target] [itemId] [qty]
            targetName = args[0];
            itemId = args[1];
            qty = parseInt(args[2]);
        } else {
            return { success: false, error: "Usage: /give [player?] [item] [qty]" };
        }

        if (isNaN(qty) || qty <= 0) return { success: false, error: "Invalid quantity." };

        const char = await this.resolveTarget(socket, targetName);

        // Handle Gold specifically
        if (itemId.toLowerCase() === 'gold' || itemId.toLowerCase() === 'silver') { // internally 'silver' but users might say 'gold'
            char.state.silver = (char.state.silver || 0) + qty;
            await this.saveAndNotify(char);
            return { success: true, message: `Gave ${qty} Silver to ${char.name}.` };
        }

        // Validate Item
        const storeItem = getStoreItem(itemId);
        if (storeItem) {
            // It's a store item (like MEMBERSHIP)
            if (storeItem.category === 'MEMBERSHIP') {
                // For membership, we might want to activate it directly OR give the item if it exists as an inventory item
                // The system seems to treat MEMBERSHIP as an item that invites activation on use, or auto-activates?
                // Based on previous grep, adding 'MEMBERSHIP' to inventory works and client handles it?
                // Or we should assume it's just an item 'MEMBERSHIP' with quantity.
                this.gameManager.inventoryManager.addItemToInventory(char, itemId, qty);
                await this.saveAndNotify(char);
                return { success: true, message: `Gave ${qty}x ${storeItem.name} (Store Item) to ${char.name}.` };
            }
            // For packages/other store items that are virtual, we might need specific handling, but for now treat as item
            this.gameManager.inventoryManager.addItemToInventory(char, itemId, qty);
            await this.saveAndNotify(char);
            return { success: true, message: `Gave ${qty}x ${storeItem.name} (Store Item) to ${char.name}.` };
        }

        if (!ITEMS[itemId]) return { success: false, error: `Invalid item ID: ${itemId}` };

        this.gameManager.inventoryManager.addItemToInventory(char, itemId, qty);
        await this.saveAndNotify(char);
        return { success: true, message: `Gave ${qty}x ${ITEMS[itemId].name} to ${char.name}.` };
    }

    async cmdAddCrowns(socket, args) {
        // Usage: /add_crowns [target?] [amount]
        let targetName, amount;

        if (args.length === 1) {
            targetName = 'me';
            amount = parseInt(args[0]);
        } else if (args.length === 2) {
            targetName = args[0];
            amount = parseInt(args[1]);
        } else {
            return { success: false, error: "Usage: /add_crowns [player?] [amount]" };
        }

        if (isNaN(amount)) return { success: false, error: "Invalid amount." };

        const char = await this.resolveTarget(socket, targetName);
        this.gameManager.crownsManager.addCrowns(char, amount, 'ADMIN_CMD');
        await this.saveAndNotify(char);
        return { success: true, message: `Added ${amount} Crowns to ${char.name}.` };
    }

    async cmdHeal(socket, args) {
        // Usage: /heal [target?]
        let targetName = args[0] || 'me';
        const char = await this.resolveTarget(socket, targetName);

        char.state.health = char.state.maxHealth;
        await this.saveAndNotify(char);
        return { success: true, message: `Healed ${char.name} to full health.` };
    }

    async cmdAddXp(socket, args) {
        // Usage: /xp [target?] [skill] [amount]
        // Ex: /xp MINING 500  or  /xp PlayerTwo MINING 500

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

        this.gameManager.inventoryManager.addXP(char, skill, amount);
        await this.saveAndNotify(char);
        return { success: true, message: `Added ${amount} XP to ${skill} for ${char.name}.` };
    }

    async cmdHelp(socket) {
        return {
            success: true,
            message: "Commands: /give, /heal, /add_crowns, /xp. (Optional target argument supported)"
        };
    }

    async saveAndNotify(char) {
        // Save state
        await this.gameManager.saveState(char.id, char.state);

        // Notify the target player immediately if they are online
        // We find the socket associated with this user/char via the connectedSockets map in index.js
        // BUT, since we don't have direct access to 'io' or 'connectedSockets' here easily without passing them down,
        // we can rely on `getStatus` broadcasting if the user is the one who triggered it.
        // For remote formatting, we relies on the Ticker to pick up changes or we force a push?

        // Actually best way: The `handleCommand` return value is sent to the ADMIN. 
        // The TARGET needs a status, update.
        // We can access 'gameManager' which has methods to broadcast updates ideally, OR
        // we assume the Ticker (1s loop) will pick up the state change and broadcast it, 
        // but for instantaneous feedback we might want to force it.

        // Let's force a dirty mark so Ticker saves it, but for UI update:
        this.gameManager.markDirty(char.id);
    }
}
