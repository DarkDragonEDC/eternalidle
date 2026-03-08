-- Add library_level column to guilds table
ALTER TABLE guilds 
ADD COLUMN IF NOT EXISTS library_level INTEGER DEFAULT 0;
