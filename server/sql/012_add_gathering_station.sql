-- Migration to add Gathering Station buildings to guilds
ALTER TABLE guilds 
ADD COLUMN gathering_xp_level INT DEFAULT 0,
ADD COLUMN gathering_duplic_level INT DEFAULT 0,
ADD COLUMN gathering_auto_level INT DEFAULT 0;

COMMENT ON COLUMN guilds.gathering_xp_level IS 'Level of Gathering Station XP focus';
COMMENT ON COLUMN guilds.gathering_duplic_level IS 'Level of Gathering Station Duplication focus';
COMMENT ON COLUMN guilds.gathering_auto_level IS 'Level of Gathering Station Auto-Refine focus';
