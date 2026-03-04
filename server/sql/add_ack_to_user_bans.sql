-- Migration: Add acknowledgement column to user_bans
ALTER TABLE public.user_bans ADD COLUMN ack BOOLEAN DEFAULT FALSE;
