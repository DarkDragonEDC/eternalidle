import { supabase } from "../../services/supabase.js";

export const registerSocialHandlers = (socket, gameManager, io) => {
  socket.on("send_message", async ({ content, channel = "GLOBAL" }) => {
    try {
      if (socket.user.is_anonymous) {
        return socket.emit("error", { message: "Guest accounts cannot send messages. Please register to chat!" });
      }

      const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
      if (!char) return;

      const lastChat = socket.data.lastChatTime || 0;
      const now = Date.now();
      const IS_ADMIN = !!char.is_admin;

      if (now - lastChat < 10000 && !IS_ADMIN && channel !== "Guild" && !content.startsWith("/")) {
        const remaining = Math.ceil((10000 - (now - lastChat)) / 1000);
        return socket.emit("error", { message: `Chat cooldown: Wait ${remaining}s` });
      }

      if (content.startsWith("/")) {
        const parts = content.slice(1).trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        const result = await gameManager.adminManager.handleCommand(socket, command, args);

        const sysMsgType = result.success ? "[SYSTEM]" : "[ERROR]";
        const sysMsgContent = result.success ? result.message || "Command executed successfully." : result.error || "Command failed.";
        
        const { data } = await supabase.from("messages").insert({
          user_id: socket.user.id,
          sender_name: sysMsgType,
          content: sysMsgContent,
          channel: "SYSTEM",
        }).select().single();

        socket.emit("new_message", data || {
          user_id: socket.user.id,
          sender_name: sysMsgType,
          content: sysMsgContent,
          channel: "SYSTEM",
          id: (result.success ? "sys-" : "err-") + Date.now(),
          created_at: new Date().toISOString(),
        });
        return;
      }

      if (channel !== "Guild") socket.data.lastChatTime = now;
      if (content.length > 100 && !char.is_admin) content = content.substring(0, 100);

      if (channel === "Guild" && !char.state?.guild_id) {
        return socket.emit("error", { message: "You must be in a guild to use the Guild chat." });
      }

      const targetChannel = channel === "Guild" ? `Guild-${char.state.guild_id}` : channel;
      const { data, error } = await supabase.from("messages").insert({
        user_id: socket.user.id,
        sender_name: char.name,
        sender_guild_tag: char.guild_tag || null,
        content,
        channel: targetChannel,
      }).select().single();

      if (error) {
        if (error.code === "42703") {
          const { data: retryData } = await supabase.from("messages").insert({
            user_id: socket.user.id,
            sender_name: char.name,
            sender_guild_tag: char.guild_tag || null,
            content,
          }).select().single();
          
          if (retryData) {
            retryData.channel = channel;
            if (!retryData.created_at) retryData.created_at = new Date().toISOString();
            if (channel === "Guild") gameManager.broadcastToGuild(char.state.guild_id, "new_message", retryData);
            else io.emit("new_message", retryData);
          }
        } else throw error;
      } else {
        const outData = { ...data, channel: data.channel || channel };
        if (!outData.created_at) outData.created_at = new Date().toISOString();
        if (channel === "Guild") {
          outData.channel = "Guild";
          gameManager.broadcastToGuild(char.state.guild_id, "new_message", outData);
        } else {
          io.emit("new_message", outData);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      socket.emit("error", { message: "Error sending message" });
    }
  });

  socket.on("get_chat_history", async () => {
    try {
      const channels = ["GLOBAL", "PTBR", "TRADE"];
      const queries = channels.map(ch => supabase.from("messages").select("*").eq("channel", ch).order("created_at", { ascending: false }).limit(50));
      queries.push(supabase.from("messages").select("*").or(`and(channel.eq.SYSTEM,user_id.eq.${socket.user.id}),and(channel.eq.SYSTEM,user_id.is.null)`).order("created_at", { ascending: false }).limit(50));
      
      const charId = socket.data.characterId;
      if (charId) {
        const char = await gameManager.getCharacter(socket.user.id, charId);
        if (char?.state?.guild_id) {
          queries.push(supabase.from("messages").select("*").eq("channel", `Guild-${char.state.guild_id}`).order("created_at", { ascending: false }).limit(50));
        }
      }

      const results = await Promise.all(queries);
      let allMessages = [];
      results.forEach(res => {
        if (res.data) {
          allMessages = allMessages.concat(res.data.map(msg => ({
            ...msg,
            channel: msg.channel?.startsWith("Guild-") ? "Guild" : msg.channel,
          })));
        }
      });

      allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const finalMessages = [];
      const seenIds = new Set();
      allMessages.forEach(m => {
        if (m.id && !seenIds.has(m.id)) {
          seenIds.add(m.id);
          finalMessages.push(m);
        }
      });
      socket.emit("chat_history", finalMessages);
    } catch (err) { console.error("Error fetching chat history:", err); }
  });

  socket.on("get_friends", async () => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') return socket.emit("friends_list_update", []);
      const friends = await gameManager.socialManager.getFriends(charId);
      socket.emit("friends_list_update", friends);
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("add_friend", async ({ friendName }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, charId);
        await gameManager.socialManager.sendFriendRequest(char, friendName);
        socket.emit("friend_action_success", { message: `Request sent to ${friendName}!` });
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("respond_friend_request", async ({ requestId, accept }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.socialManager.respondToRequest(charId, requestId, accept);
        socket.emit("friend_action_success", { message: accept ? "Request accepted!" : "Request rejected." });
        socket.emit("friends_list_update", await gameManager.socialManager.getFriends(charId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("remove_friend", async ({ friendId }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.socialManager.removeFriend(charId, friendId);
        socket.emit("friend_action_success", { message: "Friend removed." });
        socket.emit("friends_list_update", await gameManager.socialManager.getFriends(charId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("cancel_friend_request", async ({ requestId }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.socialManager.cancelFriendRequest(charId, requestId);
        socket.emit("friend_action_success", { message: "Request cancelled." });
        socket.emit("friends_list_update", await gameManager.socialManager.getFriends(charId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("request_best_friend", async ({ friendId }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.socialManager.requestBestFriend(charId, friendId);
        socket.emit("friend_action_success", { message: "Best Friend Request Sent!" });
        socket.emit("friends_list_update", await gameManager.socialManager.getFriends(charId));
        
        io.to(`user_char:${friendId}`).emit("friends_list_update", await gameManager.socialManager.getFriends(friendId));
        io.to(`user_char:${friendId}`).emit("friend_action_success", { message: "New Best Friend Request!" });
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("respond_best_friend", async ({ friendId, accept }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.socialManager.respondBestFriend(charId, friendId, accept);
        socket.emit("friend_action_success", { message: accept ? "Best Friend Accepted!" : "Request Declined." });
        socket.emit("friends_list_update", await gameManager.socialManager.getFriends(charId));

        io.to(`user_char:${friendId}`).emit("friends_list_update", await gameManager.socialManager.getFriends(friendId));
        if (accept) io.to(`user_char:${friendId}`).emit("friend_action_success", { message: "You are now Best Friends!" });
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("remove_best_friend", async ({ friendId }) => {
    try {
      const charId = socket.data.characterId;
      if (!charId || charId === 'undefined') throw new Error("Please wait for the game to load.");
      await gameManager.executeLocked(socket.user.id, async () => {
        await gameManager.socialManager.removeBestFriend(charId, friendId);
        socket.emit("friend_action_success", { message: "Best Friend removed." });
        socket.emit("friends_list_update", await gameManager.socialManager.getFriends(charId));

        io.to(`user_char:${friendId}`).emit("friends_list_update", await gameManager.socialManager.getFriends(friendId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("get_public_profile", async ({ characterName, name }) => {
    try {
      const targetName = characterName || name;
      const profile = await gameManager.socialManager.getPublicProfile(targetName);
      socket.emit("public_profile_data", profile);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });
};
