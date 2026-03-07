-- Add bank columns to guilds table
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS bank_silver BIGINT DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS bank_items JSONB DEFAULT '{}';
