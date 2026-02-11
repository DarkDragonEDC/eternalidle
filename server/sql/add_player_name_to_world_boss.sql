-- Add player_name column to world_boss_attempts table
ALTER TABLE world_boss_attempts 
ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Update existing records if possible (optional, might affect performance if table is huge)
UPDATE world_boss_attempts wba
SET player_name = c.name
FROM characters c
WHERE wba.character_id = c.id
AND wba.player_name IS NULL;
