export class SocialManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;
    }

    async getFriends(characterId) {
        if (!characterId) return [];

        // Fetch friendships where user is either sender or receiver
        const { data, error } = await this.supabase
            .from('friends')
            .select(`
                *,
                sender:sender_id (id, name, state, skills, equipment, info, current_activity, combat, dungeon),
                receiver:receiver_id (id, name, state, skills, equipment, info, current_activity, combat, dungeon)
            `)
            .or(`sender_id.eq.${characterId},receiver_id.eq.${characterId}`);

        if (error) throw error;

        // Formatação dos dados para o client
        return data.map(f => {
            const isSender = f.sender_id === characterId;
            let friend = isSender ? f.receiver : f.sender;

            // CRITICAL: Hydrate the character data from the raw columns
            this.gameManager._hydrateCharacterFromRaw(friend);

            // Determinar status online via cache do GameManager
            const isOnline = this.gameManager.cache.has(friend.id);
            const cachedChar = this.gameManager.cache.get(friend.id);

            // Calculate Total Level
            let totalLevel = 0;
            const skillsToUse = cachedChar?.state?.skills || friend.state?.skills || {};

            if (skillsToUse) {
                for (const key in skillsToUse) {
                    if (skillsToUse[key] && typeof skillsToUse[key].level === 'number') {
                        totalLevel += skillsToUse[key].level;
                    }
                }
            }
            if (totalLevel === 0) totalLevel = 1;

            // Get current activity (Online or Offline)
            let currentActivity = null;
            const sourceChar = isOnline ? cachedChar : friend;

            if (sourceChar && sourceChar.current_activity) {
                // Check if activity is expired (optional, but good for "Real Time" feel)
                // For now, we show what is in DB/Cache.
                currentActivity = {
                    type: sourceChar.current_activity.type,
                    itemId: sourceChar.current_activity.item_id
                };
            }


            return {
                id: f.id,
                friendId: friend.id,
                friendName: friend.name,
                status: f.status,
                isSender: isSender,
                isOnline: isOnline,
                level: totalLevel,
                title: cachedChar?.state?.selectedTitle || friend.state?.selectedTitle || null,
                currentActivity: currentActivity
            };
        });
    }

    async sendFriendRequest(sender, receiverName) {
        // 1. Achar o personagem alvo pelo nome
        const { data: receiver, error: searchError } = await this.supabase
            .from('characters')
            .select('id, name')
            .ilike('name', receiverName)
            .maybeSingle();

        if (searchError || !receiver) throw new Error(`Player '${receiverName}' not found.`);
        if (receiver.id === sender.id) throw new Error("You cannot add yourself as a friend.");

        // 2. Verificar se já existe uma relação (pendente ou aceita)
        const { data: existing } = await this.supabase
            .from('friends')
            .select('status')
            .or(`and(sender_id.eq.${sender.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${sender.id})`)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'ACCEPTED') throw new Error("You are already friends.");
            throw new Error("Friend request already pending.");
        }

        // 3. Criar o pedido
        const { data, error } = await this.supabase
            .from('friends')
            .insert({
                sender_id: sender.id,
                receiver_id: receiver.id,
                status: 'PENDING'
            })
            .select()
            .single();

        if (error) throw error;

        // Opcional: Notificar o receiver se ele estiver online via socket
        this.gameManager.broadcastToCharacter(receiver.id, 'friend_request_received', {
            senderId: sender.id,
            senderName: sender.name
        });

        return data;
    }

    async respondToRequest(characterId, requestId, accept) {
        // Pegar o convite e verificar se o characterId é o RECEIVER
        const { data: request, error: fetchError } = await this.supabase
            .from('friends')
            .select('*')
            .eq('id', requestId)
            .eq('receiver_id', characterId)
            .eq('status', 'PENDING')
            .single();

        if (fetchError || !request) throw new Error("Request not found or you are not the receiver.");

        if (accept) {
            const { error: updateError } = await this.supabase
                .from('friends')
                .update({ status: 'ACCEPTED', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Notificar o sender que o pedido foi aceito
            this.gameManager.broadcastToCharacter(request.sender_id, 'friend_request_accepted', {
                friendId: characterId,
                friendName: (await this.gameManager.getCharacter(null, characterId)).name
            });

            return { status: 'ACCEPTED' };
        } else {
            // Recusar (Deletar a linha)
            const { error: deleteError } = await this.supabase
                .from('friends')
                .delete()
                .eq('id', requestId);

            if (deleteError) throw deleteError;
            return { status: 'REJECTED' };
        }
    }

    async removeFriend(characterId, friendId) {
        const { error } = await this.supabase
            .from('friends')
            .delete()
            .or(`and(sender_id.eq.${characterId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${characterId})`);

        if (error) throw error;
        return { success: true };
    }

    async cancelFriendRequest(senderId, requestId) {
        const { error } = await this.supabase
            .from('friends')
            .delete()
            .eq('id', requestId)
            .eq('sender_id', senderId)
            .eq('status', 'PENDING');

        if (error) throw error;
        return { success: true };
    }
}
