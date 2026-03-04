-- TRADE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.trade_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    sender_offer JSONB DEFAULT '{"items": [], "silver": 0}'::jsonb,
    receiver_offer JSONB DEFAULT '{"items": [], "silver": 0}'::jsonb,
    sender_accepted BOOLEAN DEFAULT false,
    receiver_accepted BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_trade_sender ON public.trade_sessions(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_receiver ON public.trade_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trade_status ON public.trade_sessions(status);

-- RLS (Row Level Security)
ALTER TABLE public.trade_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see trades where they are either sender or receiver
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trade_sessions;
CREATE POLICY "Users can view their own trades" ON public.trade_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.characters c
            WHERE c.user_id = auth.uid()
            AND (c.id = sender_id OR c.id = receiver_id)
        )
    );

-- Note: All writes (INSERT/UPDATE) must go through the Server (service_role)
-- to ensure strict validation of inventory, amounts, and the "Reset on Change" rule.

GRANT SELECT ON public.trade_sessions TO anon, authenticated;
