-- ============================================================
-- RLS HARDENING: bloqueia vazamento de PII via anon
-- Data: 2026-06-14
-- Tabelas: user_roles, contacts, appointments, owners
-- ============================================================

-- user_roles: já tem policy mas precisa ser revalidada
DROP POLICY IF EXISTS "user_roles_tenant_read" ON user_roles;
CREATE POLICY "user_roles_tenant_read"
  ON user_roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- contacts: bloquear anon, só auth users do mesmo tenant
DROP POLICY IF EXISTS "contacts_tenant_read" ON contacts;
DROP POLICY IF EXISTS "contacts_tenant_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_tenant_update" ON contacts;
DROP POLICY IF EXISTS "contacts_tenant_delete" ON contacts;

CREATE POLICY "contacts_tenant_read"
  ON contacts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_tenant_insert"
  ON contacts FOR INSERT
  WITH CHECK (true);  -- Anyone authenticated can submit a contact form

CREATE POLICY "contacts_tenant_update"
  ON contacts FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_tenant_delete"
  ON contacts FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- appointments
DROP POLICY IF EXISTS "appointments_tenant_read" ON appointments;
DROP POLICY IF EXISTS "appointments_tenant_write" ON appointments;

CREATE POLICY "appointments_tenant_read"
  ON appointments FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "appointments_tenant_write"
  ON appointments FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- owners
DROP POLICY IF EXISTS "owners_tenant_read" ON owners;
DROP POLICY IF EXISTS "owners_tenant_write" ON owners;

CREATE POLICY "owners_tenant_read"
  ON owners FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "owners_tenant_write"
  ON owners FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- profiles: já tem mas revisa
DROP POLICY IF EXISTS "profiles_tenant_read" ON profiles;
CREATE POLICY "profiles_tenant_read"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- IMPORTANTE: Esta policy especial permite agentes aparecerem no portal público
-- A policy public_agents_read já existe da migration 20260613190000_profiles_public_read.sql
-- Não vamos duplicar aqui.

-- Verificação: listar policies criadas
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_roles', 'contacts', 'appointments', 'owners', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;