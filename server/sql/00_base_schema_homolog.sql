-- 00_base_schema_homolog.sql
-- Run this FIRST in the new Supabase SQL Editor

-- 1. Create Characters Table
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT UNIQUE NOT NULL,
    state JSONB DEFAULT '{}'::jsonb,
    skills JSONB DEFAULT '{}'::jsonb,
    equipment JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS characters_user_id_idx ON public.characters(user_id);

-- 2. Create Messages Table (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'GLOBAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for chat loading
CREATE INDEX IF NOT EXISTS messages_channel_created_at_idx ON public.messages(channel, created_at DESC);

-- 3. Create Market Listings Table
CREATE TABLE IF NOT EXISTS public.market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_data JSONB NOT NULL,
    amount BIGINT NOT NULL,
    price BIGINT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for market search
CREATE INDEX IF NOT EXISTS market_listings_status_item_id_idx ON public.market_listings(status, item_id);

-- 4. Enable Row Level Security (RLS) on base tables
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

-- 5. Set up basic read access for all authenticated users
CREATE POLICY "Public read characters" ON public.characters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read market_listings" ON public.market_listings FOR SELECT TO authenticated USING (true);

-- (Write operations are handled securely by the Server/Service Role)
