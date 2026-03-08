import { calculateGuildNextLevelXP, GUILD_BUILDINGS, GUILD_TASKS_CONFIG, UPGRADE_COSTS, calculateMaterialNeeds } from '../../shared/guilds.js';
import { resolveItem, calculateItemSellPrice } from '../../shared/items.js';

export class GuildManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;

        // Memory buffer for 10% fractional XP gained by members
        this.pendingGuildXP = {}; // { guild_id: 15.23 }

        // Flush memory to DB every 30 minutes
        setInterval(() => {
            this.flushGuildXP().catch(e => console.error("[GUILD_XP] Flush error:", e));
        }, 30 * 60 * 1000);
    }

    async createGuild(char, { name, tag, summary, icon, iconColor, bgColor, paymentMethod, countryCode }) {
        if (!char) throw new Error("Character not found");

        // 1. Basic Validation
        const cleanName = (name || "").trim();
        const cleanTag = (tag || "").toUpperCase().trim();

        if (cleanName.length < 3 || cleanName.length > 15) throw new Error("Guild Name must be 3-15 characters");
        if (cleanTag.length < 2 || cleanTag.length > 4) throw new Error("Guild Tag must be 2-4 characters");
        if (!/^[a-zA-Z0-9 ]+$/.test(cleanName)) throw new Error("Guild Name contains invalid characters");
        if (!/^[A-Z0-9]+$/.test(cleanTag)) throw new Error("Guild Tag contains invalid characters");

        // 2. Check if name/tag taken
        const { data: existingName } = await this.supabase.from('guilds').select('id').eq('name', cleanName).maybeSingle();
        if (existingName) throw new Error("Guild Name already taken");

        const { data: existingTag } = await this.supabase.from('guilds').select('id').eq('tag', cleanTag).maybeSingle();
        if (existingTag) throw new Error("Guild Tag already taken");

        // 3. Check if character already in a guild
        const { data: existingMember } = await this.supabase.from('guild_members').select('guild_id').eq('character_id', char.id).maybeSingle();
        if (existingMember) throw new Error("You are already in a guild");

        // 4. Payment Deduction
        const costs = {
            SILVER: 500000, // 500k
            ORBS: 100
        };

        const method = (paymentMethod || "").toUpperCase();
        if (method === 'SILVER') {
            if ((char.state.silver || 0) < costs.SILVER) throw new Error("Insufficient Silver");
            char.state.silver -= costs.SILVER;
        } else if (method === 'ORBS' || method === 'ORB') {
            if ((char.state.orbs || 0) < costs.ORBS) throw new Error("Insufficient Orbs");
            char.state.orbs -= costs.ORBS;
        } else {
            throw new Error("Invalid payment method");
        }

        // 5. Create Guild in DB
        const { data: guild, error: guildError } = await this.supabase
            .from('guilds')
            .insert({
                name: cleanName,
                tag: cleanTag,
                summary: summary || "",
                icon: icon || "Shield",
                icon_color: iconColor || "#FFD700",
                bg_color: bgColor || "#1a1a1a",
                leader_id: char.id,
                country_code: countryCode || null
            })
            .select()
            .single();

        if (guildError) {
            console.error("[GUILD] Error creating guild record:", guildError);
            throw new Error("Internal server error during guild creation");
        }

        // 6. Add Leader to Members table
        const { error: memberError } = await this.supabase
            .from('guild_members')
            .insert({
                guild_id: guild.id,
                character_id: char.id,
                role: 'LEADER'
            });

        if (memberError) {
            console.error("[GUILD] Error adding leader member:", memberError);
            // Cleanup: delete guild if member insert fails (manual rollback)
            await this.supabase.from('guilds').delete().eq('id', guild.id);
            throw new Error("Internal server error during membership setup");
        }

        // 7. Update Character cache and persist
        char.state.guild_id = guild.id; // Optional: back-reference in state for fast checks
        this.gameManager.markDirty(char.id);
        await this.gameManager.persistCharacter(char.id);

        console.log(`[GUILD] Guild Created: ${cleanName} [${cleanTag}] by ${char.name}`);

        return {
            success: true,
            guild: guild
        };
    }

    async updateCustomization(char, { icon, iconColor, bgColor, countryCode }) {
        if (!char) throw new Error("Character data required");

        // 1. Find character's guild membership
        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) throw new Error("Character is not in a guild");

        // 2. Check permissions
        const hasPerm = await this.hasPermission(char.id, 'edit_appearance');
        if (!hasPerm) {
            throw new Error("You don't have permission to update guild customization");
        }

        // 3. Update the guild
        const { data: updatedGuild, error: updateError } = await this.supabase
            .from('guilds')
            .update({
                icon: icon || 'Shield',
                icon_color: iconColor || '#ffffff',
                bg_color: bgColor || '#1a1a1a',
                country_code: countryCode || null
            })
            .eq('id', member.guild_id)
            .select()
            .single();

        if (updateError) {
            console.error("[GUILD] Error updating customization:", updateError);
            throw new Error("Failed to update guild customization");
        }

        return {
            success: true,
            guild: updatedGuild
        };
    }

    async getCharacterGuild(characterId) {
        if (!characterId) return null;

        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', characterId)
            .maybeSingle();

        if (memberError || !member) return null;

        const { data: guild, error: guildError } = await this.supabase
            .from('guilds')
            .select('*')
            .eq('id', member.guild_id)
            .single();

        if (guildError || !guild) return null;

        // --- SYNC GUILD ID IN STATE ---
        // This fixed the common "You must be in a guild" error when state is out of sync
        const char = this.gameManager.cache.get(characterId);
        if (char && char.state && char.state.guild_id !== member.guild_id) {
            console.log(`[GUILD-SYNC] Updating missing/wrong guild_id in state for ${char.name}`);
            char.state.guild_id = member.guild_id;
            this.gameManager.markDirty(char.id);
            // Do not block - let it save in background
            this.gameManager.persistCharacter(char.id).catch(e => console.error("[GUILD-SYNC] Persist error:", e));
        }
        // ----------------------------

        // Fetch other members
        const { data: members } = await this.supabase
            .from('guild_members')
            .select(`
                role,
                joined_at,
                donated_xp,
                donated_silver,
                donated_items_value,
                characters (
                    id,
                    name,
                    state,
                    skills
                )
            `)
            .eq('guild_id', guild.id);

        const maxMembers = 10 + (guild.guild_hall_level || 0) * 2;

        return {
            ...guild,
            maxMembers,
            myMemberId: characterId,
            myRole: member.role,
            members: members.map(m => {
                const charId = m.characters.id;
                const isOnline = this.gameManager.cache.has(charId);
                // Use cached (live) state for online members, DB state for offline
                const cachedChar = isOnline ? this.gameManager.cache.get(charId) : null;
                const dbChar = m.characters;
                const state = cachedChar?.state || { ...dbChar.state, skills: dbChar.skills };
                return {
                    id: charId,
                    name: m.characters.name,
                    role: m.role,
                    joinedAt: m.joined_at,
                    donatedXP: m.donated_xp || 0,
                    donatedSilver: Number(m.donated_silver || 0),
                    donatedItemsValue: Number(m.donated_items_value || 0),
                    level: this._calculateCharLevel(state),
                    avatar: state.avatar || dbChar.avatar || '/profile/1 - male.png'
                };
            }),
            nextLevelXP: calculateGuildNextLevelXP(guild.level || 1)
        };
    }

    async searchGuilds(query, countryCode = null, characterId = null) {
        const cleanQuery = (query || "").trim();

        let queryBuilder = this.supabase.from('guilds').select('*');

        if (countryCode) {
            queryBuilder = queryBuilder.eq('country_code', countryCode);
        }

        // If query is too short, return empty or some featured guilds
        // For now, let's just search if 2+ chars
        if (cleanQuery.length < 2) {
            // Return top 10 guilds
            const { data, error } = await queryBuilder
                .limit(10);

            if (error) throw error;
            return data || [];
        }

        const { data, error } = await queryBuilder
            .or(`name.ilike.%${cleanQuery}%,tag.ilike.%${cleanQuery}%`)
            .limit(20);

        if (error) throw error;

        let guilds = data || [];

        // If characterId is provided, check for pending applications
        if (characterId && guilds.length > 0) {
            const guildIds = guilds.map(g => g.id);
            const { data: requests, error: reqErr } = await this.supabase
                .from('guild_requests')
                .select('guild_id')
                .eq('character_id', characterId)
                .in('guild_id', guildIds)
                .eq('status', 'PENDING');

            if (!reqErr && requests) {
                const pendingGuildIds = new Set(requests.map(r => r.guild_id));
                guilds = guilds.map(g => ({
                    ...g,
                    my_request_pending: pendingGuildIds.has(g.id)
                }));
            }
        }

        return guilds;
    }

    async leaveGuild(char) {
        if (!char) throw new Error("Character not found");

        // 1. Find membership
        const { data: membership, error: memErr } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memErr || !membership) throw new Error("You are not in a guild");

        const guildId = membership.guild_id;

        // 2. If leader, check if there are other members
        if (membership.role === 'LEADER') {
            const { count } = await this.supabase
                .from('guild_members')
                .select('*', { count: 'exact', head: true })
                .eq('guild_id', guildId);

            if (count > 1) {
                throw new Error("Transfer leadership before leaving! You are the leader.");
            }

            // Solo leader — disband guild
            await this.supabase.from('guild_members').delete().eq('guild_id', guildId);
            await this.supabase.from('guilds').delete().eq('id', guildId);
            console.log(`[GUILD] Guild ${guildId} disbanded by leader ${char.name}`);
        } else {
            // Regular member — just remove
            await this.supabase
                .from('guild_members')
                .delete()
                .eq('character_id', char.id)
                .eq('guild_id', guildId);
            console.log(`[GUILD] ${char.name} left guild ${guildId}`);
        }

        // 3. Clear guild reference from character state
        delete char.state.guild_id;
        this.gameManager.markDirty(char.id);

        return { success: true };
    }

    async applyToGuild(char, guildId) {
        if (!char) throw new Error("Character not found");

        // Check if already in a guild
        const { data: existingMember } = await this.supabase
            .from('guild_members')
            .select('guild_id')
            .eq('character_id', char.id)
            .maybeSingle();

        if (existingMember) throw new Error("You are already in a guild");

        // Check if guild exists and is not full
        const { data: guild, error: guildErr } = await this.supabase
            .from('guilds')
            .select('id, min_level, join_mode, guild_hall_level')
            .eq('id', guildId)
            .maybeSingle();

        if (guildErr || !guild) throw new Error("Guild not found");

        // Check minimum level
        const charLevel = this._calculateCharLevel(char.state ? { skills: char.skills, ...char.state } : { skills: char.skills });
        if (guild.min_level && charLevel < guild.min_level) {
            throw new Error(`You need to be at least level ${guild.min_level} to join this guild`);
        }

        // Count members (dynamic max based on Guild Hall level: 10 + level * 2)
        const guildHallLevel = guild.guild_hall_level || 0;
        const maxMembers = 10 + (guildHallLevel * 2);

        const { count } = await this.supabase
            .from('guild_members')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', guildId);

        if (count >= maxMembers) throw new Error("Guild is full");

        // If OPEN mode, join directly
        if (guild.join_mode === 'OPEN') {
            const { error: joinError } = await this.supabase
                .from('guild_members')
                .insert({
                    guild_id: guildId,
                    character_id: char.id,
                    role: 'MEMBER'
                });

            if (joinError) {
                if (joinError.code === '23505') {
                    return { success: false, message: "You are already in this guild", type: 'info' };
                }
                throw new Error(`Failed to join guild: ${joinError.message}`);
            }

            // Update character state immediately for the online character
            if (char.state) {
                char.state.guild_id = guildId;
                this.gameManager.markDirty(char.id);
                this.gameManager.persistCharacter(char.id).catch(e => console.error("[GUILD-JOIN] Persist error:", e));
            }

            return { success: true, joined: true };
        }

        // APPLY mode: Create request
        const { error } = await this.supabase
            .from('guild_requests')
            .insert({
                guild_id: guildId,
                character_id: char.id
            });

        if (error) {
            if (error.code === '23505') {
                return { success: false, message: "Application already pending", type: 'info' };
            }
            throw new Error(`Failed to send application: ${error.message}`);
        }

        return { success: true };
    }

    async getGuildRequests(char) {
        if (!char) throw new Error("Character not found");

        const { data: member } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        const hasPerm = await this.hasPermission(char.id, 'manage_requests');
        if (!hasPerm) {
            throw new Error("No permission to view requests");
        }

        const { data: requests, error } = await this.supabase
            .from('guild_requests')
            .select(`
                id,
                status,
                created_at,
                characters (
                    id,
                    name,
                    state,
                    skills
                )
            `)
            .eq('guild_id', member.guild_id)
            .eq('status', 'PENDING');

        if (error) {
            return []; // Fail silently if table doesn't exist yet, avoiding crashing UI
        }

        return (requests || []).map(r => {
            const charId = r.characters.id;
            const isOnline = this.gameManager.cache.has(charId);
            const cachedChar = isOnline ? this.gameManager.cache.get(charId) : null;
            const dbChar = r.characters;
            const state = cachedChar?.state || { ...dbChar.state, skills: dbChar.skills };

            return {
                id: r.id,
                characterId: charId,
                name: dbChar.name,
                level: this._calculateCharLevel(state),
                avatar: state.avatar || dbChar.avatar || '/profile/1 - male.png',
                createdAt: r.created_at
            };
        });
    }

    async handleGuildRequest(char, requestId, action) {
        if (!char) throw new Error("Character not found");
        if (action !== 'ACCEPT' && action !== 'REJECT') throw new Error("Invalid action");

        const { data: member } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        const hasPerm = await this.hasPermission(char.id, 'manage_requests');
        if (!hasPerm) {
            throw new Error("No permission to manage requests");
        }

        const { data: request, error: reqErr } = await this.supabase
            .from('guild_requests')
            .select('*')
            .eq('id', requestId)
            .eq('guild_id', member.guild_id)
            .eq('status', 'PENDING')
            .maybeSingle();

        if (reqErr || !request) throw new Error("Request not found or already handled");

        if (action === 'REJECT') {
            await this.supabase
                .from('guild_requests')
                .update({ status: 'REJECTED' })
                .eq('id', requestId);
            return { success: true, action: 'REJECTED' };
        }

        // ACCEPT scenario
        const { data: existingMember } = await this.supabase
            .from('guild_members')
            .select('guild_id')
            .eq('character_id', request.character_id)
            .maybeSingle();

        if (existingMember) {
            await this.supabase.from('guild_requests').update({ status: 'REJECTED' }).eq('id', requestId);
            throw new Error("Player is already in another guild");
        }

        // Count members (dynamic max based on Guild Hall level)
        const { data: guildData } = await this.supabase
            .from('guilds')
            .select('guild_hall_level')
            .eq('id', member.guild_id)
            .single();

        const guildHallLevel = guildData?.guild_hall_level || 0;
        const maxMembers = 10 + (guildHallLevel * 2);

        const { count } = await this.supabase
            .from('guild_members')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', member.guild_id);

        if (count >= maxMembers) throw new Error("Guild is full");

        const { error: insErr } = await this.supabase
            .from('guild_members')
            .insert({
                guild_id: member.guild_id,
                character_id: request.character_id,
                role: 'MEMBER'
            });

        if (insErr) throw new Error("Failed to add member");

        await this.supabase.from('guild_requests').update({ status: 'ACCEPTED' }).eq('id', requestId);
        await this.supabase.from('guild_requests').update({ status: 'REJECTED' })
            .eq('character_id', request.character_id)
            .eq('status', 'PENDING');

        const targetCharCache = this.gameManager.cache.get(request.character_id);
        if (targetCharCache) {
            targetCharCache.state.guild_id = member.guild_id;
            this.gameManager.markDirty(request.character_id);
        }

        // Push Notification: New Member
        const { data: members } = await this.supabase
            .from('guild_members')
            .select('character_id')
            .eq('guild_id', member.guild_id);
        
        if (members) {
            for (const m of members) {
                const { data: charData } = await this.supabase.from('characters').select('user_id').eq('id', m.character_id).single();
                if (charData && charData.user_id) {
                    this.gameManager.pushManager.notifyUser(
                        charData.user_id,
                        'push_guild_new_member',
                        'New Guild Member! 🛡️',
                        `A new member has joined your guild. Welcome them!`,
                        '/guild'
                    );
                }
            }
        }

        return { success: true, action: 'ACCEPTED' };
    }

    async changeMemberRole(char, { memberId, newRole }) {
        if (!char) throw new Error("Character not found");

        const { data: leaderMember, error: leaderErr } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        const hasPerm = await this.hasPermission(char.id, 'change_member_roles');
        if (!hasPerm) {
            throw new Error("No permission to change roles");
        }

        const { data: targetMember, error: targetErr } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', memberId)
            .eq('guild_id', leaderMember.guild_id)
            .maybeSingle();

        if (targetErr || !targetMember) throw new Error("Member not found in your guild");
        if (targetMember.role === 'LEADER') throw new Error("Cannot change the Leader's role");
        if (char.id === memberId) throw new Error("Cannot change your own role");

        const { error: updateErr } = await this.supabase
            .from('guild_members')
            .update({ role: newRole })
            .eq('character_id', memberId)
            .eq('guild_id', leaderMember.guild_id);

        if (updateErr) {
            console.error("[GUILD] Error updating member role:", updateErr);
            throw new Error("Failed to update role");
        }

        return { success: true };
    }

    async updateGuildRole(char, { roleId, name, color, permissions }) {
        if (!char) throw new Error("Character not found");

        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role, guilds(roles)')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) throw new Error("Character is not in a guild");

        // Check permission
        if (member.role !== 'LEADER' && !await this.hasPermission(char.id, 'manage_roles')) {
            throw new Error("No permission to manage roles");
        }

        if (roleId === member.role) throw new Error("Cannot edit your own role");
        if (roleId === 'LEADER') throw new Error("Cannot edit the LEADER role");

        const guildId = member.guild_id;
        const roles = member.guilds.roles || {};

        if (!roles[roleId]) {
            // Create new role
            roles[roleId] = { name, color, permissions: permissions || [], order: Object.keys(roles).length + 10 };
        } else {
            // Update existing
            roles[roleId].name = name || roles[roleId].name;
            roles[roleId].color = color || roles[roleId].color;
            roles[roleId].permissions = permissions || roles[roleId].permissions;
        }

        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({ roles })
            .eq('id', guildId);

        if (updateError) throw new Error("Failed to update guild roles");

        return { success: true, roles };
    }

    async reorderGuildRoles(char, { roles }) {
        if (!char) throw new Error("Character not found");

        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) throw new Error("Character is not in a guild");

        // Check permission
        if (member.role !== 'LEADER' && !await this.hasPermission(char.id, 'manage_roles')) {
            throw new Error("No permission to manage roles");
        }

        const guildId = member.guild_id;

        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({ roles })
            .eq('id', guildId);

        if (updateError) throw new Error("Failed to reorder guild roles");

        return { success: true, roles };
    }

    async deleteGuildRole(char, { roleId }) {
        if (!char) throw new Error("Character not found");
        if (['LEADER', 'OFFICER', 'MEMBER'].includes(roleId)) throw new Error("Cannot delete built-in roles");

        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role, guilds(roles)')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) throw new Error("Character is not in a guild");

        if (member.role !== 'LEADER' && !await this.hasPermission(char.id, 'manage_roles')) {
            throw new Error("No permission to manage roles");
        }

        const guildId = member.guild_id;
        const roles = { ...(member.guilds.roles || {}) };

        if (!roles[roleId]) throw new Error("Role not found");

        delete roles[roleId];

        // Demote members with this role to MEMBER
        await this.supabase
            .from('guild_members')
            .update({ role: 'MEMBER' })
            .eq('guild_id', guildId)
            .eq('role', roleId);

        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({ roles })
            .eq('id', guildId);

        if (updateError) throw new Error("Failed to delete role");

        return { success: true };
    }

    async kickMember(char, { memberId }) {
        if (!char) throw new Error("Character not found");

        const { data: hunter, error: hunterError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        if (hunterError || !hunter) throw new Error("You are not in a guild");

        // Check permission
        if (hunter.role !== 'LEADER' && !await this.hasPermission(char.id, 'kick_members')) {
            throw new Error("No permission to kick members");
        }

        const { data: target, error: targetError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', memberId)
            .eq('guild_id', hunter.guild_id)
            .maybeSingle();

        if (targetError || !target) throw new Error("Member not found in your guild");
        if (target.role === 'LEADER') throw new Error("Cannot kick the Leader");
        if (char.id === memberId) throw new Error("Cannot kick yourself");

        const { error: delError } = await this.supabase
            .from('guild_members')
            .delete()
            .eq('character_id', memberId);

        if (delError) throw new Error("Failed to kick member");

        // Clear cache for the kicked member
        const targetCharCache = this.gameManager.cache.get(memberId);
        if (targetCharCache) {
            delete targetCharCache.state.guild_id;
            this.gameManager.markDirty(memberId);
        }

        return { success: true };
    }

    async hasPermission(characterId, permission) {
        if (!characterId) return false;

        const { data: member, error } = await this.supabase
            .from('guild_members')
            .select('role, guilds(roles, leader_id)')
            .eq('character_id', characterId)
            .maybeSingle();

        if (error || !member) return false;

        // Leader ID check (absolute fallback)
        if (member.guilds.leader_id === characterId || member.role === 'LEADER') return true;

        const rolesConfig = member.guilds.roles || {};
        const myRoleConfig = rolesConfig[member.role];

        if (!myRoleConfig || !myRoleConfig.permissions) return false;
        return myRoleConfig.permissions.includes(permission);
    }

    async updateGuildSettings(char, { minLevel, joinMode }) {
        if (!char) throw new Error("Character not found");

        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) throw new Error("Character is not in a guild");

        // Check permission
        if (member.role !== 'LEADER' && !await this.hasPermission(char.id, 'manage_roles')) {
            throw new Error("No permission to manage guild settings");
        }

        const updates = {};
        if (minLevel !== undefined) {
            const lvl = parseInt(minLevel);
            if (isNaN(lvl) || lvl < 1 || lvl > 9999) throw new Error("Invalid minimum level (1-9999)");
            updates.min_level = lvl;
        }
        if (joinMode !== undefined) {
            if (!['APPLY', 'OPEN'].includes(joinMode)) throw new Error("Invalid join mode");
            updates.join_mode = joinMode;
        }

        if (Object.keys(updates).length === 0) throw new Error("No settings to update");

        const { error: updateError } = await this.supabase
            .from('guilds')
            .update(updates)
            .eq('id', member.guild_id);

        if (updateError) throw new Error("Failed to update guild settings");

        return { success: true };
    }

    _calculateCharLevel(state) {
        if (!state || !state.skills) return 1;
        let total = 0;
        Object.values(state.skills).forEach(s => total += (s.level || 1));
        return total;
    }

    addPendingGuildXP(guildId, amount, charId = null) {
        if (!guildId || !amount) return;
        if (!this.pendingGuildXP[guildId]) {
            this.pendingGuildXP[guildId] = { total: 0, donors: {} };
        }
        this.pendingGuildXP[guildId].total += amount;

        if (charId) {
            if (!this.pendingGuildXP[guildId].donors[charId]) {
                this.pendingGuildXP[guildId].donors[charId] = 0;
            }
            this.pendingGuildXP[guildId].donors[charId] += amount;
        }
    }

    async flushGuildXP() {
        if (Object.keys(this.pendingGuildXP).length === 0) return;

        console.log(`[GUILD_XP] Flushing XP for ${Object.keys(this.pendingGuildXP).length} guilds...`);

        // Create a copy and clear the buffer quickly to avoid race conditions
        const xpToProcess = { ...this.pendingGuildXP };
        this.pendingGuildXP = {};

        for (const [guildId, guildData] of Object.entries(xpToProcess)) {
            const totalAmount = guildData.total;
            const donors = guildData.donors;

            // Only flush whole numbers for Guild XP, keep the decimal in memory
            const wholeXP = Math.floor(totalAmount);
            const remainder = totalAmount - wholeXP;

            if (remainder > 0) {
                // Return remainder to guild total pool (without specific donor attribution to avoid dust tracking issues)
                this.addPendingGuildXP(guildId, remainder);
            }

            if (wholeXP > 0) {
                await this.addExactGuildXP(guildId, wholeXP);

                // Process individual donors XP to guild_members table
                try {
                    const donorPromises = Object.entries(donors).map(async ([charId, amount]) => {
                        const wholeDonorXP = Math.floor(amount);
                        if (wholeDonorXP <= 0) return;
                        // Execute RPC or manual update. We can use straight update on guild_members matching guild_id and character_id
                        // Utilizing supabase's increment capability through rpc is preferable, 
                        // but if no RPC exists, we query and update.
                        const { data: currentMember } = await this.supabase
                            .from('guild_members')
                            .select('donated_xp')
                            .eq('guild_id', guildId)
                            .eq('character_id', charId)
                            .maybeSingle();

                        if (currentMember !== null) {
                            const newDonatedXP = Number(currentMember.donated_xp || 0) + wholeDonorXP;
                            await this.supabase
                                .from('guild_members')
                                .update({ donated_xp: newDonatedXP })
                                .eq('guild_id', guildId)
                                .eq('character_id', charId);
                        }
                    });

                    await Promise.all(donorPromises);
                } catch (e) {
                    console.error(`[GUILD_XP] Error flushing donor XP for guild ${guildId}:`, e);
                }
            }
        }
    }

    async addExactGuildXP(guildId, amount) {
        // Fetch current guild state
        const { data: guild, error } = await this.supabase
            .from('guilds')
            .select('level, xp, name, tag')
            .eq('id', guildId)
            .single();

        if (error || !guild) return;

        let currentXP = Number(guild.xp) + amount;
        let currentLevel = Number(guild.level) || 1;
        let leveledUp = false;
        let nextLevelXP = calculateGuildNextLevelXP(currentLevel);

        // Calculate Level Ups
        while (currentXP >= nextLevelXP && currentLevel < 100) {
            currentXP -= nextLevelXP;
            currentLevel++;
            leveledUp = true;
            nextLevelXP = calculateGuildNextLevelXP(currentLevel);
        }

        // Save back to DB
        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({
                level: currentLevel,
                xp: currentXP
            })
            .eq('id', guildId);

        if (updateError) {
            console.error(`[GUILD_XP] Failed to save XP to guild ${guildId}:`, updateError);
            // Restore failure to memory safely
            this.addPendingGuildXP(guildId, amount);
            return;
        }

        if (leveledUp) {
            console.log(`[GUILD_XP] Guild ${guild.name} [${guild.tag}] Leveled Up to ${currentLevel}!`);

            // Broadcast Level Up to Guild Chat
            // This relies on the new Guild Chat channel we will implement
            this.gameManager.broadcastToGuild(guildId, 'new_message', {
                id: Date.now() + Math.random(),
                channel: 'Guild',
                sender: 'System',
                message: `🎉 The Guild has reached Level ${currentLevel}!`,
                timestamp: Date.now(),
                isSystem: true
            });

            // Refresh the cache/client states immediately
            const members = await this.supabase.from('guild_members').select('character_id').eq('guild_id', guildId);
            if (members.data) {
                members.data.forEach(m => {
                    const charId = m.character_id;
                    if (this.gameManager.cache.has(charId)) {
                        this.gameManager.broadcastToCharacter(charId, 'guild_update', {
                            level: currentLevel,
                            xp: currentXP,
                            nextLevelXP: nextLevelXP
                        });
                    }
                });
            }
        }
    }

    async upgradeBuilding(char, params) {
        if (!char) throw new Error("Character not found");
        const bType = typeof params === 'string' ? params : params?.buildingType;
        const bPath = params?.path; // For multi-path buildings like GATHERING_STATION

        const config = GUILD_BUILDINGS[bType];
        if (!config) throw new Error("Invalid building type");

        // 1. Find membership and guild
        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, role')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) throw new Error("Character is not in a guild");

        // 2. Check permissions
        const hasPerm = await this.hasPermission(char.id, 'manage_upgrades');
        if (!hasPerm && member.role !== 'LEADER') {
            throw new Error("You don't have permission to upgrade buildings");
        }

        const { data: guild, error: guildError } = await this.supabase
            .from('guilds')
            .select('*')
            .eq('id', member.guild_id)
            .single();

        if (guildError || !guild) throw new Error("Guild not found");

        // 3. Determine specific level column and current level
        let levelColumn = '';
        if (bType === 'GUILD_HALL') {
            levelColumn = 'guild_hall_level';
        } else if (bType === 'LIBRARY') {
            levelColumn = 'library_level';
        } else if (config.paths) {
            if (!bPath || !config.paths[bPath]) throw new Error("Invalid building path");
            levelColumn = config.paths[bPath].column;
        } else {
            throw new Error("Building configuration error");
        }

        const currentLevel = guild[levelColumn] || 0;
        if (currentLevel >= config.maxLevel) throw new Error(`${config.name} is already at maximum level`);

        // 4. Validate Guild Level Requirement
        const nextLevel = currentLevel + 1;
        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);
        if ((guild.level || 1) < reqGuildLevel) {
            throw new Error(`Guild needs to be at least Level ${reqGuildLevel} to upgrade ${config.name} to Level ${nextLevel}`);
        }

        // 4.5 Validate Synchronized Progression (All paths must be at least currentLevel to go to nextLevel)
        if (config.paths) {
            for (const [pKey, pVal] of Object.entries(config.paths)) {
                const pLevel = guild[pVal.column] || 0;
                if (pLevel < currentLevel) {
                    throw new Error(`All ${config.name} paths must be at least Level ${currentLevel} before any can reach Level ${nextLevel}. Upgrade ${pVal.name} first!`);
                }
            }
        }

        // 5. Calculate Costs
        const costs = UPGRADE_COSTS[nextLevel];
        if (!costs) throw new Error("Upgrade configuration not found for this level");

        const silverCost = costs.silver;
        const gpCost = (bType === 'LIBRARY' && nextLevel === 1) ? 0 : costs.gp;
        const tier = Math.min(10, nextLevel); // Tier usually matches the level you are upgrading to
        const matAmount = costs.mats;
        
        const materialReq = {
            [`T${tier}_WOOD`]: matAmount,
            [`T${tier}_ORE`]: matAmount,
            [`T${tier}_HIDE`]: matAmount,
            [`T${tier}_FIBER`]: matAmount,
            [`T${tier}_FISH`]: matAmount,
            [`T${tier}_HERB`]: matAmount
        };

        // 6. Validate Bank Resources (Normalized IDs)
        const bankTotals = {};
        if (guild.bank_items) {
            Object.entries(guild.bank_items).forEach(([id, qty]) => {
                const upperId = id.split('::')[0].toUpperCase();
                const amount = (typeof qty === 'object' ? (qty.amount || 0) : qty);
                bankTotals[upperId] = (bankTotals[upperId] || 0) + parseInt(amount || 0);
            });
        }

        const bankSilver = BigInt(guild.bank_silver || 0);
        if (bankSilver < BigInt(silverCost)) {
            throw new Error(`Insufficient Bank Silver! Need ${silverCost.toLocaleString()}`);
        }

        const currentGP = BigInt(guild.guild_points || 0);
        if (currentGP < BigInt(gpCost)) {
            throw new Error(`Insufficient Guild Points! Need ${gpCost.toLocaleString()} GP`);
        }

        for (const [itemId, amount] of Object.entries(materialReq)) {
            if ((bankTotals[itemId] || 0) < amount) {
                throw new Error(`Insufficient Bank Materials! Need ${amount.toLocaleString()} of ${itemId.replace(/_/g, ' ')}`);
            }
        }

        // 7. Deduct from Bank (Consolidating to UpperCase IDs)
        const newBankSilver = bankSilver - BigInt(silverCost);
        const newBankItems = { ...bankTotals }; // Use normalized pool
        for (const [itemId, amount] of Object.entries(materialReq)) {
            newBankItems[itemId] = (newBankItems[itemId] || 0) - amount;
        }

        // 8. Update DB
        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({
                [levelColumn]: nextLevel,
                bank_silver: newBankSilver.toString(),
                guild_points: (currentGP - BigInt(gpCost)).toString(),
                bank_items: newBankItems
            })
            .eq('id', guild.id);

        if (updateError) {
            console.error("[GUILD-UPGRADE] Error updating level:", updateError);
            throw new Error(`Internal server error during ${config.name} upgrade`);
        }

        // 8.5 Invalidate & Update Cache
        if (this.gameManager.guildBonusesCache) {
            this.gameManager.guildBonusesCache.delete(guild.id);
        }
        char.guild_bonuses = await this.gameManager.getGuildBonuses(guild.id);

        // 9. Persist Character state
        this.gameManager.markDirty(char.id);
        await this.gameManager.persistCharacter(char.id);

        console.log(`[GUILD-UPGRADE] Guild ${guild.name} upgraded ${config.name} ${bPath || ''} to Level ${nextLevel} by ${char.name}`);

        return { success: true, nextLevel, buildingType: bType, path: bPath };
    }

    async donateToBank(char, { silver = 0, items = {} }) {
        if (!char) throw new Error("Character not found");

        const silverToDonate = Math.max(0, parseInt(silver) || 0);
        const hasItems = items && Object.keys(items).length > 0;

        if (silverToDonate === 0 && !hasItems) {
            throw new Error("Nothing to donate");
        }

        // 1. Find membership
        const { data: member, error: memberError } = await this.supabase
            .from('guild_members')
            .select('guild_id, donated_silver, donated_items_value')
            .eq('character_id', char.id)
            .maybeSingle();

        if (memberError || !member) {
            if (char.state.guild_id) {
                console.warn(`[GUILD] Clearing stale guild_id for character ${char.name} (membership not found)`);
                char.state.guild_id = null;
                this.gameManager.markDirty(char.id);
            }
            throw new Error("Character is not in a guild");
        }

        // 2. Validate Silver
        if (silverToDonate > 0 && (char.state.silver || 0) < silverToDonate) {
            throw new Error("Insufficient Silver");
        }

        // 3. Validate Items
        const invManager = this.gameManager.inventoryManager;
        let totalItemsValue = 0;
        if (hasItems) {
            // Validate that only allowed materials are donated (Exclude Runes/Shards)
            for (const [itemId, amount] of Object.entries(items)) {
                if (itemId.includes('_RUNE_') || itemId.includes('_SHARD')) {
                    throw new Error(`Item ${itemId} cannot be donated to the Guild Bank`);
                }
                const safeAmount = Math.max(0, parseInt(amount) || 0);
                if (safeAmount > 0) {
                    const resolved = resolveItem(itemId);
                    if (resolved) {
                        const sellPrice = calculateItemSellPrice(resolved, itemId);
                        totalItemsValue += sellPrice * safeAmount;
                    }
                }
            }

            if (!invManager.hasItems(char, items)) {
                throw new Error("Insufficient items for donation");
            }
        }

        // 4. Fetch Guild Data
        const { data: guild, error: guildError } = await this.supabase
            .from('guilds')
            .select('id, name, bank_silver, bank_items')
            .eq('id', member.guild_id)
            .single();

        if (guildError || !guild) throw new Error("Guild not found");

        // 5. Update Balances (Normalizing IDs to UPPERCASE)
        const newBankSilver = BigInt(guild.bank_silver || 0) + BigInt(silverToDonate);
        
        // Build normalized bank items map first to handle existing data
        const normalizedBankItems = {};
        if (guild.bank_items) {
            Object.entries(guild.bank_items).forEach(([id, qty]) => {
                const upperId = id.split('::')[0].toUpperCase();
                const amount = (typeof qty === 'object' ? (qty.amount || 0) : qty);
                normalizedBankItems[upperId] = (normalizedBankItems[upperId] || 0) + parseInt(amount || 0);
            });
        }
        
        const newBankItems = { ...normalizedBankItems };

        if (hasItems) {
            const materialNeeds = calculateMaterialNeeds(guild);
            for (const [itemId, amount] of Object.entries(items)) {
                const upperId = itemId.split('::')[0].toUpperCase();
                const safeAmount = Math.max(0, parseInt(amount) || 0);
                if (safeAmount > 0) {
                    const currentInBank = parseInt(newBankItems[upperId] || 0);
                    const totalNeeded = materialNeeds[upperId];

                    // Only enforce limit on materials tracked in materialNeeds (T1-T10 base mats)
                    if (totalNeeded !== undefined) {
                        const canAccept = Math.max(0, totalNeeded - currentInBank);
                        if (safeAmount > canAccept) {
                            throw new Error(`The bank only needs ${canAccept.toLocaleString()} more of ${itemId.replace(/_/g, ' ')}. It currently has ${currentInBank.toLocaleString()} / ${totalNeeded.toLocaleString()}`);
                        }
                    }

                    newBankItems[upperId] = currentInBank + safeAmount;
                }
            }
        }

        // 6. Deduct from Character
        if (silverToDonate > 0) char.state.silver -= silverToDonate;
        if (hasItems) invManager.consumeItems(char, items);

        // 7. Update DB
        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({
                bank_silver: newBankSilver.toString(),
                bank_items: newBankItems
            })
            .eq('id', guild.id);

        if (updateError) {
            console.error("[GUILD-BANK] Error updating bank:", updateError);
            throw new Error("Internal server error during donation");
        }

        // 8. Update Member Profile for ranking
        const newDonatedSilver = BigInt(member.donated_silver || 0) + BigInt(silverToDonate);
        const newDonatedItemsValue = BigInt(member.donated_items_value || 0) + BigInt(totalItemsValue);

        if (silverToDonate > 0 || totalItemsValue > 0) {
            const { error: memberUpdateError } = await this.supabase
                .from('guild_members')
                .update({
                    donated_silver: newDonatedSilver.toString(),
                    donated_items_value: newDonatedItemsValue.toString()
                })
                .eq('character_id', char.id);
            if (memberUpdateError) {
                console.error("[GUILD-BANK] Error updating member rankings:", memberUpdateError);
            }
        }

        // 8. Persist Character state
        this.gameManager.markDirty(char.id);
        await this.gameManager.persistCharacter(char.id);

        console.log(`[GUILD-BANK] ${char.name} donated ${silverToDonate} silver and items to ${guild.name}`);

        return { success: true };
    }

    async getGuildTasks(char) {
        if (!char) throw new Error("Character not found");

        const guildId = char.state.guild_id;
        if (!guildId) throw new Error("You are not in a guild");

        const { data: guild, error } = await this.supabase
            .from('guilds')
            .select('daily_tasks, tasks_last_reset, library_level')
            .eq('id', guildId)
            .single();

        if (error) {
            console.error(`[GUILD-TASKS] Erro ao buscar guilda ${guildId}:`, error);
            // Se for erro de coluna faltando (42703), damos um erro mais amigável
            if (error.code === '42703') {
                throw new Error("Configuração da guilda incompleta no banco de dados. Contate o administrador.");
            }
            throw new Error("Erro ao acessar dados da guilda.");
        }

        if (!guild) {
            if (char.state.guild_id) {
                console.warn(`[GUILD] Clearing stale guild_id for character ${char.name} (guild ${guildId} not found)`);
                char.state.guild_id = null;
                this.gameManager.markDirty(char.id);
            }
            throw new Error("Guilda não encontrada.");
        }

        // Check for daily reset (00:00 UTC)
        const now = new Date();
        const lastReset = new Date(guild.tasks_last_reset || 0);
        
        // Normalize dates to UTC 00:00 for comparison
        const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const lastResetUTC = new Date(Date.UTC(lastReset.getUTCFullYear(), lastReset.getUTCMonth(), lastReset.getUTCDate()));

        const config = GUILD_TASKS_CONFIG;
        const libraryLevel = guild.library_level || 0;

        if (libraryLevel < 1) {
            return { locked: true, message: "Upgrade Library to Level 1 to unlock Guild Tasks" };
        }

        if (nowUTC > lastResetUTC || !guild.daily_tasks || guild.daily_tasks.length !== config.MAX_TASKS) {
            console.log(`[GUILD-TASKS] Resetting tasks for guild ${guildId}`);
            const newTasks = this._generateNewTasks(libraryLevel);
            
            const { error: updateError } = await this.supabase
                .from('guilds')
                .update({
                    daily_tasks: newTasks,
                    tasks_last_reset: now.toISOString()
                })
                .eq('id', guildId);

            if (updateError) throw new Error("Failed to reset guild tasks");
            
            return newTasks;
        }

        return guild.daily_tasks;
    }

    _generateNewTasks(libraryLevel = 1) {
        const config = GUILD_TASKS_CONFIG;
        const tasks = [];

        // Library level scales tier
        const tier = Math.min(10, Math.max(1, libraryLevel));

        // 13 Fixed Daily Tasks defined by the user
        // We will randomize the tier (T1-T3) for each, but keep the item types fixed.
        const taskDefinitions = [
            { type: 'RAW', mat: 'WOOD' },         // 1: Wood
            { type: 'RAW', mat: 'ORE' },          // 2: Ore
            { type: 'RAW', mat: 'HIDE' },         // 3: Hide
            { type: 'RAW', mat: 'FIBER' },        // 4: Fiber
            { type: 'RAW', mat: 'HERB' },         // 5: Herb
            { type: 'RAW', mat: 'FISH' },         // 6: Fish
            { type: 'REFINED', mat: 'PLANK' },    // 7: Plank
            { type: 'REFINED', mat: 'BAR' },      // 8: Bar
            { type: 'REFINED', mat: 'LEATHER' },  // 9: Leather
            { type: 'REFINED', mat: 'CLOTH' },    // 10: Cloth
            { type: 'REFINED', mat: 'EXTRACT' },  // 11: Extract
            { type: 'POTION', mat: 'POTION' },    // 12: Random Potion
            { type: 'FOOD', mat: 'FOOD' }         // 13: Food
        ];

        // Potion suffixes from shared/items.js
        const potionSuffixes = [
            '_POTION_GATHER', '_POTION_REFINE', '_POTION_CRAFT', '_POTION_SILVER',
            '_POTION_QUALITY', '_POTION_LUCK', '_POTION_XP', '_POTION_CRIT', '_POTION_DAMAGE'
        ];

        for (let i = 0; i < taskDefinitions.length && i < config.MAX_TASKS; i++) {
            const def = taskDefinitions[i];
            let itemId = `T${tier}_${def.mat}`;

            if (def.type === 'POTION') {
                const randomPotionSuffix = potionSuffixes[Math.floor(Math.random() * potionSuffixes.length)];
                itemId = `T${tier}${randomPotionSuffix}`;
            } else if (def.type === 'FOOD') {
                itemId = `T${tier}_FOOD`;
            }

            // Look up specific required amount from config
            const requiredAmount = config.REQUIREMENTS[def.type]?.[tier] || 100;

            tasks.push({
                id: i,
                type: def.type,
                itemId: itemId,
                required: requiredAmount,
                progress: 0
            });
        }

        return tasks;
    }


    async contributeToTask(char, { taskId, amount }) {
        if (!char) throw new Error("Character not found");
        const guildId = char.state.guild_id;
        if (!guildId) throw new Error("You are not in a guild");

        const { data: guild, error } = await this.supabase
            .from('guilds')
            .select('id, daily_tasks, library_level')
            .eq('id', guildId)
            .single();

        if (error || !guild) throw new Error("Guild not found");

        const tasks = guild.daily_tasks || [];
        const task = tasks.find(t => t.id === taskId);
        if (!task) throw new Error("Task not found");

        const remaining = task.required - task.progress;
        if (remaining <= 0) throw new Error("Task already completed");

        const contributeAmount = Math.min(amount, remaining);
        if (contributeAmount <= 0) throw new Error("Invalid contribution amount");

        // Check if player has the items
        const invManager = this.gameManager.inventoryManager;
        if (!invManager.hasItems(char, { [task.itemId]: contributeAmount })) {
            throw new Error("Insufficient items in inventory");
        }

        // Consume items
        invManager.consumeItems(char, { [task.itemId]: contributeAmount });

        // Update task progress
        task.progress += contributeAmount;

        // NEW: Update Member Profile ranking for task contribution
        try {
            const resolved = resolveItem(task.itemId);
            if (resolved) {
                const itemValue = calculateItemSellPrice(resolved, task.itemId) * contributeAmount;
                if (itemValue > 0) {
                    const { data: member } = await this.supabase
                        .from('guild_members')
                        .select('donated_items_value')
                        .eq('character_id', char.id)
                        .maybeSingle();

                    if (member) {
                        const newDonatedItemsValue = BigInt(member.donated_items_value || 0) + BigInt(itemValue);
                        await this.supabase
                            .from('guild_members')
                            .update({ donated_items_value: newDonatedItemsValue.toString() })
                            .eq('character_id', char.id);
                    }
                }
            }
        } catch (rankError) {
            console.error("[GUILD-TASK] Error updating member ranking:", rankError);
        }

        // Rewards logic
        if (task.progress >= task.required) {
            // Task completed! Give guild rewards
            const scaling = GUILD_TASKS_CONFIG.SCALING;
            const libraryLevel = guild.library_level || 1;
            const xpReward = GUILD_TASKS_CONFIG.REWARDS.XP_TABLE[libraryLevel] || 0;
            const gpReward = GUILD_TASKS_CONFIG.REWARDS.GP_TABLE[libraryLevel] || 0;

            await this.addExactGuildXP(guildId, xpReward);
            
            // Add Guild Points
            const { data: currentGuild } = await this.supabase.from('guilds').select('guild_points').eq('id', guildId).single();
            const newGP = BigInt(currentGuild.guild_points || 0) + BigInt(gpReward);
            await this.supabase.from('guilds').update({ guild_points: newGP.toString() }).eq('id', guildId);

            this.gameManager.broadcastToGuild(guildId, 'new_message', {
                id: Date.now() + Math.random(),
                channel: 'Guild',
                sender: 'System',
                message: `✅ Guild Task Completed: ${task.itemId.replace(/_/g, ' ')}! +${xpReward} XP, +${gpReward} GP`,
                timestamp: Date.now(),
                isSystem: true
            });

            // Push Notification: Guild Task Completed
            const { data: members } = await this.supabase
                .from('guild_members')
                .select('character_id')
                .eq('guild_id', guildId);
            
            if (members) {
                for (const m of members) {
                    const { data: charData } = await this.supabase.from('characters').select('user_id').eq('id', m.character_id).single();
                    if (charData && charData.user_id) {
                        this.gameManager.pushManager.notifyUser(
                            charData.user_id,
                            'push_guild_task',
                            'Guild Task Complete! ✅',
                            `Your guild has completed a task: ${task.itemId.replace(/_/g, ' ')}.`,
                            '/guild'
                        );
                    }
                }
            }
        }

        const { error: updateError } = await this.supabase
            .from('guilds')
            .update({ daily_tasks: tasks })
            .eq('id', guildId);

        if (updateError) throw new Error("Failed to update task progress");

        // Persist Char
        this.gameManager.markDirty(char.id);
        await this.gameManager.persistCharacter(char.id);

        return { tasks, contributed: contributeAmount };
    }
}
