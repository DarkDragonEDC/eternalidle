-- Guild Requests Table
CREATE TABLE IF NOT EXISTS guild_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure a character can only have one active pending request per guild
    UNIQUE(guild_id, character_id)
);

-- Index for faster lookup by guild and character
CREATE INDEX IF NOT EXISTS guild_requests_guild_id_idx ON guild_requests (guild_id);
CREATE INDEX IF NOT EXISTS guild_requests_char_id_idx ON guild_requests (character_id);
