
CREATE TABLE public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  host text,
  port integer DEFAULT 587,
  username text,
  password_encrypted text,
  encryption text DEFAULT 'tls',
  sender_email text,
  sender_name text,
  product_email_subject text,
  product_email_html text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select smtp_settings"
ON public.smtp_settings FOR SELECT TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can insert smtp_settings"
ON public.smtp_settings FOR INSERT TO authenticated
WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can update smtp_settings"
ON public.smtp_settings FOR UPDATE TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can delete smtp_settings"
ON public.smtp_settings FOR DELETE TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));
