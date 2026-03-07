-- Add guild_hall_level column to guilds table
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS guild_hall_level INT DEFAULT 0;
