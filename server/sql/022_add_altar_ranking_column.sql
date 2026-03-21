-- server/sql/022_add_altar_ranking_column.sql
-- Add optimized column for Altar donation ranking

ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS ranking_altar_donated BIGINT DEFAULT 0;

-- Index for fast sorting by altar donation
CREATE INDEX IF NOT EXISTS idx_characters_ranking_altar ON public.characters (ranking_altar_donated DESC, id);

-- Comment for documentation
COMMENT ON COLUMN public.characters.ranking_altar_donated IS 'Total accumulated silver donated to the Altar for leaderboard sorting.';
