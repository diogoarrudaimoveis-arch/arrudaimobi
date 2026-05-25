-- Migration: Property Documents Schema & Private Storage
-- Target: Creation of property_documents table and secure bucket

-- 1. Create Property Documents table
CREATE TABLE IF NOT EXISTS public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS for Property Documents
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage property documents') THEN
        CREATE POLICY "Admins can manage property documents" ON public.property_documents
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

-- 3. Create Private Storage Bucket for Properties
INSERT INTO storage.buckets (id, name, public) 
SELECT 'property-documents', 'property-documents', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'property-documents');

-- 4. Storage Policies for property-documents (Private)
CREATE POLICY "Private access to property documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'property-documents');

CREATE POLICY "Authenticated users can upload property documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-documents');

CREATE POLICY "Authenticated users can delete property documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'property-documents');
