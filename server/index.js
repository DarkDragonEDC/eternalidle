import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import Stripe from 'stripe';
import { getStoreItem, getAllStoreItems } from '../shared/crownStore.js';

dotenv.config();


const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
if (!stripe) {
    console.warn("WARNING: STRIPE_SECRET_KEY not found. Crown Store purchases will be disabled.");
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('!!! Uncaught Exception:', err);
});


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for alpha/testing to avoid Vercel block
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Manual socket registry for Ticker reliability
const connectedSockets = new Map();

app.use(cors());

// Webhook must be BEFORE express.json() to get raw body
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    if (!stripe) {
        return res.status(503).send('Stripe not configured');
    }

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret'
        );
    } catch (err) {
        console.error(`[STRIPE] Webhook Signature Error: ${err.message}`);
        console.error(`[STRIPE] Expected Secret: ${process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10)}...`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[STRIPE] Webhook received: ${event.type}`);

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        let { userId, characterId, crownAmount, packageId } = session.metadata || {};

        // Deliver based on metadata - dynamic sessions ALWAYS have these
        console.log(`[STRIPE] Delivery started: User=${userId}, Char=${characterId}, Crowns=${crownAmount}, Package=${packageId}`);

        if (!userId || !characterId) {
            console.error('[STRIPE] Error: Missing critical metadata in session', session.metadata);
            return res.json({ received: true, error: 'missing_metadata' });
        }

        try {
            await gameManager.executeLocked(userId, async () => {
                console.log(`[STRIPE] Lock acquired for user ${userId}`);
                const char = await gameManager.getCharacter(userId, characterId, false, true); // Bypass cache to be safe

                if (!char) {
                    console.error(`[STRIPE] Error: Character ${characterId} not found for user ${userId}`);
                    return;
                }

                console.log(`[STRIPE] Character found: ${char.name}. Current Crowns: ${char.state.crowns || 0}`);

                let result;
                let deliveryMessage = '';

                if (packageId === 'MEMBERSHIP') {
                    // Purchase is MEMBERSHIP
                    const added = gameManager.inventoryManager.addItemToInventory(char, 'MEMBERSHIP', 1);
                    if (added) {
                        result = { success: true, message: 'Membership item added to inventory!' };
                    } else {
                        // Inventory Full - Add to Claims instead
                        gameManager.marketManager.addClaim(char, {
                            type: 'PURCHASED_ITEM',
                            itemId: 'MEMBERSHIP',
                            amount: 1,
                            name: 'Membership',
                            timestamp: Date.now()
                        });
                        result = { success: true, message: 'Inventory full! Membership item sent to Market -> Claims tab.' };
                    }
                    deliveryMessage = result.message;
                } else {
                    // Standard crowns package
                    result = gameManager.crownsManager.addCrowns(char, parseInt(crownAmount), `STRIPE_${packageId}`);
                    deliveryMessage = `Payment confirmed! Added ${crownAmount} Orbs.`;
                }

                console.log(`[STRIPE] Delivery result: ${JSON.stringify(result)}`);

                if (result.success) {
                    await gameManager.saveState(char.id, char.state);
                    console.log(`[STRIPE] State saved successfully for ${char.name}`);

                    // Notify client if connected
                    const userSockets = Array.from(connectedSockets.values())
                        .filter(s => s.user?.id === userId);

                    console.log(`[STRIPE] Found ${userSockets.length} active sockets to notify`);

                    userSockets.forEach(s => {
                        s.emit('crown_purchase_success', {
                            message: deliveryMessage,
                            newBalance: char.state.crowns
                        });
                        // Also trigger a full status update
                        gameManager.getStatus(userId, true, characterId).then(status => {
                            s.emit('status_update', status);
                        });
                    });
                } else {
                    console.error(`[STRIPE] addCrowns failed: ${result.error}`);
                }
            });
        } catch (err) {
            console.error('[STRIPE] Critical Error processing delivery:', err);
        }
    }

    res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { authMiddleware } from './authMiddleware.js';

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;


if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("WARNING: Supabase credentials not found in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('[DEBUG] SUPABASE_URL:', SUPABASE_URL);
console.log('[DEBUG] SUPABASE_KEY starts with:', SUPABASE_KEY?.substring(0, 10));
console.log('[DEBUG] SUPABASE_KEY ends with:', SUPABASE_KEY?.substring(SUPABASE_KEY.length - 10));

const isServiceRole = SUPABASE_KEY?.includes('NlcnZpY2Vfcm9sZ');
console.log('[SERVER] Supabase Key Role:', isServiceRole ? 'SERVICE_ROLE' : 'ANON');

import { GameManager } from './GameManager.js';
const gameManager = new GameManager(supabase);
gameManager.setSocketServer(io);

// Register Global Stats Update Callback
gameManager.onGlobalStatsUpdate = (stats) => {
    io.emit('global_stats_update', stats);
};

import { characterRoutes } from './routes/characters.js';
app.use('/api/characters', authMiddleware, characterRoutes(gameManager));

// Public route
app.get('/', (req, res) => {
    res.send('Jogo 2.0 Server is running');
});

// Protected route example
app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ user: req.user, message: "You are authenticated!" });
});

// Update Last Active Timestamp
app.post('/api/update_last_active', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('user_sessions')
            .upsert({
                user_id: req.user.id,
                last_active_at: new Date().toISOString(),
                ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
            });

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating last_active:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Last Active Timestamp
app.get('/api/last_active', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('last_active_at')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        res.json({ last_active_at: data?.last_active_at || null, server_time: new Date().toISOString() });
    } catch (err) {
        console.error('Error getting last_active:', err);
        res.status(500).json({ error: err.message });
    }
});

// Cache for active players count
let activePlayersCache = {
    count: 0,
    timestamp: 0
};

// Public route for active accounts count (unique users with active characters)
app.get('/api/active_players', async (req, res) => {
    const now = Date.now();

    // Return cached value if it's less than 60 seconds old
    if (now - activePlayersCache.timestamp < 60000) {
        return res.json({ count: activePlayersCache.count, cached: true });
    }

    // Persistent log for debugging
    const logMsg = `[${new Date().toISOString()}] Counter refreshed. Origin: ${req.headers.origin}\n`;
    try {
        if (!fs.existsSync('logs')) fs.mkdirSync('logs');
        fs.appendFileSync('logs/access.log', logMsg);
    } catch (e) { }

    try {
        // Fetch user_id for all characters that have an active activity
        // Optimization: We could also check combat/dungeon columns if they are separate now
        const { data, error } = await supabase
            .from('characters')
            .select('user_id')
            .not('current_activity', 'is', null);

        if (error) throw error;

        // Count unique user_ids to get "active accounts"
        const uniqueUsers = new Set((data || []).map(c => c.user_id)).size;

        // Update cache
        activePlayersCache = {
            count: uniqueUsers,
            timestamp: now
        };

        res.json({ count: uniqueUsers });
    } catch (err) {
        console.error('[SERVER] Error:', err);
        res.status(500).json({ count: activePlayersCache.count || 0, error: err.message });
    }
});

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        console.warn(`[SOCKET AUTH] No token provided for socket: ${socket.id}`);
        return next(new Error("Authentication error: No token provided"));
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error(`[SOCKET AUTH] Invalid token for socket: ${socket.id}`, error?.message);
            return next(new Error("Authentication error: Invalid token"));
        }

        socket.user = user;
        socket.data.user = user;
        next();
    } catch (err) {
        return next(new Error("Authentication error: " + err.message));
    }
});

io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.user?.email || 'Unknown'} (Socket: ${socket.id})`);
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`[SOCKET] User connected: ${socket.user?.email || 'Unknown'} (Socket: ${socket.id}, IP: ${clientIp})`);

    // Log IP to user_sessions immediately on connection
    if (socket.user?.id) {
        supabase.from('user_sessions').upsert({
            user_id: socket.user.id,
            last_active_at: new Date().toISOString(),
            ip_address: clientIp
        }).then(({ error }) => {
            if (error) console.error('[SOCKET] Error logging session IP:', error);
        });
    }

    connectedSockets.set(socket.id, socket);

    // Version Handshake for Auto-Refresh
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    socket.emit('server_version', { version: pkg.version });

    socket.on('disconnect', async (reason) => {
        console.log(`[SOCKET] User disconnected: ${socket.id}. Reason: ${reason}`);
        connectedSockets.delete(socket.id);

        const charId = socket.data.characterId;
        if (charId) {
            try {
                // Save immediately on disconnect to prevent rollback
                await gameManager.persistCharacter(charId);
                // Clear cache so next login starts fresh from DB (important for manual edits)
                gameManager.removeFromCache(charId);
                console.log(`[SOCKET] Char ${charId} persisted and cleared from cache on disconnect.`);
            } catch (err) {
                console.error(`[SOCKET] Error persisting char ${charId} on disconnect:`, err);
            }
        }
    });

    socket.on('join_character', async ({ characterId }) => {
        if (!characterId || characterId === 'undefined') return;
        const userId = socket.user.id;

        socket.join(`user:${userId}`);

        console.log(`[SOCKET] User ${socket.user.email} attempting to join character ${characterId}`);

        try {
            // Note: Removed syncWithDatabase here - it was preventing catchup from working
            // because it populated cache with old DB data BEFORE getStatus could run catchup.
            // The getStatus with bypassCache=true handles fresh loading properly.

            // Immediately send status for this character (with catchup=true for offline progress)
            await gameManager.executeLocked(userId, async () => {
                const status = await gameManager.getStatus(socket.user.id, true, characterId, true);

                // CRITICAL FIX: Only assign characterId to socket AFTER catchup ensures state is valid.
                // Previous race condition: assigning before lock allowed Ticker Loop to processTick() 
                // on a raw DB loaded char (catchup=false), resetting last_saved and erasing offline progress.
                socket.data.characterId = characterId;

                socket.emit('status_update', status);
                socket.emit('global_stats_update', gameManager.globalStats);
                console.log(`[SOCKET] User ${socket.user.email} successfully joined character ${characterId}`);
            });
        } catch (err) {
            console.error(`[SOCKET] Error joining character ${characterId}:`, err);
            socket.emit('error', { message: "Failed to load character data." });
        }
    });

    socket.on('get_status', async () => {
        try {
            const charId = socket.data.characterId;
            if (!charId || charId === 'undefined') return; // Prevent crash if not joined yet

            await gameManager.executeLocked(socket.user.id, async () => {
                const status = await gameManager.getStatus(socket.user.id, true, charId, true);
                socket.emit('status_update', status);
            });
        } catch (err) {
            console.error(`[SERVER] Error in get_status: `, err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_leaderboard', async (payload) => {
        try {
            const charId = socket.data.characterId;
            // Support both old (string) and new (object) formats for backward compatibility
            let type = 'COMBAT';
            let mode = 'NORMAL';

            if (typeof payload === 'string') {
                type = payload;
            } else if (typeof payload === 'object') {
                type = payload.type || 'COMBAT';
                mode = payload.mode || 'NORMAL';
            }

            const response = await gameManager.getLeaderboard(type, charId, mode);
            socket.emit('leaderboard_update', response);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('create_character', async ({ name, isIronman }) => {
        console.log(`[SERVER] Received create_character request: "${name}" (Ironman: ${isIronman}) from user ${socket.user.email} `);
        try {
            const char = await gameManager.createCharacter(socket.user.id, name, isIronman);
            console.log(`[SERVER] Character created successfully: "${name}"`);
            socket.emit('character_created', char);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, char.id));
        } catch (err) {
            console.error(`[SERVER] Error creating character "${name}": `, err.message);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_activity', async ({ actionType, itemId, quantity }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startActivity(socket.user.id, socket.data.characterId, actionType, itemId, quantity);
                socket.emit('activity_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error starting activity:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_reward', async () => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.claimReward(socket.user.id, socket.data.characterId);
                socket.emit('reward_claimed', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error claiming reward:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_dungeon', async ({ tier, dungeonId, repeatCount }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startDungeon(socket.user.id, socket.data.characterId, dungeonId, repeatCount);
                socket.emit('dungeon_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error starting dungeon:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('change_name', async ({ newName }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (!char) throw new Error("Character not found");

                if (!char.state.pendingNameChange) {
                    throw new Error("You do not have a pending name change!");
                }

                // Name Validation
                const safeName = (newName || "").trim();
                if (safeName.length < 3 || safeName.length > 20) {
                    throw new Error("Name must be between 3 and 20 characters.");
                }
                if (!/^[a-zA-Z0-9_ ]+$/.test(safeName)) {
                    throw new Error("Name can only contain letters, numbers, spaces, and underscores.");
                }

                // Check Uniqueness handled by DB constraint unique violation (23505) but we can pre-check too
                // But let's trust the error handler we write below

                // Update in DB (Characters table 'name' column)
                // We need to update both the column AND the state if name is stored there (it's not usually, but good to check)

                const { error } = await supabase
                    .from('characters')
                    .update({ name: safeName })
                    .eq('id', char.id);

                if (error) {
                    if (error.code === '23505') throw new Error("Name already taken via DB Check.");
                    throw error;
                }

                // Success
                char.name = safeName;
                char.state.pendingNameChange = false;

                await gameManager.saveState(char.id, char.state); // Save the flag removal

                socket.emit('name_changed', { success: true, newName: safeName });
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error("Name Change Error:", err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('change_title', async ({ title }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (!char) throw new Error("Character not found");

                // Validation
                const unlocked = char.state.unlockedTitles || [];
                if (title && title !== 'None' && !unlocked.includes(title)) {
                    throw new Error("You haven't unlocked this title yet!");
                }

                char.state.selectedTitle = (title === 'None' || !title) ? null : title;
                await gameManager.saveState(char.id, char.state);

                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error("Title Change Error:", err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_public_profile', async ({ characterName }) => {
        try {
            console.log(`[SOCKET] get_public_profile for: ${characterName}`);
            const profile = await gameManager.getPublicProfile(characterName);
            socket.emit('public_profile_data', profile);
        } catch (err) {
            console.error("Inspect Error:", err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_dungeon', async () => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.stopDungeon(socket.user.id, socket.data.characterId);
                socket.emit('dungeon_stopped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_combat', async ({ tier, mobId }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startCombat(socket.user.id, socket.data.characterId, mobId, tier);
                socket.emit('combat_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error starting combat:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_combat', async () => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const userId = socket.user.id;
                const result = await gameManager.stopCombat(userId, socket.data.characterId);
                socket.emit('action_result', result);
                const status = await gameManager.getStatus(userId, true, socket.data.characterId);
                socket.emit('status_update', status);
            });
        } catch (err) {
            socket.emit('error', err.message);
        }
    });


    socket.on('equip_item', async ({ itemId }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.equipItem(socket.user.id, socket.data.characterId, itemId);
                socket.emit('item_equipped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('unequip_item', async ({ slot }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.unequipItem(socket.user.id, socket.data.characterId, slot);
                socket.emit('item_unequipped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error unequipping item:', err);
            socket.emit('error', { message: err.message });
        }
    });

    // --- WORLD BOSS ---
    socket.on('get_world_boss_status', async () => {
        try {
            // console.log(`[WORLD_BOSS] get_status called for char: ${socket.data?.characterId}`);
            if (!socket.data?.characterId) {
                console.warn('[WORLD_BOSS] get_status: No characterId on socket!');
                return;
            }
            const status = await gameManager.worldBossManager.getStatus(socket.data.characterId);
            socket.emit('world_boss_status', status);
            // console.log('[WORLD_BOSS] status sent to client.');
        } catch (err) {
            console.error('[WORLD_BOSS] get_status error:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_world_boss_ranking_history', async ({ date }) => {
        try {
            const rankings = await gameManager.worldBossManager.getRankingHistory(date);
            socket.emit('world_boss_ranking_history', { date, rankings });
        } catch (err) {
            console.error('[WORLD_BOSS] history error:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('challenge_world_boss', async () => {
        console.log(`[WORLD_BOSS] challenge_world_boss event received! charId=${socket.data?.characterId}`);
        try {
            if (!socket.data.characterId) return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.worldBossManager.startFight(char);
                socket.emit('world_boss_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('sell_item', async ({ itemId, quantity }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.sellItem(socket.user.id, socket.data.characterId, itemId, quantity);
                socket.emit('item_sold', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('dismantle_item', async ({ itemId, quantity = 1 }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.dismantleItem(socket.user.id, socket.data.characterId, itemId, quantity);
                socket.emit('item_dismantled', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('use_item', async ({ itemId, quantity = 1 }) => {
        console.log(`[DEBUG-SOCKET] Received use_item for ${itemId}`, quantity);
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.consumeItem(socket.user.id, socket.data.characterId, itemId, quantity);
                socket.emit('item_used', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_activity', async () => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                await gameManager.stopActivity(socket.user.id, socket.data.characterId);
                socket.emit('activity_stopped');
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_market_listings', async (filters) => {
        try {
            // Note: getMarketListings does NOT require a characterId.
            const listings = await gameManager.getMarketListings(filters);
            socket.emit('market_listings_update', listings);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    // Get lowest market price for a specific item
    socket.on('get_item_market_price', async ({ itemId }) => {
        try {
            // Strip signature to find all identical items regardless of creator
            const baseId = itemId.split('::')[0];

            const { data, error } = await supabase
                .from('market_listings')
                .select('price, amount, item_id')
                .or(`item_id.eq.${baseId},item_id.like.${baseId}::%`);

            console.log(`[MARKET PRICE] baseId: "${baseId}", results:`, data?.length || 0);


            if (data && data.length > 0) {
                // Calculate unit price for each listing and find the lowest
                const unitPrices = data.map(l => Math.floor(l.price / l.amount));
                const lowestPrice = Math.min(...unitPrices);
                socket.emit('item_market_price', { itemId, lowestPrice });
            } else {
                socket.emit('item_market_price', { itemId, lowestPrice: null });
            }
        } catch (err) {
            console.error('[MARKET PRICE] Error:', err);
            socket.emit('item_market_price', { itemId, lowestPrice: null });
        }
    });

    socket.on('list_market_item', async ({ itemId, amount, price, metadata }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.listMarketItem(socket.user.id, socket.data.characterId, itemId, amount, price, metadata);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                // Broadcast update to all
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('buy_market_item', async ({ listingId, quantity }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.buyMarketItem(socket.user.id, socket.data.characterId, listingId, quantity);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                // Broadcast update to all
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            console.error("Buy Error:", err);
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('cancel_listing', async ({ listingId }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.cancelMarketListing(socket.user.id, socket.data.characterId, listingId);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                // Broadcast update to all
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('craft_rune', async ({ shardId, qty = 1, category = 'GATHERING' }) => {
        console.log(`[SERVER] Received craft_rune request from ${socket.user.email} for shard ${shardId}, qty ${qty}, category ${category}`);
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.craftRune(socket.user.id, socket.data.characterId, shardId, qty, category);
                if (result.success) {
                    socket.emit('craft_rune_success', result);
                    socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                } else {
                    socket.emit('error', { message: result.error });
                }
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('upgrade_rune', async ({ runeId, qty = 1 }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.upgradeRune(socket.user.id, socket.data.characterId, runeId, qty);
                if (result.success) {
                    socket.emit('craft_rune_success', result); // Reusing same success event since structure is similar
                    socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                } else {
                    socket.emit('error', { message: result.error });
                }
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('auto_merge_runes', async ({ filters = {} } = {}) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.autoMergeRunes(socket.user.id, socket.data.characterId, filters);
                socket.emit('craft_rune_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_market_item', async ({ claimId }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.claimMarketItem(socket.user.id, socket.data.characterId, claimId);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('get_chat_history', async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            socket.emit('chat_history', data.reverse());
        } catch (err) {
            console.error('Error fetching chat history:', err);
        }
    });

    socket.on('get_combat_history', async () => {
        try {
            // Fix: Fetch history for the SELECTED character
            const charId = socket.data.characterId;
            if (!charId) return;

            const { data, error } = await supabase
                .from('combat_history')
                .select('*')
                .eq('character_id', charId)
                .order('occurred_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            socket.emit('combat_history_update', data);
        } catch (err) {
            console.error('Error fetching combat history:', err);
            socket.emit('error', { message: 'Failed to fetch combat history' });
        }
    });

    socket.on('get_dungeon_history', async () => {
        try {
            const charId = socket.data.characterId;
            if (!charId) return;

            const { data, error } = await supabase
                .from('dungeon_history')
                .select('*')
                .eq('character_id', charId)
                .order('occurred_at', { ascending: false })
            if (error) throw error;
            socket.emit('dungeon_history_update', data);
        } catch (err) {
            console.error('Error fetching dungeon history:', err);
            socket.emit('error', { message: `Failed to fetch dungeon history: ${err.message}` });
        }
    });

    socket.on('get_market_history', async () => {
        try {
            const history = await gameManager.marketManager.getGlobalHistory();
            socket.emit('market_history_update', history);
        } catch (err) {
            console.error('[SOCKET] Error getting market history:', err);
            socket.emit('error', { message: 'Failed to fetch market history.' });
        }
    });

    socket.on('get_my_market_history', async () => {
        try {
            const history = await gameManager.marketManager.getPersonalHistory(socket.user.id);
            socket.emit('my_market_history_update', history);
        } catch (err) {
            console.error('[SOCKET] Error getting personal market history:', err);
            socket.emit('error', { message: 'Failed to fetch your market history.' });
        }
    });

    socket.on('get_my_trade_history', async () => {
        try {
            const history = await gameManager.tradeManager.getPersonalTradeHistory(socket.user.id);
            socket.emit('my_trade_history_update', history);
        } catch (err) {
            console.error('[SOCKET] Error getting personal trade history:', err);
            socket.emit('error', { message: 'Failed to fetch your trade history.' });
        }
    });

    // --- DAILY SPIN EVENTS ---
    socket.on('request_daily_status', async () => {
        // FIX: Use executeLocked to prevent race condition with join_character catchup
        await gameManager.executeLocked(socket.user.id, async () => {
            const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
            if (!char) return;

            const canSpin = await gameManager.dailyRewardManager.canSpin(char);
            console.log(`[SOCKET] Daily status requested for user ${socket.user.email} (char ${socket.data.characterId}): canSpin=${canSpin}`);
            socket.emit('daily_status', { canSpin });
        });
    });

    socket.on('spin_daily', async () => {
        if (socket.user.is_anonymous) {
            return socket.emit('error', { message: "Daily Spin is locked for Guest accounts." });
        }
        // FIX: Use executeLocked to prevent race condition
        await gameManager.executeLocked(socket.user.id, async () => {
            const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
            if (!char) return;

            try {
                const result = await gameManager.dailyRewardManager.spin(char);
                if (result.success) {
                    // Return result to client
                    socket.emit('daily_spin_result', result);
                    // Also update status immediately
                    socket.emit('daily_status', { canSpin: false });
                } else {
                    socket.emit('error', { message: result.error });
                }
            } catch (err) {
                console.error('Daily spin error:', err);
                socket.emit('error', { message: "Failed to process daily spin." });
            }
        });
    });


    socket.on('send_message', async ({ content }) => {
        try {
            // Cooldown Check (10s)
            const lastChat = socket.data.lastChatTime || 0;
            const now = Date.now();
            const ADMIN_IDS = ['5093ffaa-4770-4123-a83b-fca97a30601b', 'eea1abae-badf-4043-a3bf-1a18f4143dd2'];
            const IS_ADMIN = ADMIN_IDS.includes(socket.user.id);
            if (now - lastChat < 10000 && !IS_ADMIN) {
                // Allow commands to bypass cooldown
                if (!content.startsWith('/')) {
                    const remaining = Math.ceil((10000 - (now - lastChat)) / 1000);
                    socket.emit('error', { message: `Chat cooldown: Wait ${remaining}s` });
                    return;
                }
            }

            // check for commands
            if (content.startsWith('/')) {
                const parts = content.slice(1).trim().split(/\s+/);
                const command = parts[0].toLowerCase();
                const args = parts.slice(1);

                const result = await gameManager.adminManager.handleCommand(socket, command, args);

                if (result.success) {
                    // Send feedback as a system message in chat
                    socket.emit('new_message', {
                        id: 'sys-' + Date.now(),
                        sender_name: '[SYSTEM]',
                        content: result.message || 'Command executed successfully.',
                        created_at: new Date().toISOString()
                    });
                } else {
                    // Send error as a system message in chat
                    socket.emit('new_message', {
                        id: 'err-' + Date.now(),
                        sender_name: '[ERROR]',
                        content: result.error || 'Command failed.',
                        created_at: new Date().toISOString()
                    });
                }
                return; // Do not broadcast commands to global chat
            }

            const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
            if (!char) return;

            socket.data.lastChatTime = now;

            // Enforce character limit
            if (content.length > 100) {
                content = content.substring(0, 100);
            }

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    user_id: socket.user.id,
                    sender_name: char.name,
                    content: content
                })
                .select()
                .single();
            if (error) throw error;
            io.emit('new_message', data);
        } catch (err) {
            console.error('Error sending message:', err);
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    // --- TRADE EVENTS ---
    socket.on('trade_search_player', async ({ nickname }) => {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('id, name, state, skills')
                .ilike('name', `%${nickname}%`)
                .limit(10);

            if (error) throw error;
            if (!data || data.length === 0) {
                socket.emit('error', { message: "No players found matching that name." });
                return;
            }

            const results = data.map(char => {
                const skills = char.skills || char.state?.skills || {};
                const level = Object.values(skills).reduce((acc, s) => acc + (Number(s?.level) || 0), 0);
                return {
                    id: char.id,
                    name: char.name,
                    level: Math.max(1, level),
                    isIronman: !!(char.state?.isIronman || char.name?.toLowerCase().includes('[im]'))
                };
            });

            socket.emit('trade_search_result', results);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('trade_create', async ({ receiverName }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Trading is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const trade = await gameManager.tradeManager.createTrade(char, receiverName);
                socket.emit('trade_update', trade);

                // Notify receiver if online
                const receiverSockets = Array.from(connectedSockets.values())
                    .filter(s => s.data.characterId === trade.receiver_id);
                receiverSockets.forEach(s => s.emit('trade_invite', trade));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('trade_get_active', async () => {
        try {
            const charId = socket.data.characterId;
            if (!charId || charId === 'undefined' || charId === 'null') return;
            const { data, error } = await supabase
                .from('trade_sessions')
                .select('*')
                .eq('status', 'PENDING')
                .or(`sender_id.eq.${charId},receiver_id.eq.${charId}`);

            if (error) throw error;

            // Fetch partner names for each trade
            const enriched = await Promise.all((data || []).map(async (trade) => {
                const partnerId = trade.sender_id === charId ? trade.receiver_id : trade.sender_id;
                const { data: partnerData } = await supabase
                    .from('characters')
                    .select('name')
                    .eq('id', partnerId)
                    .single();

                return {
                    ...trade,
                    partner_name: partnerData?.name || 'Unknown'
                };
            }));

            socket.emit('trade_list', enriched);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('trade_update_offer', async ({ tradeId, items, silver }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Trading is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const trade = await gameManager.tradeManager.updateOffer(char, tradeId, items, silver);

                // Notify both if online
                const affectedIds = [trade.sender_id, trade.receiver_id];
                Array.from(connectedSockets.values())
                    .filter(s => affectedIds.includes(s.data.characterId))
                    .forEach(s => s.emit('trade_update', trade));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('trade_accept', async ({ tradeId }) => {
        try {
            if (socket.user.is_anonymous) throw new Error("Trading is locked for Guest accounts.");
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.tradeManager.acceptTrade(char, tradeId);

                // Notify both if online
                const affectedIds = [result.sender_id, result.receiver_id];
                const socketsToNotify = Array.from(connectedSockets.values())
                    .filter(s => affectedIds.includes(s.data.characterId));

                socketsToNotify.forEach(s => {
                    s.emit('trade_update', result);
                    if (result.status === 'COMPLETED') {
                        s.emit('trade_success', { message: 'Trade completed successfully!' });
                        // Push full status update to refresh inventory/silver
                        gameManager.getStatus(s.user.id, true, s.data.characterId).then(status => {
                            s.emit('status_update', status);
                        });
                    }
                });
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('trade_cancel', async ({ tradeId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.tradeManager.cancelTrade(char, tradeId);

                // Notify both if online
                // Since cancelTrade doesn't return the trade object with IDs easily, we should handle it better, 
                // but for now we trust the tradeId and status CANCELLED.
                socket.emit('trade_update', { id: tradeId, status: 'CANCELLED' });
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });



    socket.on('acknowledge_offline_report', async () => {
        try {
            await gameManager.clearOfflineReport(socket.user.id, socket.data.characterId);
        } catch (err) {
            console.error('Error clearing offline report:', err);
        }
    });

    socket.on('mark_notification_read', async ({ notificationId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (char && char.state.notifications) {
                    const notif = char.state.notifications.find(n => n.id === notificationId);
                    if (notif) {
                        notif.read = true;
                        await gameManager.saveState(char.id, char.state);

                        // Emit updated status immediately
                        const status = await gameManager.getStatus(socket.user.id, false, char.id);
                        socket.emit('game_status', status);
                    }
                }
            });
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    });

    socket.on('clear_notifications', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (char && char.state.notifications) {
                    char.state.notifications = [];
                    await gameManager.saveState(char.id, char.state);

                    // Emit updated status immediately
                    const status = await gameManager.getStatus(socket.user.id, false, char.id);
                    socket.emit('game_status', status);
                }
            });
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    });

    socket.on('mark_all_notifications_read', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (char && char.state.notifications) {
                    char.state.notifications.forEach(n => n.read = true);
                    await gameManager.saveState(char.id, char.state);

                    // Emit updated status immediately
                    const status = await gameManager.getStatus(socket.user.id, false, char.id);
                    socket.emit('game_status', status);
                }
            });
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    });

    // ===== CROWN STORE EVENTS =====

    // Get crown store items
    socket.on('get_crown_store', async () => {
        try {
            console.log(`[CROWN STORE] Request from ${socket.user?.email}`);
            const items = getAllStoreItems();
            console.log(`[CROWN STORE] Sending ${items.length} items to client`);
            socket.emit('crown_store_update', items);
        } catch (err) {
            console.error('Error getting crown store:', err);
            socket.emit('error', { message: err.message });
        }
    });

    // Purchase item with crowns
    socket.on('purchase_crown_item', async ({ itemId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.crownsManager.purchaseItem(char, itemId);

                if (result.success) {
                    await gameManager.saveState(char.id, char.state);
                    socket.emit('crown_purchase_success', result);
                } else {
                    socket.emit('crown_purchase_error', result);
                }

                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error purchasing crown item:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('buy_crown_package', async ({ packageId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const pkg = getStoreItem(packageId);

                if (!pkg) {
                    return socket.emit('crown_purchase_error', { error: 'Package not found' });
                }

                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

                if (!stripe) {
                    return socket.emit('crown_purchase_error', { error: 'Payments are not configured on this server.' });
                }

                console.log(`[STRIPE] Creating dynamic session for ${packageId} (User: ${socket.user.id}, Char: ${socket.data.characterId})`);

                // Simple Card/USD checkout
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: pkg.name,
                                description: pkg.description,
                                images: ['https://raw.githubusercontent.com/lucide-react/lucide/main/icons/gem.svg'],
                            },
                            unit_amount: Math.round(pkg.price * 100),
                        },
                        quantity: 1,
                    }],
                    mode: 'payment',
                    success_url: `${CLIENT_URL}/?payment=success&package=${packageId}`,
                    cancel_url: `${CLIENT_URL}/?payment=cancel`,
                    metadata: {
                        userId: socket.user.id,
                        characterId: socket.data.characterId,
                        packageId: packageId,
                        crownAmount: pkg.amount || 0
                    }
                });

                socket.emit('stripe_checkout_session', { url: session.url });
            });
        } catch (err) {
            console.error('Error creating checkout session:', err);
            // Send actual error message to client for easier debugging
            socket.emit('crown_purchase_error', { error: err.message || 'Failed to initiate payment' });
        }
    });

    // Get crown balance
    socket.on('get_crown_balance', async () => {
        try {
            const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
            const balance = gameManager.crownsManager.getCrowns(char);
            socket.emit('crown_balance_update', { crowns: balance });
        } catch (err) {
            console.error('Error getting crown balance:', err);
            socket.emit('error', { message: err.message });
        }
    });

    // ADMIN: Add crowns (for testing - should be protected in production)
    socket.on('admin_add_crowns', async ({ amount }) => {
        try {
            // TODO: Add admin check in production
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = gameManager.crownsManager.addCrowns(char, amount, 'ADMIN');

                if (result.success) {
                    await gameManager.saveState(char.id, char.state);
                    socket.emit('crown_balance_update', { crowns: result.newBalance });
                }

                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error adding crowns:', err);
            socket.emit('error', { message: err.message });
        }
    });
    // World Boss Fight Start
    socket.on('start_world_boss_fight', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);

                // 1. Initialize logic in Manager
                const result = await gameManager.worldBossManager.startFight(char);

                // 2. Set Activity to 'world_boss' so processTick picks it up
                if (result.success) {
                    await gameManager.saveState(char.id, char.state);

                    // Trigger client UI transition
                    socket.emit('world_boss_started', { success: true });
                }

                // Initial data send
                socket.emit('action_result', {
                    success: result.success,
                    message: "You challenge the World Boss!",
                    worldBossUpdate: await gameManager.worldBossManager.getStatus(char.id)
                });
            });
        } catch (err) {
            console.error('[WORLD_BOSS] Start Fight Error:', err);
            socket.emit('action_result', { success: false, message: err.message });
        }
    });

    // World Boss Reward Claim
    socket.on('claim_world_boss_reward', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.worldBossManager.claimReward(char);

                // Send specific event expected by App.jsx
                socket.emit('world_boss_reward_claimed', result);

                // Also send action_result for generic feedback if needed
                socket.emit('action_result', {
                    success: result.success,
                    message: result.message,
                    worldBossUpdate: await gameManager.worldBossManager.getStatus(char.id)
                });

                // And status update
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('[WORLD_BOSS] Claim Error:', err);
            socket.emit('action_result', { success: false, message: err.message });
        }
    });
});

// --- GLOBAL TICKER LOOP (1s) ---
setInterval(async () => {
    try {
        const localSockets = Array.from(connectedSockets.values());
        const charGroups = {};

        localSockets.forEach(s => {
            const user = s.user || s.data?.user;
            const charId = s.data?.characterId;
            if (user && user.id && charId) {
                const key = `${user.id}:${charId}`;
                if (!charGroups[key]) charGroups[key] = { user, charId, sockets: [] };
                charGroups[key].sockets.push(s);
            }
        });

        const activeCharsCount = Object.keys(charGroups).length;
        // console.log(`[TICKER] Sockets: ${localSockets.length}, Characters: ${activeCharsCount}`);

        await Promise.all(Object.values(charGroups).map(async ({ user, charId, sockets }) => {
            try {
                // Skip if already locked (prevent queue accumulation)
                if (gameManager.isLocked(user.id)) {
                    // console.log(`[TICKER] Skipping user ${user.email} (task pending)`);
                    return;
                }

                await gameManager.executeLocked(user.id, async () => {
                    const result = await gameManager.processTick(user.id, charId);
                    if (result) {
                        // console.log(`[TICKER] Emitting update for ${user.email} (Status change: ${!!result.status})`);
                        sockets.forEach(s => {
                            // Fix: Emit if message OR combatUpdate OR dungeonUpdate OR worldBossUpdate exists
                            const shouldEmit = result.message || result.combatUpdate || (result.dungeonUpdate && result.dungeonUpdate.message) || result.healingUpdate || result.worldBossUpdate;

                            if (shouldEmit) {
                                try {
                                    s.emit('action_result', {
                                        success: result.success,
                                        message: result.message || (result.combatUpdate?.details?.message) || (result.dungeonUpdate?.message),
                                        leveledUp: result.leveledUp,
                                        combatUpdate: result.combatUpdate,
                                        dungeonUpdate: result.dungeonUpdate,
                                        worldBossUpdate: result.worldBossUpdate,
                                        healingUpdate: result.healingUpdate
                                    });



                                } catch (e) { console.error("[EMIT-ERROR] action_result failed:", e); }
                            }
                            if (result.status) {
                                try {
                                    s.emit('status_update', result.status);
                                } catch (e) { console.error("[EMIT-ERROR] status_update failed:", e); }
                            }
                            if (result.leveledUp) {
                                const { skill, level } = result.leveledUp;
                                const skillName = skill.replace(/_/g, ' ');
                                s.emit('skill_level_up', {
                                    message: `Your ${skillName} skill raised to level ${level}!`
                                });
                            }
                        });
                    }
                });
            } catch (err) {
                console.error(`[TICKER] Error for character ${user.id}: `, err);
            }
        }));
    } catch (err) {
        console.error("[TICKER] Error in global heartbeat loop:", err);
    }
}, 1000);

// --- Background Maintenance (10 mins) ---
setInterval(async () => {
    try {
        await gameManager.runMaintenance();
    } catch (err) {
        console.error('[MAINTENANCE-LOOP] Error:', err);
    }
}, 600000);

// --- Background Sync (15s) ---
setInterval(async () => {
    try {
        await gameManager.persistAllDirty();
    } catch (err) {
        console.error('[SYNC-LOOP] Error:', err);
    }
}, 15000);

// --- Shutdown Handling ---
const shutdown = async (signal) => {
    console.log(`[SERVER] Received ${signal}. Persisting data and exiting...`);
    try {
        await gameManager.persistAllDirty();
        console.log('[SERVER] All dirty data persisted.');
    } catch (err) {
        console.error('[SERVER] Error during shutdown persistence:', err);
    }
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Run once on startup
setTimeout(() => {
    gameManager.runMaintenance();
}, 5000);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
