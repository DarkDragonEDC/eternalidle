-- server/sql/019_add_ranking_columns.sql
-- Add optimized columns for leaderboard performance

ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS ranking_total_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ranking_total_xp BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ranking_item_power INTEGER DEFAULT 0;

-- Indexes for fast sorting by ranking type
CREATE INDEX IF NOT EXISTS idx_characters_ranking_level ON public.characters (ranking_total_level DESC, id);
CREATE INDEX IF NOT EXISTS idx_characters_ranking_xp ON public.characters (ranking_total_xp DESC, id);
CREATE INDEX IF NOT EXISTS idx_characters_ranking_ip ON public.characters (ranking_item_power DESC, id);

-- Comments for documentation
COMMENT ON COLUMN public.characters.ranking_total_level IS 'Pre-calculated sum of all skill levels for leaderboard sorting.';
COMMENT ON COLUMN public.characters.ranking_total_xp IS 'Pre-calculated total accumulated XP for leaderboard sorting.';
COMMENT ON COLUMN public.characters.ranking_item_power IS 'Pre-calculated item power for leaderboard sorting.';
