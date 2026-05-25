-- Migration: zpro_webhook_events table
-- Block 6a: WhatsApp webhook receiver setup
-- Logs incoming ZPRO WhatsApp webhook events and supports idempotent processing

CREATE TABLE IF NOT EXISTS public.zpro_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'message',
  message_id TEXT NOT NULL,
  message TEXT,
  session_id TEXT,
  source TEXT DEFAULT 'whatsapp',
  media_url TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for idempotent upserts (tenant + message_id)
ALTER TABLE public.zpro_webhook_events
  ADD CONSTRAINT zpro_webhook_events_tenant_message_unique
  UNIQUE (tenant_id, message_id);

ALTER TABLE public.zpro_webhook_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all webhook events for their tenant
CREATE POLICY "Admins can view zpro_webhook_events"
  ON public.zpro_webhook_events FOR SELECT
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Service role can insert (for edge function writes)
CREATE POLICY "Service can insert zpro_webhook_events"
  ON public.zpro_webhook_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_zpro_events_tenant
  ON public.zpro_webhook_events(tenant_id);

CREATE INDEX IF NOT EXISTS idx_zpro_events_phone
  ON public.zpro_webhook_events(phone);

CREATE INDEX IF NOT EXISTS idx_zpro_events_session
  ON public.zpro_webhook_events(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zpro_events_received
  ON public.zpro_webhook_events(received_at DESC);

-- Updated at trigger
CREATE TRIGGER update_zpro_webhook_events_updated_at
  BEFORE UPDATE ON public.zpro_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();