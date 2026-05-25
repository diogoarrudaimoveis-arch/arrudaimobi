-- 6d: WhatsApp opt-in/opt-out handling
-- Migration: add whatsapp_opt_status table for LGPD compliance

CREATE TABLE IF NOT EXISTS public.whatsapp_opt_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  opted_in BOOLEAN NOT NULL DEFAULT TRUE,
  opted_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opted_out_at TIMESTAMPTZ,
  source TEXT DEFAULT 'form' CHECK (source IN ('form', 'keyword', 'manual', 'zpro')),
  UNIQUE (tenant_id, phone)
);

ALTER TABLE public.whatsapp_opt_status ENABLE ROW LEVEL SECURITY;

-- Anyone can check their own opt status
CREATE POLICY "Anyone can read own opt status"
  ON public.whatsapp_opt_status FOR SELECT
  USING (true);

-- Service role can insert/update (webhook and admin)
CREATE POLICY "Service role can insert opt status"
  ON public.whatsapp_opt_status FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update opt status"
  ON public.whatsapp_opt_status FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_tenant_phone
  ON public.whatsapp_opt_status(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_opted_in
  ON public.whatsapp_opt_status(tenant_id, opted_in);

-- Trigger to auto-set opted_out_at when opted_in changes to false
CREATE OR REPLACE FUNCTION set_opted_out_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.opted_in = TRUE AND NEW.opted_in = FALSE AND NEW.opted_out_at IS NULL THEN
    NEW.opted_out_at = now();
  END IF;
  IF OLD.opted_in = FALSE AND NEW.opted_in = TRUE THEN
    NEW.opted_out_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_opt_timestamp_trigger
  ON public.whatsapp_opt_status;
CREATE TRIGGER whatsapp_opt_timestamp_trigger
  BEFORE UPDATE ON public.whatsapp_opt_status
  FOR EACH ROW EXECUTE FUNCTION set_opted_out_timestamp();

-- Add whatsapp_opt fields to contacts table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts'
    AND column_name = 'whatsapp_opt_in'
  ) THEN
    ALTER TABLE public.contacts
      ADD COLUMN whatsapp_opt_in BOOLEAN,
      ADD COLUMN whatsapp_opt_in_at TIMESTAMPTZ;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column may already exist: %', SQLERRM;
END $$;