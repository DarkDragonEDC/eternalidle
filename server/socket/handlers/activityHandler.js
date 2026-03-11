export const registerActivityHandlers = (socket, gameManager, io) => {
  socket.on("stop_activity", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.stopActivity(socket.user.id, socket.data.characterId);
        socket.emit("activity_stopped");
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("start_activity", async ({ actionType, itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.startActivity(
          socket.user.id,
          socket.data.characterId,
          actionType,
          itemId,
          quantity,
        );
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId,
          ),
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });
};
