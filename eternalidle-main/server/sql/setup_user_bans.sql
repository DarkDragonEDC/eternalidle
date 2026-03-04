-- setup_user_bans.sql
-- Tabela para gerenciar punições progressivas (Aviso, 24h, Permanente)

CREATE TABLE IF NOT EXISTS public.user_bans (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ban_level INT NOT NULL DEFAULT 1, -- 1 = Warning, 2 = 24h Ban, 3 = Permanent Ban
    banned_until TIMESTAMPTZ, -- Nulo para níveis 1 e 3
    reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (apenas servidor lê/escreve)
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Revogar acesso direto do cliente
REVOKE ALL ON public.user_bans FROM authenticated;
REVOKE ALL ON public.user_bans FROM anon;

-- Comentários para documentação
COMMENT ON TABLE public.user_bans IS 'Mapeia punições progressivas aplicadas aos usuários.';
COMMENT ON COLUMN public.user_bans.ban_level IS '1: Aviso, 2: Banimento 24h, 3: Banimento Permanente';
