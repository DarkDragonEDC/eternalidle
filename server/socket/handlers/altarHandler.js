export const registerAltarHandlers = (socket, gameManager, io) => {
    socket.on("altar_get", async (data, callback) => {
        try {
            const userId = socket.user.id;
            const charId = socket.data.characterId;
            if (!charId) return callback({ error: "No active character" });

            const char = await gameManager.getCharacter(userId, charId);
            if (!char) return callback({ error: "Character not found" });

            const state = gameManager.altarManager.getAltarState(char);
            callback(state);
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("altar_donate", async (data, callback) => {
        try {
            const userId = socket.user.id;
            const charId = socket.data.characterId;
            if (!charId) return callback({ error: "No active character" });
            const { amount } = data;

            const state = await gameManager.altarManager.donate(userId, charId, amount);
            callback(state);
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("altar_activate", async (data, callback) => {
        try {
            const userId = socket.user.id;
            const charId = socket.data.characterId;
            if (!charId) return callback({ error: "No active character" });
            
            const tierIndex = data?.tier || 1;

            const state = await gameManager.altarManager.activateBuff(userId, charId, tierIndex);
            callback(state);
        } catch (err) {
            callback({ error: err.message });
        }
    });
};
