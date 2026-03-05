-- Guilds Table
CREATE TABLE IF NOT EXISTS guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    summary TEXT,
    icon TEXT,
    icon_color TEXT,
    bg_color TEXT,
    leader_id UUID REFERENCES characters(id),
    level INT DEFAULT 1,
    xp BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT name_length_check CHECK (char_length(name) >= 3 AND char_length(name) <= 15),
    CONSTRAINT tag_length_check CHECK (char_length(tag) >= 2 AND char_length(tag) <= 4)
);

-- Index for case-insensitive name/tag searches if needed
CREATE INDEX IF NOT EXISTS guilds_name_idx ON guilds (name);
CREATE INDEX IF NOT EXISTS guilds_tag_idx ON guilds (tag);

-- Guild Members Table
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER', -- LEADER, OFFICER, MEMBER
    joined_at TIMESTAMPTZ DEFAULT now()
);

-- Index for guild lookup
CREATE INDEX IF NOT EXISTS guild_members_guild_id_idx ON guild_members (guild_id);
