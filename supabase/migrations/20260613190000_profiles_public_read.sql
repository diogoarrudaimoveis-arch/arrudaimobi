-- Migration: Allow anonymous public access to profiles with show_on_public_page=true
-- This is needed for the public /agentes page to display agents

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;

CREATE POLICY "profiles_public_read"
  ON profiles FOR SELECT
  USING (show_on_public_page = true);
