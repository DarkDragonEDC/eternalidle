-- DATABASE REPAIR SCRIPT: RESTORE PRIMARY KEYS AND CONSTRAINTS
-- This script adds missing PKeys and other constraints to the staging database.

ALTER TABLE public."market_buy_orders" DROP CONSTRAINT IF EXISTS "market_buy_orders_pkey" CASCADE;
ALTER TABLE public."market_buy_orders" ADD PRIMARY KEY ("id");

ALTER TABLE public."market_listings" DROP CONSTRAINT IF EXISTS "market_listings_pkey" CASCADE;
ALTER TABLE public."market_listings" ADD PRIMARY KEY ("id");

ALTER TABLE public."characters" DROP CONSTRAINT IF EXISTS "characters_pkey" CASCADE;
ALTER TABLE public."characters" ADD PRIMARY KEY ("id");

ALTER TABLE public."messages" DROP CONSTRAINT IF EXISTS "messages_pkey" CASCADE;
ALTER TABLE public."messages" ADD PRIMARY KEY ("id");

ALTER TABLE public."combat_history" DROP CONSTRAINT IF EXISTS "combat_history_pkey" CASCADE;
ALTER TABLE public."combat_history" ADD PRIMARY KEY ("id");

ALTER TABLE public."trade_sessions" DROP CONSTRAINT IF EXISTS "trade_sessions_pkey" CASCADE;
ALTER TABLE public."trade_sessions" ADD PRIMARY KEY ("id");

ALTER TABLE public."dungeon_history" DROP CONSTRAINT IF EXISTS "dungeon_history_pkey" CASCADE;
ALTER TABLE public."dungeon_history" ADD PRIMARY KEY ("id");

ALTER TABLE public."trade_history" DROP CONSTRAINT IF EXISTS "trade_history_pkey" CASCADE;
ALTER TABLE public."trade_history" ADD PRIMARY KEY ("id");

ALTER TABLE public."push_subscriptions" DROP CONSTRAINT IF EXISTS "push_subscriptions_pkey" CASCADE;
ALTER TABLE public."push_subscriptions" ADD PRIMARY KEY ("id");

ALTER TABLE public."daily_rewards" DROP CONSTRAINT IF EXISTS "daily_rewards_pkey" CASCADE;
ALTER TABLE public."daily_rewards" ADD PRIMARY KEY ("user_id");

ALTER TABLE public."world_boss_attempts" DROP CONSTRAINT IF EXISTS "world_boss_attempts_pkey" CASCADE;
ALTER TABLE public."world_boss_attempts" ADD PRIMARY KEY ("id");

ALTER TABLE public."global_stats" DROP CONSTRAINT IF EXISTS "global_stats_pkey" CASCADE;
ALTER TABLE public."global_stats" ADD PRIMARY KEY ("id");

ALTER TABLE public."friends" DROP CONSTRAINT IF EXISTS "friends_pkey" CASCADE;
ALTER TABLE public."friends" ADD PRIMARY KEY ("id");

ALTER TABLE public."guild_requests" DROP CONSTRAINT IF EXISTS "guild_requests_pkey" CASCADE;
ALTER TABLE public."guild_requests" ADD PRIMARY KEY ("id");

ALTER TABLE public."guilds" DROP CONSTRAINT IF EXISTS "guilds_pkey" CASCADE;
ALTER TABLE public."guilds" ADD PRIMARY KEY ("id");

ALTER TABLE public."market_history" DROP CONSTRAINT IF EXISTS "market_history_pkey" CASCADE;
ALTER TABLE public."market_history" ADD PRIMARY KEY ("id");

-- Restore Foreign Keys
ALTER TABLE public."guild_requests" DROP CONSTRAINT IF EXISTS "guild_requests_guild_id_fkey" CASCADE;
ALTER TABLE public."guild_requests" 
    ADD CONSTRAINT "guild_requests_guild_id_fkey" 
    FOREIGN KEY ("guild_id") REFERENCES public."guilds"("id") ON DELETE CASCADE;

ALTER TABLE public."trade_sessions" DROP CONSTRAINT IF EXISTS "trade_sessions_sender_id_fkey" CASCADE;
ALTER TABLE public."trade_sessions" 
    ADD CONSTRAINT "trade_sessions_sender_id_fkey" 
    FOREIGN KEY ("sender_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."trade_sessions" DROP CONSTRAINT IF EXISTS "trade_sessions_receiver_id_fkey" CASCADE;
ALTER TABLE public."trade_sessions" 
    ADD CONSTRAINT "trade_sessions_receiver_id_fkey" 
    FOREIGN KEY ("receiver_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."combat_history" DROP CONSTRAINT IF EXISTS "combat_history_character_id_fkey" CASCADE;
ALTER TABLE public."combat_history" 
    ADD CONSTRAINT "combat_history_character_id_fkey" 
    FOREIGN KEY ("character_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."dungeon_history" DROP CONSTRAINT IF EXISTS "dungeon_history_character_id_fkey" CASCADE;
ALTER TABLE public."dungeon_history" 
    ADD CONSTRAINT "dungeon_history_character_id_fkey" 
    FOREIGN KEY ("character_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."world_boss_attempts" DROP CONSTRAINT IF EXISTS "world_boss_attempts_character_id_fkey" CASCADE;
ALTER TABLE public."world_boss_attempts" 
    ADD CONSTRAINT "world_boss_attempts_character_id_fkey" 
    FOREIGN KEY ("character_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."friends" DROP CONSTRAINT IF EXISTS "friends_sender_id_fkey" CASCADE;
ALTER TABLE public."friends" 
    ADD CONSTRAINT "friends_sender_id_fkey" 
    FOREIGN KEY ("sender_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."friends" DROP CONSTRAINT IF EXISTS "friends_receiver_id_fkey" CASCADE;
ALTER TABLE public."friends" 
    ADD CONSTRAINT "friends_receiver_id_fkey" 
    FOREIGN KEY ("receiver_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."friends" DROP CONSTRAINT IF EXISTS "friends_best_friend_request_sender_fkey" CASCADE;
ALTER TABLE public."friends" 
    ADD CONSTRAINT "friends_best_friend_request_sender_fkey" 
    FOREIGN KEY ("best_friend_request_sender") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."guild_members" DROP CONSTRAINT IF EXISTS "guild_members_guild_id_fkey" CASCADE;
ALTER TABLE public."guild_members" 
    ADD CONSTRAINT "guild_members_guild_id_fkey" 
    FOREIGN KEY ("guild_id") REFERENCES public."guilds"("id") ON DELETE CASCADE;

ALTER TABLE public."guild_members" DROP CONSTRAINT IF EXISTS "guild_members_character_id_fkey" CASCADE;
ALTER TABLE public."guild_members" 
    ADD CONSTRAINT "guild_members_character_id_fkey" 
    FOREIGN KEY ("character_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."guild_requests" DROP CONSTRAINT IF EXISTS "guild_requests_character_id_fkey" CASCADE;
ALTER TABLE public."guild_requests" 
    ADD CONSTRAINT "guild_requests_character_id_fkey" 
    FOREIGN KEY ("character_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

ALTER TABLE public."guilds" DROP CONSTRAINT IF EXISTS "guilds_leader_id_fkey" CASCADE;
ALTER TABLE public."guilds" 
    ADD CONSTRAINT "guilds_leader_id_fkey" 
    FOREIGN KEY ("leader_id") REFERENCES public."characters"("id") ON DELETE CASCADE;

