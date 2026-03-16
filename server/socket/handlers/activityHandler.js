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

  socket.on("enqueue_activity", async ({ actionType, itemId, quantity }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.activityManager.enqueueActivity(
          socket.user.id,
          socket.data.characterId,
          actionType,
          itemId,
          quantity
        );
        socket.emit("activity_enqueued", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId
          )
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("remove_from_queue", async ({ index }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.activityManager.removeFromQueue(
          socket.user.id,
          socket.data.characterId,
          index
        );
        socket.emit("queue_updated", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId
          )
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("clear_queue", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined")
        return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.activityManager.clearQueue(
          socket.user.id,
          socket.data.characterId
        );
        socket.emit("queue_cleared", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId
          )
        );
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("reorder_queue", async ({ index, direction }) => {
    console.log(`[SOCKET] reorder_queue received: index=${index}, direction=${direction}, charId=${socket.data.characterId}`);
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") {
        console.warn("[SOCKET] reorder_queue: No characterId in socket data");
        return;
      }
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.activityManager.reorderQueue(
          socket.user.id,
          socket.data.characterId,
          index,
          direction
        );
        console.log(`[SOCKET] reorder_queue success, emitting updates`);
        socket.emit("queue_updated", result);
        socket.emit(
          "status_update",
          await gameManager.getStatus(
            socket.user.id,
            true,
            socket.data.characterId
          )
        );
      });
    } catch (err) {
      console.error(`[SOCKET] reorder_queue error:`, err);
      socket.emit("error", { message: err.message });
    }
  });
};
