-- Add missing columns to guilds table if they don't exist
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS icon_color TEXT;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS bg_color TEXT;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS country_code TEXT;
