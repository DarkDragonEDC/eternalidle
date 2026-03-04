-- setup_friends_system.sql

-- 1. Create the friends table
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate relationships
    CONSTRAINT unique_friendship UNIQUE(sender_id, receiver_id),
    -- Prevent friending yourself
    CONSTRAINT cannot_friend_self CHECK (sender_id <> receiver_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Users can see friendships where they are either the sender or receiver
CREATE POLICY "Users can view their own friendships"
ON public.friends
FOR SELECT
TO authenticated
USING (
    sender_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
);

-- Note: Inserts, Updates, and Deletes will be handled by the Server (Service Role) 
-- to ensure integrity and trigger socket notifications. 
-- Clients are Read-Only like the characters table.
REVOKE ALL ON public.friends FROM authenticated;
REVOKE ALL ON public.friends FROM anon;
GRANT SELECT ON public.friends TO authenticated;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_friends_sender ON public.friends(sender_id);
CREATE INDEX IF NOT EXISTS idx_friends_receiver ON public.friends(receiver_id);
