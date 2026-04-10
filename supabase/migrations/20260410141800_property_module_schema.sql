-- Migration: Property Module Schema Enhancement
-- Target: Addition of Owners table and expansion of Properties columns

-- 1. Create Owners Table
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

-- 2. Add soft-delete trigger and updated_at to owners
CREATE TRIGGER update_owners_updated_at 
BEFORE UPDATE ON public.owners 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Expansion of Properties Table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS suites INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS living_rooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_condominium NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_iptu NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_code TEXT,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS area_total NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS area_useful NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS marketing_pixels JSONB DEFAULT '{}'::jsonb;

-- 4. Indices for new columns
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_code ON public.properties(property_code);
CREATE INDEX IF NOT EXISTS idx_owners_tenant ON public.owners(tenant_id);

-- 5. RLS Policies for Owners
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage owners') THEN
        CREATE POLICY "Admins can manage owners" ON public.owners
          FOR ALL TO authenticated
          USING (tenant_id = public.get_user_tenant_id(auth.uid()))
          WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
    END IF;
END $$;

-- 6. Commenting for documentation
COMMENT ON COLUMN public.properties.marketing_pixels IS 'Stores tracking pixels for Meta, Google, TikTok, Pinterest etc.';
COMMENT ON COLUMN public.properties.property_code IS 'Internal property reference code (e.g., IMO0047)';
