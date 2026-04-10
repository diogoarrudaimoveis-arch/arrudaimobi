-- Migration: Portal Marketing Settings
-- Description: Table to manage tracking pixels and marketing IDs for the public portal.

CREATE TABLE IF NOT EXISTS public.portal_marketing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    meta_pixel_id TEXT,
    ga4_id TEXT,
    google_ads_id TEXT,
    gtm_id TEXT,
    tiktok_pixel_id TEXT,
    pinterest_tag_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_marketing_settings ENABLE ROW LEVEL SECURITY;

-- Indices
CREATE INDEX IF NOT EXISTS idx_portal_marketing_tenant ON public.portal_marketing_settings(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_portal_marketing_settings_updated_at 
BEFORE UPDATE ON public.portal_marketing_settings 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
-- 1. Public can read (for the landing page/portal to inject tags)
DROP POLICY IF EXISTS "Public can read portal marketing settings" ON public.portal_marketing_settings;
CREATE POLICY "Public can read portal marketing settings" ON public.portal_marketing_settings
    FOR SELECT USING (true);

-- 2. Tenant admins can manage their own settings
DROP POLICY IF EXISTS "Admins can manage their portal marketing settings" ON public.portal_marketing_settings;
CREATE POLICY "Admins can manage their portal marketing settings" ON public.portal_marketing_settings
    FOR ALL TO authenticated
    USING (
        public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    );
