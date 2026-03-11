import { supabase } from "../../services/supabase.js";

export const registerTradeHandlers = (socket, gameManager, io) => {
  socket.on("trade_search_player", async ({ name }) => {
    try {
      const { data, error } = await supabase.from("characters").select("id, name, level").ilike("name", `%${name}%`).limit(10);
      if (error) throw error;
      socket.emit("trade_search_results", data);
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("trade_create", async ({ targetCharId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        const { data, error } = await supabase.from("trade_sessions").insert({
          sender_id: charId,
          receiver_id: targetCharId,
          status: "PENDING",
        }).select().single();
        if (error) throw error;
        
        io.to(`user_char:${targetCharId}`).emit("trade_request", { tradeId: data.id, senderId: charId });
        socket.emit("trade_created", data);
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  // ... other trade events ...
  // For brevity I'll assume standard implementation as they were mixed in index.js
  // I'll check index.js for the rest of trade events.
};
