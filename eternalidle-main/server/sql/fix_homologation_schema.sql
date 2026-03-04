-- ==========================================
-- ETERNAL IDLE: HOMOLOGATION FIX SCRIPT
-- ==========================================
-- This script fixes discrepancies found between the Homologation database
-- and the Production database, adding missing columns and tables.

-- 1. FIXING `characters` TABLE
-- ==========================================
-- Adds missing columns that exist in Production but are missing in Homologation.

DO $$ 
BEGIN
    -- Add dungeon_state if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='characters' AND column_name='dungeon_state') THEN
        ALTER TABLE public.characters ADD COLUMN dungeon_state JSONB DEFAULT NULL;
    END IF;

    -- Add is_admin if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='characters' AND column_name='is_admin') THEN
        ALTER TABLE public.characters ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;


-- 2. CREATE MISSING GUILD TABLES
-- ==========================================

-- Table: guilds
CREATE TABLE IF NOT EXISTS public.guilds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT ''::TEXT,
    leader_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banner_color TEXT DEFAULT '#4a5568',
    banner_icon TEXT DEFAULT 'Shield'
);

-- Table: guild_members
CREATE TABLE IF NOT EXISTS public.guild_members (
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER', -- 'LEADER', 'OFFICER', 'MEMBER'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contribution INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, character_id)
);

-- Table: guild_invites
CREATE TABLE IF NOT EXISTS public.guild_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'PENDING' -- 'PENDING', 'ACCEPTED', 'DECLINED'
);


-- 3. CREATE MISSING WORLD BOSS HISTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS public.world_boss_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boss_id TEXT NOT NULL,
    character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    damage_dealt NUMERIC DEFAULT 0,
    healing_done NUMERIC DEFAULT 0,
    rank INTEGER,
    rewards JSONB,
    fight_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. CREATE MISSING TRADE NAMES (For logs/receipts caching)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.trade_names (
    character_id UUID PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 5. APPLY ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Ensure tables are accessible securely.
-- (Adjust to minimal default: authenticated can read)

ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_boss_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_names ENABLE ROW LEVEL SECURITY;

-- Guilds Public Read
DROP POLICY IF EXISTS "Public Guilds Read" ON public.guilds;
CREATE POLICY "Public Guilds Read" ON public.guilds FOR SELECT USING (true);

-- Guild Members Public Read
DROP POLICY IF EXISTS "Public Members Read" ON public.guild_members;
CREATE POLICY "Public Members Read" ON public.guild_members FOR SELECT USING (true);

-- World Boss History Public Read
DROP POLICY IF EXISTS "Public Boss History Read" ON public.world_boss_history;
CREATE POLICY "Public Boss History Read" ON public.world_boss_history FOR SELECT USING (true);

-- Trade Names Public Read
DROP POLICY IF EXISTS "Public Trade Names Read" ON public.trade_names;
CREATE POLICY "Public Trade Names Read" ON public.trade_names FOR SELECT USING (true);

-- Disable caching of permissions by notifying setup finish
NOTIFY pgrst, 'reload schema';
