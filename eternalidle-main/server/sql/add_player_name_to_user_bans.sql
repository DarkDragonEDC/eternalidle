-- Migration: Add player_name to user_bans
ALTER TABLE public.user_bans ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Recommended: Update comments
COMMENT ON COLUMN public.user_bans.player_name IS 'Cached name of the player for administrative reference';
