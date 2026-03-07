-- Add columns for Refining Station
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS refining_xp_level INTEGER DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS refining_duplic_level INTEGER DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS refining_effic_level INTEGER DEFAULT 0;
