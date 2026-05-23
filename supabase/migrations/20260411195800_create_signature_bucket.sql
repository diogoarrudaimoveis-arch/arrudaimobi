INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('owner-signatures', 'owner-signatures', true, null, null) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public signatures access" ON storage.objects;
CREATE POLICY "Public signatures access" ON storage.objects FOR SELECT USING ( bucket_id = 'owner-signatures' );

DROP POLICY IF EXISTS "Auth upload signatures" ON storage.objects;
CREATE POLICY "Auth upload signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'owner-signatures' );
