import express from "express";
import { supabase } from "../services/supabase.js";
import fs from "fs";

let activePlayersCache = {
  count: 0,
  timestamp: 0,
};

export const apiRoutes = (gameManager, isProtected = true) => {
  const router = express.Router();

  if (!isProtected) {
    router.get("/", (req, res) => {
      res.send("Eternal Idle Server is running");
    });

    router.get("/active_players", async (req, res) => {
      const now = Date.now();
      if (now - activePlayersCache.timestamp < 60000) {
        return res.json({ count: activePlayersCache.count, cached: true });
      }

      try {
        // IMPROVED: Count characters with active work (activities, combat, or dungeons)
        // This reflects everyone progressing in the idle game, not just connected sockets.
        const activeCount = await gameManager.getActivePlayersCount();
        
        activePlayersCache = { count: activeCount, timestamp: now };
        res.json({ count: activeCount });
      } catch (err) {
        res.status(500).json({ count: activePlayersCache.count || 0, error: err.message });
      }
    });

    router.get("/leaderboard", async (req, res) => {
      try {
        const type = req.query.type || "COMBAT";
        const mode = req.query.mode || "NORMAL";
        const response = await gameManager.getLeaderboard(type, null, mode);
        res.json({
          type: response.type,
          mode: response.mode,
          data: response.top100,
        });
      } catch (err) {
        res.status(500).json({ data: [], error: err.message });
      }
    });

    return router;
  }

  // Protected routes below
  router.get("/me", (req, res) => {
    res.json({ user: req.user, message: "You are authenticated!" });
  });

  router.post("/update_last_active", async (req, res) => {
    try {
      const { error } = await supabase.from("user_sessions").upsert({
        user_id: req.user.id,
        last_active_at: new Date().toISOString(),
        ip_address:
          req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip,
      });

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating last_active:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/last_active", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("last_active_at")
        .eq("user_id", req.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      res.json({
        last_active_at: data?.last_active_at || null,
        server_time: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error getting last_active:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/stats", async (req, res) => {
    res.json(gameManager.globalStats);
  });

  return router;
};
