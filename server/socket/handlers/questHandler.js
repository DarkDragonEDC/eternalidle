export const registerQuestHandlers = (socket, gameManager, io) => {
    socket.on('quest_interact', async ({ npcId }) => {
        if (!socket.data.characterId || !npcId) return;

        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (!char) return;

                gameManager.quests.interactWithNPC(char, npcId);
                // After interaction, we might want to send updated status
                socket.emit('quest_status_update', {
                    active: char.state.quests.active,
                    completed: char.state.quests.completed,
                    npcTalked: char.state.quests.npcTalked
                });
            });
        } catch (err) {
            console.error('[QUEST] Interaction error:', err);
            socket.emit('error', { message: 'Error interacting with NPC' });
        }
    });

    socket.on('quest_accept', async ({ questId }) => {
        if (!socket.data.characterId || !questId) return;

        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (!char) return;

                const result = gameManager.quests.acceptQuest(char, questId);
                if (result.success) {
                    socket.emit('quest_status_update', {
                        active: char.state.quests.active,
                        completed: char.state.quests.completed
                    });
                    socket.emit('action_result', { success: true, message: 'Quest accepted!' });
                } else {
                    socket.emit('error', { message: result.error });
                }
            });
        } catch (err) {
            console.error('[QUEST] Accept error:', err);
            socket.emit('error', { message: 'Error accepting quest' });
        }
    });

    socket.on('quest_claim', async ({ questId }) => {
        if (!socket.data.characterId || !questId) return;

        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (!char) return;

                const result = gameManager.quests.claimQuestReward(char, questId);
                if (result.success) {
                    socket.emit('quest_status_update', {
                        active: char.state.quests.active,
                        completed: char.state.quests.completed
                    });
                    // Also emit a full status update for inventory/silver changes
                    socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                    socket.emit('action_result', { success: true, message: 'Reward claimed!' });
                } else {
                    socket.emit('error', { message: result.error });
                }
            });
        } catch (err) {
            console.error('[QUEST] Claim error:', err);
            socket.emit('error', { message: 'Error claiming reward' });
        }
    });
};
