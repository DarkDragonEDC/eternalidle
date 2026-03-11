export const registerGuildHandlers = (socket, gameManager, io) => {
  socket.on("create_guild", async ({ name, tag }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.createGuild(char, name, tag);
        socket.emit("guild_created", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      console.error("[GUILD] Error in create_guild socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("update_guild_customization", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.updateCustomization(char, data);
        socket.emit("guild_customization_updated", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      console.error("[GUILD] Error in update_guild_customization socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("search_guilds", async ({ query, countryCode }) => {
    try {
      const results = await gameManager.guildManager.searchGuilds(query, countryCode, socket.data.characterId);
      socket.emit("guild_search_results", results);
    } catch (err) {
      console.error("[GUILD] Error in search_guilds socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("leave_guild", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.leaveGuild(char);
        socket.emit("guild_left", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      console.error("[GUILD] Error in leave_guild socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("apply_to_guild", async ({ guildId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.applyToGuild(char, guildId);
        socket.emit("guild_application_sent", result);
      });
    } catch (err) {
      console.error("[GUILD] Error in apply_to_guild socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_guild_requests", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
      const requests = await gameManager.guildManager.getGuildRequests(char);
      socket.emit("guild_requests_data", requests);
    } catch (err) {
      console.error("[GUILD] Error in get_guild_requests socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("handle_guild_request", async ({ requestId, action }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.handleGuildRequest(char, requestId, action);
        socket.emit("guild_request_handled", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      console.error("[GUILD] Error in handle_guild_request socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("change_member_role", async ({ memberId, newRole }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.changeMemberRole(char, { memberId, newRole });
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in change_member_role socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("update_guild_role", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.updateGuildRole(char, data);
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in update_guild_role socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("reorder_guild_roles", async ({ roles }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.reorderGuildRoles(char, { roles });
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in reorder_guild_roles socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("get_guild_tasks", async () => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
      const tasks = await gameManager.guildManager.getGuildTasks(char);
      socket.emit("guild_tasks_data", tasks);
    } catch (err) {
      console.error("[GUILD] Error in get_guild_tasks socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("contribute_to_guild_task", async ({ taskId, amount }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.contributeToTask(char, { taskId, amount });
        socket.emit("guild_task_contribute_result", { success: true, tasks: result.tasks });
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      console.error("[GUILD] Error in contribute_to_guild_task socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("update_guild_settings", async ({ minLevel, joinMode }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.updateGuildSettings(char, { minLevel, joinMode });
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in update_guild_settings socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("delete_guild_role", async ({ roleId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.deleteGuildRole(char, { roleId });
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in delete_guild_role socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("kick_guild_member", async ({ memberId }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.kickMember(char, { memberId });
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in kick_guild_member socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("upgrade_guild_building", async (data) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.upgradeBuilding(char, data);
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in upgrade_guild_building socket:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("donate_to_guild_bank", async ({ silver, items }) => {
    try {
      if (!socket.data.characterId || socket.data.characterId === "undefined") return;
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = await gameManager.guildManager.donateToBank(char, { silver, items });
        if (result.success) {
          socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        }
      });
    } catch (err) {
      console.error("[GUILD] Error in donate_to_guild_bank socket:", err);
      socket.emit("error", { message: err.message });
    }
  });
};
