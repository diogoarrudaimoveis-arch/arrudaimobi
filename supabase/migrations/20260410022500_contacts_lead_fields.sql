-- =============================================================================
-- Migration: Adicionar campos de diferenciação de leads na tabela contacts
-- Objetivo: Permitir rastrear leads captados por automação externa (ex: WhatsApp Bot,
--           integrações de portais, etc.) separados dos leads orgânicos do site.
-- =============================================================================

-- Adicionar coluna is_external_lead
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS is_external_lead BOOLEAN NOT NULL DEFAULT false;

-- Adicionar coluna external_source (ex: 'whatsapp_bot', 'zapier', 'facebook_lead_ads')
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS external_source TEXT DEFAULT NULL;

-- Índice para filtros rápidos por tipo de lead
DROP INDEX IF EXISTS idx_contacts_is_external_lead;
CREATE INDEX idx_contacts_is_external_lead ON public.contacts(tenant_id, is_external_lead);

-- Índice para filtros por fonte externa
DROP INDEX IF EXISTS idx_contacts_external_source;
CREATE INDEX idx_contacts_external_source ON public.contacts(tenant_id, external_source)
  WHERE external_source IS NOT NULL;

-- =============================================================================
-- CHECKLIST DE VALIDAÇÃO MANUAL
-- =============================================================================
-- 1. [SQL] Verificar novas colunas:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'contacts'
--    AND column_name IN ('is_external_lead', 'external_source');
--
-- 2. [SQL] Verificar índices criados:
--    SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename = 'contacts'
--    AND indexname LIKE 'idx_contacts_%lead%';
--
-- 3. [SQL] Testar insert com novos campos:
--    INSERT INTO contacts (tenant_id, name, phone, is_external_lead, external_source, ...)
--    VALUES (..., true, 'whatsapp_bot', ...);
--
-- 4. [UI] Admin Dashboard deve exibir contagem de leads externos separada
-- =============================================================================
