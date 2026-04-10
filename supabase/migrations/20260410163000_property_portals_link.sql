-- Migration: Property Portal Linkage
-- Target: Linking properties to portals with modality and status control

-- 1. Create Portal Modality Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_portal_modality') THEN
        CREATE TYPE public.property_portal_modality AS ENUM ('Simples', 'Destaque', 'Super Destaque');
    END IF;
END $$;

-- 2. Create property_portal_listing table
CREATE TABLE IF NOT EXISTS public.property_portal_listing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portal_integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ativo',
  modality public.property_portal_modality NOT NULL DEFAULT 'Simples',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, portal_id)
);

-- 3. RLS
ALTER TABLE public.property_portal_listing ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage portal listings') THEN
        CREATE POLICY "Admins can manage portal listings" ON public.property_portal_listing
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.properties p
              WHERE p.id = property_id
              AND p.tenant_id = public.get_user_tenant_id(auth.uid())
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.properties p
              WHERE p.id = property_id
              AND p.tenant_id = public.get_user_tenant_id(auth.uid())
            )
          );
    END IF;
END $$;

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_pp_listing_property ON public.property_portal_listing(property_id);
CREATE INDEX IF NOT EXISTS idx_pp_listing_portal ON public.property_portal_listing(portal_id);

-- 5. Comments
COMMENT ON TABLE public.property_portal_listing IS 'Links properties to portals with specific advertising modalities.';
