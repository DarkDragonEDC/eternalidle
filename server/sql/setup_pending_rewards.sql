-- Create pending_rewards table matching PRODUCTION (Project: rozwhqxbpsxlxbkfzvce)
CREATE TABLE IF NOT EXISTS public.pending_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    silver_gained BIGINT DEFAULT 0,
    xp_gained JSONB DEFAULT '{}'::jsonb,
    loot_gained JSONB DEFAULT '{}'::jsonb,
    reason TEXT, -- Explanation of the reward (e.g., 'Daily Boss Ranking', 'Event Bonus')
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance on character login
CREATE INDEX IF NOT EXISTS idx_pending_rewards_char_applied ON public.pending_rewards (character_id) WHERE applied = FALSE;

-- Enable RLS
ALTER TABLE public.pending_rewards ENABLE ROW LEVEL SECURITY;

-- Allow service role (backend) to read/write everything
CREATE POLICY "Service role full access" ON public.pending_rewards
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow characters to see their own pending rewards
CREATE POLICY "Characters can view own pending rewards" ON public.pending_rewards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.characters 
            WHERE id = pending_rewards.character_id AND user_id = auth.uid()
        )
    );
