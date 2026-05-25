-- ============================================================
-- Migration: crm_leads — CRM leads table
-- Block 7a: Supabase Schema — Table Design
-- Created by JACK (Arruda Imobi 150% Builder)
-- ============================================================

-- Lead source enum
CREATE TYPE public.lead_source AS ENUM ('website', 'whatsapp', 'meta_ads', 'portal', 'direct', 'referral', 'other');

-- Lead stage enum
CREATE TYPE public.lead_stage AS ENUM ('new', 'contacted', 'qualified', 'visiting', 'negotiating', 'closed_won', 'closed_lost');

-- Leads table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL DEFAULT 'Arruda Imobi',
  
  -- Contact info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  phone_sanitized TEXT,
  
  -- Property interest
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title TEXT,
  interest_type TEXT CHECK (interest_type IN ('buy', 'rent', 'sell', 'visit')),
  
  -- CRM fields
  source public.lead_source DEFAULT 'website',
  stage public.lead_stage DEFAULT 'new',
  notes TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  
  -- Assignment
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Meta Ads linkage
  meta_ad_campaign_id TEXT,
  meta_ad_set_id TEXT,
  meta_ad_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Admins and assigned agents can view leads for their tenant
CREATE POLICY "Admins can view all tenant leads"
  ON public.crm_leads FOR SELECT
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Agents can view assigned leads"
  ON public.crm_leads FOR SELECT
  TO authenticated
  USING (assigned_agent_id = auth.uid());

-- Admins can insert/update/delete leads
CREATE POLICY "Admins can manage all tenant leads"
  ON public.crm_leads FOR ALL
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Service role can do everything (edge functions)
CREATE POLICY "Service role full access to leads"
  ON public.crm_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant ON public.crm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON public.crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON public.crm_leads(source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_property ON public.crm_leads(property_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_agent ON public.crm_leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON public.crm_leads(created_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_crm_leads_updated_at ON public.crm_leads;
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.crm_leads IS 'CRM leads table. Created by JACK Block 7a (2026-05-24). Replaces contacts for new CRM flow.';
