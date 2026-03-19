import { connectedSockets } from "./registry.js";
import { supabase } from "../services/supabase.js";
import { registerCharacterHandlers } from "./handlers/characterHandler.js";
import { registerActivityHandlers } from "./handlers/activityHandler.js";
import { registerCombatHandlers } from "./handlers/combatHandler.js";
import { registerInventoryHandlers } from "./handlers/inventoryHandler.js";
import { registerGuildHandlers } from "./handlers/guildHandler.js";
import { registerSocialHandlers } from "./handlers/socialHandler.js";
import { registerMarketHandlers } from "./handlers/marketHandler.js";
import { registerOrbStoreHandlers } from "./handlers/orbStoreHandler.js";
import { registerTradeHandlers } from "./handlers/tradeHandler.js";
import { registerQuestHandlers } from "./handlers/questHandler.js";
import { registerMiscHandlers } from "./handlers/miscHandler.js";

export const initSocket = (io, gameManager, serverVersion) => {
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
      console.log("[SOCKET-ENTRY] New connection attempt", socket.id);
      
      if (!authHeader) {
        console.warn("[SOCKET] No token provided", socket.id);
        return next(new Error("Authentication error: No token provided"));
      }

      const token = authHeader.replace("Bearer ", "");
      const startAuth = Date.now();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      console.log(`[SOCKET] Auth check took ${Date.now() - startAuth}ms for ${user?.email || 'unknown'}`);

      if (error || !user) {
        console.error("[SOCKET] Invalid user or auth error:", error);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = user;
      socket.data.user = user;
      next();
    } catch (err) { return next(new Error("Authentication error: " + err.message)); }
  });

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    console.log(`[SOCKET] Connected: ${socket.user?.email} (${socket.id}) IP: ${clientIp}`);

    if (socket.user?.id) {
      supabase.from("user_sessions").upsert({
        user_id: socket.user.id,
        last_active_at: new Date().toISOString(),
        ip_address: clientIp,
      }).then(({ error }) => { 
        // Silencing duplicate key logs during debug
        if (error && !error.message.includes('duplicate key')) {
           console.error("[SOCKET] session IP error:", error); 
        }
      });
      socket.join(`user:${socket.user.id}`);
    }

    connectedSockets.set(socket.id, socket);

    socket.emit("server_version", { version: serverVersion, vapidPublicKey: process.env.VAPID_PUBLIC_KEY });

    if (socket.user?.id) {
      gameManager.checkBan(socket.user.id).then((ban) => {
        if (ban) {
          if (ban.level === 1) { if (!ban.ack) socket.emit("account_status", { banWarning: ban.reason }); }
          else {
            let message = ban.level === 2 ? `Temporary ban (24h). Reason: ${ban.reason}` : `Permanent ban. Reason: ${ban.reason}`;
            socket.emit("ban_error", { type: "BANNED", message, level: ban.level, reason: ban.reason, remaining: ban.remaining });
          }
        }
      }).catch(err => console.error("[SOCKET] ban check error:", err));
    }

    socket.on("disconnect", async (reason) => {
      console.log(`[SOCKET] Disconnected: ${socket.id}. Reason: ${reason}`);
      connectedSockets.delete(socket.id);
      const charId = socket.data.characterId;
      if (charId) {
        try {
          await gameManager.executeLocked(socket.user.id, async () => {
            await gameManager.persistCharacter(charId);
            gameManager.removeFromCache(charId);
          });
        } catch (err) { console.error(`[SOCKET] disconnect persist error:`, err); }
      }
    });

    // Register all handlers
    registerCharacterHandlers(socket, gameManager, io);
    registerActivityHandlers(socket, gameManager, io);
    registerCombatHandlers(socket, gameManager, io);
    registerInventoryHandlers(socket, gameManager, io);
    registerGuildHandlers(socket, gameManager, io);
    registerSocialHandlers(socket, gameManager, io);
    registerMarketHandlers(socket, gameManager, io);
    registerOrbStoreHandlers(socket, gameManager, io);
    registerTradeHandlers(socket, gameManager, io);
    registerQuestHandlers(socket, gameManager, io);
    registerMiscHandlers(socket, gameManager, io);
  });
};
