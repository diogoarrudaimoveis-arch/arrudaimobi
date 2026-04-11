-- Migration: Site Advanced Settings
-- Description: Expands or creates site_settings for global settings, SEO, and legal documents.

-- 1. Create table if it does not exist (idempotent)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add columns idempotently (safe whether table was just created or already existed)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS seo_image_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS terms_content TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS privacy_policy_content TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cookie_banner_json JSONB DEFAULT '{}'::jsonb;

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_site_settings_tenant ON public.site_settings(tenant_id);

-- 4. Trigger for updated_at (drop if exists to recreate safely)
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at 
BEFORE UPDATE ON public.site_settings 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 6. Policies
-- Leitura pública para o portal consumir metadados, termos, etc.
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings" ON public.site_settings
    FOR SELECT USING (true);

-- Escrita apenas para administradores
DROP POLICY IF EXISTS "Admins can manage their site settings" ON public.site_settings;
CREATE POLICY "Admins can manage their site settings" ON public.site_settings
    FOR ALL TO authenticated
    USING (
        public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    );
