-- =============================================================================
-- Migration: Sincronizar show_on_public_page entre profiles e agents
-- Data: 2026-06-10
-- Problema: O admin marca "CORRETOR (exibir no portal público)" mas o
-- checkbox não persiste ao reabrir, e o portal /agentes só mostra 1 agente.
-- Causa: AdminAgents lia da tabela legada `agents` mas salvava só em
-- `profiles.show_on_public_page`. Já corrigido no frontend (commit 3fdc473).
-- Esta migration:
-- 1. Ativa show_on_public_page=true para todos os admins e agents existentes
--    (para o portal público começar a mostrar todos)
-- 2. Sincroniza a tabela legada `agents` com profiles.show_on_public_page
-- =============================================================================

-- 1) Ativa todos os profiles de role admin/agent
UPDATE public.profiles p
SET show_on_public_page = true
FROM public.user_roles ur
WHERE p.user_id = ur.user_id
  AND ur.tenant_id = (
    SELECT id FROM public.tenants WHERE slug = 'default' LIMIT 1
  )
  AND ur.role IN ('admin', 'agent')
  AND p.show_on_public_page = false;

-- 2) Sincroniza tabela legada `agents` com profiles.show_on_public_page
--    Para cada profile com show_on_public_page=true, garante registro em agents
INSERT INTO public.agents (user_id, tenant_id, name, email, phone, public, active, bio)
SELECT
  p.user_id,
  p.tenant_id,
  p.full_name,
  p.email,
  p.phone,
  true,
  true,
  p.bio
FROM public.profiles p
WHERE p.show_on_public_page = true
ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET public = true,
      active = true,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      bio = EXCLUDED.bio;
