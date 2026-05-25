-- ============================================================
-- Migration: campaigns_meta — Meta/Facebook Ads campaign metadata
-- Block 7a: Supabase Schema — Table Design
-- Created by JACK (Arruda Imobi 150% Builder)
-- ============================================================

-- Campaign status enum
CREATE TYPE public.campaign_status AS ENUM ('active', 'paused', 'archived', 'deleted');

CREATE TABLE IF NOT EXISTS public.campaigns_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Meta identifiers
  meta_campaign_id TEXT NOT NULL UNIQUE,
  meta_ad_account_id TEXT NOT NULL,
  
  -- Campaign info
  name TEXT NOT NULL,
  objective TEXT,
  status public.campaign_status DEFAULT 'active',
  
  -- Budget and bidding
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  bid_strategy TEXT,
  
  -- Targeting
  audience_age_min INTEGER,
  audience_age_max INTEGER,
  audience_genders TEXT[],
  audience_geo_countries TEXT[],
  audience_interests JSONB,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Performance (synced from Meta API)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.campaigns_meta ENABLE ROW LEVEL SECURITY;

-- Admins can view all campaigns for their tenant
CREATE POLICY "Admins can view campaigns_meta"
  ON public.campaigns_meta FOR SELECT
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Admins can manage campaigns
CREATE POLICY "Admins can manage campaigns_meta"
  ON public.campaigns_meta FOR ALL
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Service role can do everything (Meta sync edge function)
CREATE POLICY "Service role full access to campaigns_meta"
  ON public.campaigns_meta FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_meta_tenant ON public.campaigns_meta(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_meta_status ON public.campaigns_meta(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_meta_meta_id ON public.campaigns_meta(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_meta_created ON public.campaigns_meta(created_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_campaigns_meta_updated_at ON public.campaigns_meta;
CREATE TRIGGER update_campaigns_meta_updated_at
  BEFORE UPDATE ON public.campaigns_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.campaigns_meta IS 'Meta/Facebook Ads campaign metadata. Synced from Meta Marketing API. Created by JACK Block 7a (2026-05-24).';
