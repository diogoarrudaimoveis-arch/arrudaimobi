-- =============================================================================
-- Migration: RLS Hardening for properties and property_images
-- Objetivo: Restringir SELECT público apenas a imóveis 'available' e reforçar
--           INSERT/UPDATE/DELETE para garantir tenant_id correto.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROPERTIES: Remover política de SELECT aberta e criar granular
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;

-- Política pública: qualquer pessoa (anon ou autenticada) pode ver imóveis disponíveis
CREATE POLICY "Public can view available properties" ON public.properties
  FOR SELECT
  USING (status = 'available');

-- Política autenticada: agente do imóvel ou admin do mesmo tenant vê qualquer status
CREATE POLICY "Authenticated can view own tenant properties" ON public.properties
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      agent_id = auth.uid()
      OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- PROPERTIES: Reforçar INSERT — tenant_id deve ser o do usuário autenticado
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Agents can insert own properties" ON public.properties;

CREATE POLICY "Agents can insert own properties" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'agent')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- PROPERTIES: Reforçar UPDATE — somente no próprio tenant
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Agents can update own properties" ON public.properties;

CREATE POLICY "Agents can update own properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      agent_id = auth.uid()
      OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- -----------------------------------------------------------------------------
-- PROPERTIES: Reforçar DELETE — somente no próprio tenant
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Agents can delete own or admin all" ON public.properties;

CREATE POLICY "Agents can delete own or admin all" ON public.properties
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      agent_id = auth.uid()
      OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- PROPERTY_IMAGES: Restringir SELECT — somente imagens de imóveis visíveis
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;

-- Público: apenas imagens de imóveis disponíveis
CREATE POLICY "Public can view images of available properties" ON public.property_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.status = 'available'
    )
  );

-- Autenticado: agente do imóvel ou admin do mesmo tenant vê qualquer status
CREATE POLICY "Authenticated can view images of own tenant properties" ON public.property_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.tenant_id = public.get_user_tenant_id(auth.uid())
        AND (
          p.agent_id = auth.uid()
          OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin')
        )
    )
  );

-- -----------------------------------------------------------------------------
-- PROPERTY_IMAGES: Reforçar INSERT — somente em imóveis do próprio tenant
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Property owners can insert images" ON public.property_images;

CREATE POLICY "Property owners can insert images" ON public.property_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.tenant_id = public.get_user_tenant_id(auth.uid())
        AND (
          p.agent_id = auth.uid()
          OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin')
        )
    )
  );

-- -----------------------------------------------------------------------------
-- PROPERTY_IMAGES: Reforçar DELETE — somente em imóveis do próprio tenant
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Property owners can delete images" ON public.property_images;

CREATE POLICY "Property owners can delete images" ON public.property_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.tenant_id = public.get_user_tenant_id(auth.uid())
        AND (
          p.agent_id = auth.uid()
          OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin')
        )
    )
  );

-- =============================================================================
-- CHECKLIST DE VALIDAÇÃO MANUAL
-- =============================================================================
-- 1. [SQL] Verificar políticas ativas em properties:
--    SELECT policyname, cmd, qual, with_check
--    FROM pg_policies WHERE tablename = 'properties';
--
-- 2. [SQL] Verificar políticas ativas em property_images:
--    SELECT policyname, cmd, qual, with_check
--    FROM pg_policies WHERE tablename = 'property_images';
--
-- 3. [UI] Como usuário anônimo: deve enxergar apenas imóveis com status='available'
-- 4. [UI] Como agente autenticado: deve enxergar seus imóveis independentemente do status
-- 5. [UI] Como admin autenticado: deve enxergar todos os imóveis do seu tenant
-- 6. [UI] Como agente de outro tenant: NÃO deve enxergar imóveis de outro tenant
-- 7. [SQL] Testar INSERT com tenant_id errado (deve falhar):
--    INSERT INTO properties (tenant_id, ...) VALUES ('outro-tenant-id', ...);
-- =============================================================================
