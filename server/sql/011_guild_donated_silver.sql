-- Migration to add silver and silver item values to guild_members
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS donated_silver BIGINT DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS donated_items_value BIGINT DEFAULT 0;
