-- Adiciona coluna is_ironman à tabela de guildas
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS is_ironman BOOLEAN DEFAULT false;
