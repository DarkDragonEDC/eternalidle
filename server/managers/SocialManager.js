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
        // USAR PROMISE.ALL PARA SUPORTAR LOGS OU ASYNC SE PRECISAR
        return Promise.all(data.map(async f => {
            const isSender = f.sender_id === characterId;
            let friend = isSender ? f.receiver : f.sender;

            // CRITICAL: Hydrate the character data from the raw columns
            this.gameManager._hydrateCharacterFromRaw(friend);

            // Determine online status via GameManager cache
            const friendCharId = friend.id;
            const isOnline = this.gameManager.cache.has(friendCharId);
            const cachedChar = this.gameManager.cache.get(friendCharId);

            // Calculate Total Level
            let totalLevel = 0;
            const skillsToUse = cachedChar?.state?.skills || friend.state?.skills || friend.skills || {};

            if (skillsToUse) {
                for (const key in skillsToUse) {
                    if (skillsToUse[key] && typeof skillsToUse[key].level === 'number') {
                        totalLevel += skillsToUse[key].level;
                    }
                }
            }
            if (totalLevel === 0) totalLevel = 1;

            // Get current activities (Online or Offline)
            let activities = [];
            const sourceChar = isOnline ? cachedChar : friend;

            if (sourceChar) {
                const state = (sourceChar.state || {});

                // Robust Detection: Check BOTH top-level and state nesting
                const combatData = state.combat || sourceChar.combat;
                const dungeonData = state.dungeon || sourceChar.dungeon;
                const activityData = state.current_activity || sourceChar.current_activity;

                // 1. World Boss (Online Only)
                if (isOnline && this.gameManager.worldBossManager?.activeFights?.has(friendCharId)) {
                    activities.push({ type: 'WORLD BOSS', itemId: 'The Ancient Dragon' });
                }

                // 2. Dungeon
                if (dungeonData && Object.keys(dungeonData).length > 0) {
                    activities.push({
                        type: 'DUNGEON',
                        itemId: dungeonData.name || dungeonData.id || 'Active'
                    });
                }

                // 3. Combat
                if (combatData && Object.keys(combatData).length > 0) {
                    activities.push({
                        type: 'COMBAT',
                        itemId: combatData.mobName || combatData.mobId || combatData.mob_name || combatData.mob_id || 'Active'
                    });
                }

                // 4. Standard Activity
                if (activityData && activityData.type) {
                    activities.push({
                        type: activityData.type,
                        itemId: activityData.item_id || activityData.itemId
                    });
                }
            }

            return {
                id: f.id,
                friendId: friendCharId,
                friendName: friend.name,
                friendsSince: f.created_at,
                status: f.status,
                isSender: isSender,
                isOnline: isOnline,
                level: totalLevel,
                title: cachedChar?.state?.selectedTitle || friend.state?.selectedTitle || friend.info?.selectedTitle || null,
                activities: activities,
                currentActivity: activities.length > 0 ? activities[0] : null,
                isBestFriend: f.is_best_friend || false,
                bestFriendRequestSender: f.best_friend_request_sender
            };
        }));
    }

    async _getFriendCount(characterId) {
        const { count, error } = await this.supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACCEPTED')
            .or(`sender_id.eq.${characterId},receiver_id.eq.${characterId}`);

        if (error) throw error;
        return count;
    }

    async sendFriendRequest(sender, receiverName) {
        // 0. Check Friend Limit (Sender)
        const myCount = await this._getFriendCount(sender.id);
        if (myCount >= 50) throw new Error("You have reached the maximum limit of 50 friends.");

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
            // Check limits for both parties before accepting
            const myCount = await this._getFriendCount(characterId);
            if (myCount >= 50) throw new Error("You have reached the maximum limit of 50 friends.");

            const senderCount = await this._getFriendCount(request.sender_id);
            if (senderCount >= 50) throw new Error("The sender has reached the maximum limit of 50 friends.");

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

    async requestBestFriend(senderId, friendId) {
        // Find friendship
        const { data, error } = await this.supabase
            .from('friends')
            .select('*')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${senderId})`)
            .eq('status', 'ACCEPTED')
            .single();

        if (error || !data) throw new Error("Friendship not found.");
        if (data.is_best_friend) throw new Error("You are already best friends!");
        if (data.best_friend_request_sender) throw new Error("A best friend request is already pending.");

        const { error: updateError } = await this.supabase
            .from('friends')
            .update({ best_friend_request_sender: senderId })
            .eq('id', data.id);

        if (updateError) throw updateError;
        return { success: true };
    }

    async respondBestFriend(userId, friendId, accept) {
        // Find friendship
        const { data, error } = await this.supabase
            .from('friends')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
            .eq('status', 'ACCEPTED')
            .single();

        if (error || !data) throw new Error("Friendship not found.");

        // Validation: user must NOT be the sender of the request
        if (data.best_friend_request_sender === userId) throw new Error("You cannot accept your own request.");
        if (!data.best_friend_request_sender) throw new Error("No pending best friend request.");

        let updates = {};
        if (accept) {
            updates = { is_best_friend: true, best_friend_request_sender: null };
        } else {
            updates = { best_friend_request_sender: null }; // Just clear the request
        }

        const { error: updateError } = await this.supabase
            .from('friends')
            .update(updates)
            .eq('id', data.id);

        if (updateError) throw updateError;
        return { success: true, accepted: accept };
    }

    async removeBestFriend(userId, friendId) {
        const { error } = await this.supabase
            .from('friends')
            .update({ is_best_friend: false, best_friend_request_sender: null })
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);

        if (error) throw error;
        return { success: true };
    }
}
