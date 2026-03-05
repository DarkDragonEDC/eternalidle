export class GuildManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;
    }

    async createGuild(char, { name, tag, summary, icon, iconColor, bgColor, paymentMethod }) {
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
                leader_id: char.id
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
            members: members.map(m => ({
                id: m.characters.id,
                name: m.characters.name,
                role: m.role,
                joinedAt: m.joined_at,
                online: !!this.gameManager.cache.has(m.characters.id),
                level: this._calculateCharLevel(m.characters.state)
            }))
        };
    }

    _calculateCharLevel(state) {
        if (!state || !state.skills) return 1;
        // Simple level logic for member list
        let total = 0;
        Object.values(state.skills).forEach(s => total += (s.level || 1));
        return Math.floor(total / Object.keys(state.skills).length);
    }
}
