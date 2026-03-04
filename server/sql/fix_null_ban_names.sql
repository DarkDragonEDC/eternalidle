-- Run this in Supabase SQL Editor to link names to user IDs
UPDATE public.user_bans ub
SET player_name = c.name
FROM public.characters c
WHERE ub.user_id = c.user_id
AND ub.player_name IS NULL;
