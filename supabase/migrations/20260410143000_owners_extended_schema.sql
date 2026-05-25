-- Migration: Owners Extended Schema & Documents
-- Adds bank data, signature support and document management

-- 1. Extend Owners table with financial and signature data
ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_agency TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 2. Create Owner Documents table
CREATE TABLE IF NOT EXISTS public.owner_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS for Owner Documents
ALTER TABLE public.owner_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage owner documents') THEN
        CREATE POLICY "Admins can manage owner documents" ON public.owner_documents
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.owners o
              WHERE o.id = owner_id
              AND o.tenant_id = public.get_user_tenant_id(auth.uid())
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.owners o
              WHERE o.id = owner_id
              AND o.tenant_id = public.get_user_tenant_id(auth.uid())
            )
          );
    END IF;
END $$;

-- 4. Create Storage Buckets (if not exists)
-- Note: Requires storage schema usage
INSERT INTO storage.buckets (id, name, public) 
SELECT 'owner-signatures', 'owner-signatures', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'owner-signatures');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'owner-documents', 'owner-documents', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'owner-documents');

-- 5. Storage Policies
CREATE POLICY "Public access to signatures" ON storage.objects
  FOR SELECT USING (bucket_id = 'owner-signatures');

CREATE POLICY "Authenticated users can upload signatures" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'owner-signatures');

CREATE POLICY "Private access to documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'owner-documents');

CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'owner-documents');
