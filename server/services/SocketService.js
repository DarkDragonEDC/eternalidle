export class SocketService {
    constructor(supabase) {
        this.supabase = supabase;
        this.io = null;
    }

    setIo(io) {
        this.io = io;
    }

    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    broadcastToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }

    async broadcastToCharacter(characterId, event, data) {
        if (!this.io) return;
        const { data: charData } = await this.supabase
            .from('characters')
            .select('user_id')
            .eq('id', characterId)
            .single();

        if (charData && charData.user_id) {
            this.io.to(`user:${charData.user_id}`).emit(event, data);
        }
    }

    async broadcastToGuild(guildId, event, data) {
        if (!this.io || !guildId) return;
        const { data: members } = await this.supabase
            .from('guild_members')
            .select('characters ( user_id )')
            .eq('guild_id', guildId);

        if (members) {
            members.forEach(m => {
                if (m.characters && m.characters.user_id) {
                    this.io.to(`user:${m.characters.user_id}`).emit(event, data);
                }
            });
        }
    }
}
