-- SQL FIX: Garantir colunas do Guild Hall e Guild Bank
-- Execute este script no SQL Editor do Supabase para corrigir o erro de "schema cache"

-- 1. Coluna de Nível do Guild Hall
ALTER TABLE guilds 
ADD COLUMN IF NOT EXISTS guild_hall_level INT DEFAULT 0;

-- 2. Colunas do Banco da Guilda
ALTER TABLE guilds 
ADD COLUMN IF NOT EXISTS bank_silver BIGINT DEFAULT 0;

ALTER TABLE guilds 
ADD COLUMN IF NOT EXISTS bank_items JSONB DEFAULT '{}';

-- 3. Recarregar Cache (Dica: Se o erro persistir, clique em "Reload Schema" no dashboard do Supabase)
-- O Supabase geralmente atualiza automaticamente, mas rodar este comando ajuda a garantir a estrutura.
COMMENT ON COLUMN guilds.guild_hall_level IS 'Nivel de expansao do Guild Hall';
