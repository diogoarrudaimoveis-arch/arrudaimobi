-- Migration: Allow authenticated users full update/insert/select access on property-images storage objects

CREATE POLICY "Permitir Update total para admins" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "Permitir Insert total para admins" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Permitir Select total para admins" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'property-images');
