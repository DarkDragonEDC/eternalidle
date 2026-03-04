-- Migration: Add character_name and reward_id to daily_rewards
ALTER TABLE public.daily_rewards ADD COLUMN IF NOT EXISTS character_name TEXT;
ALTER TABLE public.daily_rewards ADD COLUMN IF NOT EXISTS reward_id TEXT;

-- Recommended: Update comments
COMMENT ON COLUMN public.daily_rewards.character_name IS 'Name of the character who spun the wheel';
COMMENT ON COLUMN public.daily_rewards.reward_id IS 'ID of the reward won from the LOOT_TABLE';
