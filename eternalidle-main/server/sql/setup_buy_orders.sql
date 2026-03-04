-- setup_buy_orders.sql
-- Create Market Buy Orders Table

CREATE TABLE IF NOT EXISTS public.market_buy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    buyer_character_id UUID NOT NULL,
    buyer_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_data JSONB NOT NULL,
    amount BIGINT NOT NULL,
    filled BIGINT DEFAULT 0,
    price_per_unit BIGINT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FILLED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Index for market search
CREATE INDEX IF NOT EXISTS market_buy_orders_status_item_id_idx ON public.market_buy_orders(status, item_id);
CREATE INDEX IF NOT EXISTS market_buy_orders_buyer_id_idx ON public.market_buy_orders(buyer_id);

-- Enable RLS
ALTER TABLE public.market_buy_orders ENABLE ROW LEVEL SECURITY;

-- Set up basic read access for all authenticated users
CREATE POLICY "Public read market_buy_orders" ON public.market_buy_orders FOR SELECT TO authenticated USING (true);

-- Update market_history to include order_type
ALTER TABLE public.market_history ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'SELL_ORDER';
CREATE INDEX IF NOT EXISTS market_history_order_type_idx ON public.market_history(order_type);

-- (Write operations are handled securely by the Server/Service Role)
