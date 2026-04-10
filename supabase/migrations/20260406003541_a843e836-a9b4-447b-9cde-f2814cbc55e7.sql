
CREATE TABLE public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  ip_address text,
  preferences jsonb NOT NULL DEFAULT '{}',
  consent_version text NOT NULL DEFAULT '1.0',
  action text NOT NULL DEFAULT 'save',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert consent" ON public.cookie_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own consents" ON public.cookie_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
