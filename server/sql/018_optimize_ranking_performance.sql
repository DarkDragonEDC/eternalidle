-- server/sql/018_optimize_ranking_performance.sql
-- Add indexes to improve character ranking query performance

-- 1. Index for is_admin to quickly exclude admins
CREATE INDEX IF NOT EXISTS characters_is_admin_idx ON public.characters (is_admin) 
WHERE is_admin IS NOT NULL AND is_admin = true;

-- 2. GIN index for the state JSONB column to speed up "contains" queries (e.g., isIronman: true)
CREATE INDEX IF NOT EXISTS characters_state_gin_idx ON public.characters USING GIN (state);

-- 3. Specific index for isIronman flag within state for even faster access in IRONMAN mode
CREATE INDEX IF NOT EXISTS characters_is_ironman_idx ON public.characters ((state->>'isIronman')) 
WHERE (state->>'isIronman') = 'true';
