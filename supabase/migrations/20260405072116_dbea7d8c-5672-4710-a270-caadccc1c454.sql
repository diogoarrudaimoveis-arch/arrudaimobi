
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can submit a contact" ON public.contacts;

-- Create a more restrictive policy: anyone can insert but must provide tenant_id and name
CREATE POLICY "Anyone can submit a contact" ON public.contacts
  FOR INSERT TO anon, authenticated
  WITH CHECK (name IS NOT NULL AND name <> '' AND tenant_id IS NOT NULL);
