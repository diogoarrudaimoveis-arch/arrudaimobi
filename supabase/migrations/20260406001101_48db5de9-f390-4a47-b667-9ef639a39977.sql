
-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email campaign recipients table
CREATE TABLE public.email_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns
CREATE POLICY "Admin can manage campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'))
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

-- Policies for email_campaign_recipients
CREATE POLICY "Admin can manage campaign recipients" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = campaign_id
      AND public.has_tenant_role(auth.uid(), ec.tenant_id, 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = campaign_id
      AND public.has_tenant_role(auth.uid(), ec.tenant_id, 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_email_campaigns_tenant ON public.email_campaigns(tenant_id);
CREATE INDEX idx_email_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_email_campaign_recipients_status ON public.email_campaign_recipients(status);

-- Updated_at trigger
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
