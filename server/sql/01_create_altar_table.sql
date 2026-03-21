-- Create the global_altar table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.global_altar (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
    target_date DATE NOT NULL,
    total_silver BIGINT NOT NULL DEFAULT 0,
    last_notified_tier INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert the default 'global' row if the table is empty
INSERT INTO public.global_altar (id, target_date, total_silver)
SELECT 'global', CURRENT_DATE, 0
WHERE NOT EXISTS (SELECT 1 FROM public.global_altar WHERE id = 'global');

-- Enable Row Level Security (good practice, can be customized later)
ALTER TABLE public.global_altar ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated reads
CREATE POLICY "Allow authenticated read access on global_altar"
ON public.global_altar FOR SELECT
USING (auth.role() = 'authenticated');
