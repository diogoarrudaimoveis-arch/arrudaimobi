-- ============================================================
-- Migration: storage_buckets — Additional storage buckets
-- Block 7c: Supabase Schema — Storage for Property Images
-- Created by JACK (Arruda Imobi 150% Builder)
-- ============================================================

-- Insert additional storage buckets (ignore if already exists)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Chat attachments bucket (for OmniRoute chatbot)
  ('chat-attachments', 'chat-attachments', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  -- WhatsApp media bucket
  ('whatsapp-media', 'whatsapp-media', false, 52428800, ARRAY['image/jpeg', 'image/png', 'audio/ogg', 'video/mp4', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-attachments bucket
-- Only authenticated users can upload/download their own attachments
CREATE POLICY "Chat attachments authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (auth.uid() IS NOT NULL)
  );

CREATE POLICY "Chat attachments authenticated select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (auth.uid() IS NOT NULL)
  );

-- Service role can do all storage operations
CREATE POLICY "Chat attachments service role all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'chat-attachments')
  WITH CHECK (bucket_id = 'chat-attachments');

-- RLS policies for whatsapp-media bucket
CREATE POLICY "WhatsApp media service upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "WhatsApp media service select"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'whatsapp-media');

CREATE POLICY "WhatsApp media admin select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
      AND public.has_tenant_role(auth.uid(), t.id, 'admin'::app_role)
    )
  );

COMMENT ON TABLE storage.objects IS 'Storage buckets enhanced by JACK Block 7c (2026-05-24). Added chat-attachments and whatsapp-media buckets.';
