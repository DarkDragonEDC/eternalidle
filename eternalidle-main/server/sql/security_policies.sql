-- SECURITY HARDENING: THE NUCLEAR OPTION
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Force Enable RLS (Just in case)
ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR REVOKE: Strip ALL permissions from the 'authenticated' (player) role
-- This overrides any specific policies that might try to grant access if the base permission is missing.
REVOKE INSERT, UPDATE, DELETE ON "public"."characters" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON "public"."characters" FROM anon;

-- 3. GRANT READ-ONLY Access
-- Players can ONLY 'SELECT' (Read) data.
GRANT SELECT ON "public"."characters" TO authenticated;

-- 4. Clean Slate Policies
-- Remove ALL existing policies on this table to ensure no "allow-all" mistake remains.
DROP POLICY IF EXISTS "Users can read own characters" ON "public"."characters";
DROP POLICY IF EXISTS "Users can insert own characters" ON "public"."characters";
DROP POLICY IF EXISTS "Users can update own characters" ON "public"."characters";
DROP POLICY IF EXISTS "Users can delete own characters" ON "public"."characters";
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON "public"."characters";
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON "public"."characters";
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON "public"."characters";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."characters";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."characters";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."characters";

-- 5. Create the ONLY Valid Policy: Read Your Own Data
CREATE POLICY "Users can only see their own characters"
ON "public"."characters"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Verification Message
-- Only runs if using a client that supports returning messages, otherwise just completes.
DO $$
BEGIN
  RAISE NOTICE 'Security Hardening Complete: Clients are now READ-ONLY.';
END
$$;
