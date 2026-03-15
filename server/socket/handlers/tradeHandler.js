import { supabase } from "../../services/supabase.js";

export const registerTradeHandlers = (socket, gameManager, io) => {
  socket.on("trade_search_player", async ({ nickname, name }) => {
    try {
      const searchName = nickname || name;
      const { data, error } = await supabase.from("characters").select("id, name, skills").ilike("name", `%${searchName}%`).limit(10);
      if (error) throw error;
      
      const results = data.map(char => {
        const skills = char.skills || {};
        let totalLevel = 0;
        for (const key in skills) {
          if (skills[key] && typeof skills[key].level === 'number') {
            totalLevel += skills[key].level;
          }
        }
        return {
          id: char.id,
          name: char.name,
          level: totalLevel || 1
        };
      });

      socket.emit("trade_search_result", results);
    } catch (err) { socket.emit("trade_search_error", { message: err.message }); }
  });

  socket.on("trade_invite", async ({ receiverId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        if (!char) throw new Error("Character not found");

        const trade = await gameManager.tradeManager.createTrade(char, receiverId);
        
        // Notify the receiver
        io.to(`user_char:${trade.receiver_id}`).emit("trade_invite_received", {
          id: trade.id,
          sender_id: trade.sender_id,
          sender_name: trade.sender_name,
          tax_rate: trade.tax_rate
        });

        // Notify the sender to open their panel
        socket.emit("trade_started", trade);

        socket.emit("trade_invite_result", { success: true, tradeId: trade.id });
      });
    } catch (err) {
      socket.emit("trade_invite_result", { success: false, message: err.message });
    }
  });

  socket.on("trade_join", async ({ tradeId }) => {
    try {
      const charId = socket.data.characterId;
      const trade = await gameManager.tradeManager.getTrade(tradeId);
      
      if (trade.sender_id !== charId && trade.receiver_id !== charId) {
        throw new Error("Not authorized to join this trade.");
      }

      socket.emit("trade_joined", trade);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("trade_update_offer", async ({ tradeId, items, silver }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        const char = await gameManager.getCharacter(socket.user.id, charId);
        if (!char) throw new Error("Character not found");

        const trade = await gameManager.tradeManager.updateOffer(char, tradeId, items, silver);
        
        // Notify both parties
        io.to(`user_char:${trade.sender_id}`).emit("trade_update", trade);
        io.to(`user_char:${trade.receiver_id}`).emit("trade_update", trade);
      });
    } catch (err) {
      socket.emit("trade_error", { message: err.message });
    }
  });

  socket.on("trade_accept", async ({ tradeId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        const char = await gameManager.getCharacter(socket.user.id, charId);
        if (!char) throw new Error("Character not found");

        const result = await gameManager.tradeManager.acceptTrade(char, tradeId);
        
        if (result.status === 'COMPLETED') {
          // Success!
          io.to(`user_char:${result.sender_id}`).emit("trade_success", result);
          io.to(`user_char:${result.receiver_id}`).emit("trade_success", result);
          
          // Refresh character states for both
          const s = await gameManager.getStatus(null, false, result.sender_id);
          const r = await gameManager.getStatus(null, false, result.receiver_id);
          io.to(`user_char:${result.sender_id}`).emit("status_update", s);
          io.to(`user_char:${result.receiver_id}`).emit("status_update", r);
        } else {
          // Partial accept
          io.to(`user_char:${result.sender_id}`).emit("trade_update", result);
          io.to(`user_char:${result.receiver_id}`).emit("trade_update", result);
          socket.emit("trade_accept_result", { success: true });
        }
      });
    } catch (err) {
      socket.emit("trade_error", { message: err.message });
      socket.emit("trade_accept_result", { success: false, message: err.message });
    }
  });

  socket.on("trade_cancel", async ({ tradeId }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const charId = socket.data.characterId;
        const char = await gameManager.getCharacter(socket.user.id, charId);
        const result = await gameManager.tradeManager.cancelTrade(char, tradeId);
        
        io.to(`user_char:${result.sender_id}`).emit("trade_cancelled");
        io.to(`user_char:${result.receiver_id}`).emit("trade_cancelled");
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("trade_get_active", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') return socket.emit("trade_active_list", []);
      const trades = await gameManager.tradeManager.getActiveTrades(charId);
      socket.emit("trade_active_list", trades);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_my_trade_history", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') return socket.emit("my_trade_history_update", []);
      const history = await gameManager.tradeManager.getPersonalTradeHistory(charId);
      socket.emit("my_trade_history_update", history);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });
};
