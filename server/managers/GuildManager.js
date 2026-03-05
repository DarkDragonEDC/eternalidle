export class GuildManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;
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
        if (member.role !== 'LEADER') {
            throw new Error("Only the Guild Leader can update customization");
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

        // Fetch other members
        const { data: members } = await this.supabase
            .from('guild_members')
            .select(`
                role,
                joined_at,
                characters (
                    id,
                    name,
                    state
                )
            `)
            .eq('guild_id', guild.id);

        return {
            ...guild,
            myRole: member.role,
            members: members.map(m => {
                const charId = m.characters.id;
                const isOnline = this.gameManager.cache.has(charId);
                // Use cached (live) state for online members, DB state for offline
                const cachedChar = isOnline ? this.gameManager.cache.get(charId) : null;
                const state = cachedChar?.state || m.characters.state;
                return {
                    id: charId,
                    name: m.characters.name,
                    role: m.role,
                    joinedAt: m.joined_at,
                    online: isOnline,
                    level: this._calculateCharLevel(state)
                };
            })
        };
    }

    async searchGuilds(query, countryCode = null) {
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
        return data || [];
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
            .select('id')
            .eq('id', guildId)
            .maybeSingle();

        if (guildErr || !guild) throw new Error("Guild not found");

        // Count members (max 10 for now)
        const { count } = await this.supabase
            .from('guild_members')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', guildId);

        if (count >= 10) throw new Error("Guild is full");

        // Create request
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

        if (!member || (member.role !== 'LEADER' && member.role !== 'OFFICER')) {
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
                    state
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
            const state = cachedChar?.state || r.characters.state;

            return {
                id: r.id,
                characterId: charId,
                name: r.characters.name,
                level: this._calculateCharLevel(state),
                status: r.status,
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

        if (!member || (member.role !== 'LEADER' && member.role !== 'OFFICER')) {
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

        const { count } = await this.supabase
            .from('guild_members')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', member.guild_id);

        if (count >= 10) throw new Error("Guild is full");

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

        return { success: true, action: 'ACCEPTED' };
    }

    _calculateCharLevel(state) {
        if (!state || !state.skills) return 1;
        let total = 0;
        Object.values(state.skills).forEach(s => total += (s.level || 1));
        return total;
    }
}
