-- Add sender_guild_tag column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_guild_tag VARCHAR(4);

-- Comment for documentation
COMMENT ON COLUMN messages.sender_guild_tag IS 'The tag of the guild the sender belonged to when the message was sent.';
