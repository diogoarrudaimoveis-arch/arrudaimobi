
-- Evolution API config per tenant
CREATE TABLE public.evolution_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  base_url TEXT NOT NULL,
  instance_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.evolution_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage evolution_config"
  ON public.evolution_config FOR ALL
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Messages log table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone_raw TEXT,
  phone_sanitized TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents and admins can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      sent_by = auth.uid()
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    )
  );

CREATE POLICY "Agents and admins can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND sent_by = auth.uid()
    AND (
      has_tenant_role(auth.uid(), tenant_id, 'agent'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    )
  );

-- Trigger for updated_at on evolution_config
CREATE TRIGGER update_evolution_config_updated_at
  BEFORE UPDATE ON public.evolution_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
