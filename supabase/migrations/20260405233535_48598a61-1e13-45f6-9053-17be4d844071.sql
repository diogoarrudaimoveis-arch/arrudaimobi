
CREATE TABLE public.smtp_test_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_test_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limit records"
ON public.smtp_test_rate_limits FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rate limit records"
ON public.smtp_test_rate_limits FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_smtp_rate_limit_lookup
ON public.smtp_test_rate_limits (tenant_id, user_id, sent_at DESC);
