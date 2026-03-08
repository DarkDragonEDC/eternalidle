import { ITEMS, ITEM_LOOKUP, resolveItem } from '../../shared/items.js';
import { getStoreItem } from '../../shared/orbStore.js';
import { INITIAL_SKILLS } from '../../shared/skills.js';

export class AdminManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async handleCommand(socket, command, args) {
        // PERMISSION CHECK
        const char = await this.gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (!char || !char.is_admin) return { success: false, error: "Permission denied." };

        console.log(`[ADMIN] Command '${command}' from ${socket.user.email || 'Guest'} with args:`, args);

        try {
            switch (command) {
                case 'give': return await this.cmdGive(socket, args);
                case 'heal': return await this.cmdHeal(socket, args);
                case 'add_orbs': return await this.cmdAddOrbs(socket, args);
                case 'add_crowns': return await this.cmdAddOrbs(socket, args); // Alias for backward compatibility during transition
                case 'xp': return await this.cmdAddXp(socket, args);
                case 'gxp': return await this.cmdAddGuildXp(socket, args);
                case 'gp': return await this.cmdAddGuildGP(socket, args);
                case 'resetdaily': return await this.cmdResetDaily(socket, args);
                case 'ban': return await this.cmdBan(socket, args);
                case 'title': return await this.cmdTitle(socket, args);
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

        console.log(`[ADMIN-DEBUG] cmdGive: itemId='${itemId}', typeof='${typeof itemId}', length=${itemId.length}, charCodes=${[...itemId].map(c => c.charCodeAt(0)).join(',')}`);

        const keys = Object.keys(ITEM_LOOKUP).length;
        const hasPotion = ITEM_LOOKUP['T1_POTION_DAMAGE'] !== undefined;

        const baseItem = resolveItem(itemId);
        console.log(`[ADMIN-DEBUG] resolveItem result:`, baseItem ? `Found: ${baseItem.name}` : 'NULL');
        if (!baseItem) return { success: false, error: `Invalid item ID: ${itemId} | DBG: keys=${keys}, hasBtn=${hasPotion}` };

        let customItem = null;
        let finalItemId = baseItem.id; // Use the resolved authentic ID, not the query param

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
        if (!char.state.skills[skill] && !INITIAL_SKILLS[skill]) return { success: false, error: `Invalid skill: ${skill}` };

        this.gameManager.addXP(char, skill, amount);
        await this.saveAndNotify(char);
        return { success: true, message: `Added ${amount} XP to ${skill} for ${char.name}.` };
    }

    async cmdAddGuildXp(socket, args) {
        let amount = parseInt(args[0]);
        if (isNaN(amount)) return { success: false, error: "Usage: /gxp [amount]" };

        const char = await this.resolveTarget(socket, 'me');
        if (!char.state.guild_id) return { success: false, error: "You are not in a guild." };

        // We use addExactGuildXP to bypass the memory batching and force a save
        await this.gameManager.guildManager.addExactGuildXP(char.state.guild_id, amount);
        return { success: true, message: `Added ${amount} XP directly to your guild.` };
    }

    async cmdAddGuildGP(socket, args) {
        let amount = parseInt(args[0]);
        if (isNaN(amount)) return { success: false, error: "Usage: /gp [amount]" };

        const char = await this.resolveTarget(socket, 'me');
        if (!char.state.guild_id) return { success: false, error: "You are not in a guild." };

        const { data: guild, error: gErr } = await this.gameManager.supabase
            .from('guilds')
            .select('guild_points')
            .eq('id', char.state.guild_id)
            .single();

        if (gErr || !guild) return { success: false, error: "Guild not found." };

        const newGP = BigInt(guild.guild_points || 0) + BigInt(amount);
        await this.gameManager.supabase
            .from('guilds')
            .update({ guild_points: newGP.toString() })
            .eq('id', char.state.guild_id);

        return { success: true, message: `Added ${amount} GP to your guild. Total: ${newGP.toString()}` };
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

        // Push the update back to the client immediately
        this.gameManager.broadcastToCharacter(char.id, 'daily_status', { canSpin: true });

        return { success: true, message: `Reset Daily Spin cooldown for ${char.name} (Account-wide).` };
    }

    async cmdBan(socket, args) {
        // Usage: /ban [player_name] [reason...]
        if (args.length < 2) {
            return { success: false, error: "Usage: /ban [player_name] [reason]" };
        }

        const targetName = args[0];
        const reason = args.slice(1).join(' ');

        try {
            const char = await this.resolveTarget(socket, targetName);
            const userId = char.user_id;

            const result = await this.gameManager.applyBan(userId, reason, char.name);
            if (result.success) {
                // If it's a block level (2 or 3), disconnect all sockets of that user
                if (result.level >= 2) {
                    this.gameManager.broadcastToUser(userId, 'ban_error', {
                        type: 'BANNED',
                        message: result.level === 3 ? `Permanently banned: ${reason}` : `Temporarily banned (24h): ${reason}`,
                        level: result.level,
                        reason: reason,
                        remaining: result.level === 2 ? 24 : null
                    });
                } else {
                    // Level 1: Notify all user's tabs immediately
                    this.gameManager.broadcastToUser(userId, 'account_status', { banWarning: reason });
                }

                return { success: true, message: `Applied level ${result.level} ban to ${char.name}.` };
            } else {
                return { success: false, error: result.error };
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async cmdTitle(socket, args) {
        // Usage: /title [target?] [title...]
        let targetName, title;

        if (args.length < 1) {
            return { success: false, error: "Usage: /title [player?] [title]" };
        }

        // Logic similar to cmdGive/cmdAddXp for target resolution
        if (args.length >= 2) {
            // Check if first arg is likely a target or part of title
            // For /title, we usually expect a target if there are 2+ parts
            // But title can be multiple words.
            // Let's assume: if there are 2+ args, first is target if it's 'me' or if 2nd arg exists.
            // Actually, let's keep it simple: /title [player] [title]
            // If only 1 arg, target is 'me'.
            if (args.length === 1) {
                targetName = 'me';
                title = args[0];
            } else {
                targetName = args[0];
                title = args.slice(1).join(' ');
            }
        } else {
            targetName = 'me';
            title = args[0];
        }

        const char = await this.resolveTarget(socket, targetName);

        if (!char.state.unlockedTitles) char.state.unlockedTitles = [];

        if (char.state.unlockedTitles.includes(title)) {
            return { success: false, error: `${char.name} already has the title: ${title}` };
        }

        char.state.unlockedTitles.push(title);
        await this.saveAndNotify(char);

        return { success: true, message: `Granted title '${title}' to ${char.name}.` };
    }

    async cmdHelp(socket) {
        return {
            success: true,
            message: "Commands: /give, /heal, /add_orbs, /xp, /gxp, /gp, /title, /ban, /resetdaily. (Optional target argument supported)"
        };
    }

    async saveAndNotify(char) {
        await this.gameManager.saveState(char.id, char.state);
        this.gameManager.markDirty(char.id);
    }
}
