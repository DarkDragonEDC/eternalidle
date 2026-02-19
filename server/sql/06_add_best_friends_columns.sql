-- Add best friends columns to the friends table
ALTER TABLE public.friends 
ADD COLUMN IF NOT EXISTS is_best_friend BOOLEAN DEFAULT false;

ALTER TABLE public.friends 
ADD COLUMN IF NOT EXISTS best_friend_request_sender UUID REFERENCES public.characters(id) ON DELETE SET NULL;

-- Notify the community that friend system just got an upgrade! (Optional)
COMMENT ON COLUMN public.friends.is_best_friend IS 'Indicates if the two characters are best friends.';
COMMENT ON COLUMN public.friends.best_friend_request_sender IS 'Tracks which character sent a best friend request.';
