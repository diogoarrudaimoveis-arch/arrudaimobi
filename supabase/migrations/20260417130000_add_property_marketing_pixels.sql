BEGIN;

-- Add marketing_pixels JSONB column to properties if missing
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS marketing_pixels jsonb NOT NULL DEFAULT '{"meta":"","google":"","tiktok":"","pinterest":""}'::jsonb;

-- Ensure existing rows have a valid default structure for marketing_pixels
UPDATE public.properties
SET marketing_pixels = COALESCE(marketing_pixels, '{}'::jsonb) || '{"meta":"","google":"","tiktok":"","pinterest":""}'::jsonb;

COMMIT;
