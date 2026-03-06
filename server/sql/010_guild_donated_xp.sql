-- Migration to add donated_xp to guild_members
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS donated_xp BIGINT DEFAULT 0;
