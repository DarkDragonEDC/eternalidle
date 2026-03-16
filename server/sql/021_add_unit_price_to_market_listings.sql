-- Adicionar coluna unit_price para ordenação correta no mercado
ALTER TABLE public.market_listings ADD COLUMN IF NOT EXISTS unit_price BIGINT;

-- Preencher unit_price para listagens existentes
UPDATE public.market_listings 
SET unit_price = FLOOR(price / amount)
WHERE unit_price IS NULL AND amount > 0;

-- Criar índice para performance de sorting
CREATE INDEX IF NOT EXISTS idx_market_listings_unit_price ON public.market_listings USING btree (unit_price);
