-- Migration: Suporte a múltiplas chaves de API (arrays) por provedor de IA
-- Objetivo: trocar TEXT simples por JSONB arrays para possibilitar rodízio de chaves

-- Migrar openai_key → openai_keys (JSONB array)
ALTER TABLE public.tenant_ai_settings
  ADD COLUMN IF NOT EXISTS openai_keys JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.tenant_ai_settings
  ADD COLUMN IF NOT EXISTS gemini_keys JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.tenant_ai_settings
  ADD COLUMN IF NOT EXISTS groq_keys JSONB DEFAULT '[]'::jsonb;

-- Copiar dados existentes das colunas legadas para as novas (migração de dados)
UPDATE public.tenant_ai_settings
  SET openai_keys = CASE WHEN openai_key IS NOT NULL AND trim(openai_key) <> '' THEN jsonb_build_array(openai_key) ELSE '[]'::jsonb END
  WHERE openai_keys = '[]'::jsonb;

UPDATE public.tenant_ai_settings
  SET gemini_keys = CASE WHEN gemini_key IS NOT NULL AND trim(gemini_key) <> '' THEN jsonb_build_array(gemini_key) ELSE '[]'::jsonb END
  WHERE gemini_keys = '[]'::jsonb;

UPDATE public.tenant_ai_settings
  SET groq_keys = CASE WHEN groq_key IS NOT NULL AND trim(groq_key) <> '' THEN jsonb_build_array(groq_key) ELSE '[]'::jsonb END
  WHERE groq_keys = '[]'::jsonb;

-- Adicionar índice para o campo de estratégia
CREATE INDEX IF NOT EXISTS idx_tenant_ai_settings_strategy ON public.tenant_ai_settings(rotation_strategy);

-- Checklist de validação:
-- SELECT tenant_id, openai_keys, gemini_keys, groq_keys FROM public.tenant_ai_settings;
-- Deve exibir arrays JSON com as chaves antigas migradas para a primeira posição.
