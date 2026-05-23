-- Migration: Portal Integrations Schema
-- Target: Management of XML Feeds and API connections for real estate portals

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portal_integration_type') THEN
        CREATE TYPE public.portal_integration_type AS ENUM ('xml', 'api');
    END IF;
END $$;

-- 1. Create portal_integrations table
CREATE TABLE IF NOT EXISTS public.portal_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.portal_integration_type NOT NULL,
  endpoint_url TEXT,
  api_token TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS (Row Level Security)
ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage portal integrations') THEN
        CREATE POLICY "Admins can manage portal integrations" ON public.portal_integrations
          FOR ALL TO authenticated
          USING (tenant_id = public.get_user_tenant_id(auth.uid()))
          WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
    END IF;
END $$;

-- 3. Comments
COMMENT ON TABLE public.portal_integrations IS 'Schema to manage real estate portal feeds and direct API integrations.';
