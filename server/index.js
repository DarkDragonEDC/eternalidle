import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

import { supabase } from "./services/supabase.js";
import { authMiddleware } from "./authMiddleware.js";
import { GameManager } from "./GameManager.js";
import { characterRoutes } from "./routes/characters.js";
import { apiRoutes } from "./routes/api.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { initSocket } from "./socket/index.js";
import { startTicker } from "./ticker.js";
import { connectedSockets } from "./socket/registry.js";

dotenv.config();

process.on("unhandledRejection", (reason, promise) => {
  console.error("!!! Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("!!! Uncaught Exception:", err);
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  perMessageDeflate: {
    threshold: 256,
    zlibDeflateOptions: { level: 6 },
    zlibInflateOptions: { chunkSize: 16 * 1024 },
  },
});

const SERVER_VERSION = JSON.parse(fs.readFileSync("./package.json", "utf8")).version;
console.log(`[STARTUP] Eternal Idle Server v${SERVER_VERSION}`);

const gameManager = new GameManager(supabase);
gameManager.setSocketServer(io);

// Fix for offline protection
gameManager._isCharacterOnline = (charId) => {
    return Array.from(connectedSockets.values()).some(s => s.data?.characterId === charId);
};

// Global Stats Callback
gameManager.onGlobalStatsUpdate = (stats) => {
  io.emit("global_stats_update", stats);
};

// Route Middleware
app.use(cors());

// Webhook must be BEFORE express.json()
app.get("/", (req, res) => res.send("Eternal Idle Server is ONLINE on Port 3000. Please access http://localhost:5173 for the game."));
app.use("/api/webhooks", webhookRoutes(gameManager, io));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Domain Routes
app.use("/api", apiRoutes(gameManager, false)); // Public routes
app.use("/api/characters", authMiddleware, characterRoutes(gameManager));
app.use("/api", authMiddleware, apiRoutes(gameManager, true)); // Protected routes

// Initialize Modules
initSocket(io, gameManager, SERVER_VERSION);
startTicker(gameManager);

// Shutdown Handling
const shutdown = async (signal) => {
  console.log(`[SERVER] Received ${signal}. Persisting data and exiting...`);
  try {
    await gameManager.persistAllDirty();
    console.log("[SERVER] All dirty data persisted.");
  } catch (err) {
    console.error("[SERVER] Error during shutdown persistence:", err);
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const PORT = process.env.PORT || 3000;
// Force restart for Altar fix: RESTART-SYNC-0032
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} | Version: ${SERVER_VERSION}`);
});


