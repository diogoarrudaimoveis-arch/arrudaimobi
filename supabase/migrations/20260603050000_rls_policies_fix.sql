-- ============================================================
-- RLS Policies: profiles + user_roles + menu_permissions
-- Tenant: 9b4b048e-7d09-48a7-aebb-8376cc443695
-- Data: 2026-06-03
-- ============================================================

-- ── profiles ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON profiles;

-- Qualquer usuário autenticado cujo tenant aparece em user_roles pode ver profiles do mesmo tenant
CREATE POLICY "profiles_tenant_read"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Admin/Developer podem criar profiles
CREATE POLICY "profiles_admin_insert"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Admin/Developer podem atualizar profiles
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Apenas Developer pode deletar profiles
CREATE POLICY "profiles_developer_delete"
  ON profiles FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'developer'
    )
  );

-- ── user_roles ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;

-- Qualquer usuário autenticado pode ver roles do próprio tenant
CREATE POLICY "user_roles_tenant_read"
  ON user_roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Admin/Developer podem criar roles
CREATE POLICY "user_roles_admin_insert"
  ON user_roles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Admin/Developer podem atualizar roles
CREATE POLICY "user_roles_admin_update"
  ON user_roles FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Apenas Developer pode deletar roles
CREATE POLICY "user_roles_developer_delete"
  ON user_roles FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'developer'
    )
  );

-- ── menu_permissions ─────────────────────────────────────────

DROP POLICY IF EXISTS "menu_permissions_tenant_isolation" ON menu_permissions;

-- Qualquer admin/developer do tenant pode ver e gerenciar permissões de menu
CREATE POLICY "menu_permissions_tenant_access"
  ON menu_permissions FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- RLS Policies: profiles + user_roles + menu_permissions
-- Tenant: 9b4b048e-7d09-48a7-aebb-8376cc443695
-- Data: 2026-06-03
-- ============================================================

-- ── profiles ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON profiles;

-- Qualquer usuário autenticado cujo tenant aparece em user_roles pode ver profiles do mesmo tenant
CREATE POLICY "profiles_tenant_read"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Admin/Developer podem criar profiles
CREATE POLICY "profiles_admin_insert"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Admin/Developer podem atualizar profiles
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Apenas Developer pode deletar profiles
CREATE POLICY "profiles_developer_delete"
  ON profiles FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'developer'
    )
  );

-- ── user_roles ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;

-- Qualquer usuário autenticado pode ver roles do próprio tenant
CREATE POLICY "user_roles_tenant_read"
  ON user_roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Admin/Developer podem criar roles
CREATE POLICY "user_roles_admin_insert"
  ON user_roles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Admin/Developer podem atualizar roles
CREATE POLICY "user_roles_admin_update"
  ON user_roles FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'developer')
    )
  );

-- Apenas Developer pode deletar roles
CREATE POLICY "user_roles_developer_delete"
  ON user_roles FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'developer'
    )
  );

-- ── menu_permissions ─────────────────────────────────────────

DROP POLICY IF EXISTS "menu_permissions_tenant_isolation" ON menu_permissions;

-- Qualquer admin/developer do tenant pode ver e gerenciar permissões de menu
CREATE POLICY "menu_permissions_tenant_access"
  ON menu_permissions FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Verificação: listar usuários do tenant
-- ============================================================
SELECT
  p.full_name,
  au.email,
  p.phone,
  ur.role,
  p.tenant_id
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
JOIN auth.users au ON au.id = p.user_id
WHERE p.tenant_id = '9b4b048e-7d09-48a7-aebb-8376cc443695'
ORDER BY p.full_name;

-- ============================================================
-- Verificação: listar usuários do tenant
-- ============================================================
SELECT
  p.full_name,
  au.email,
  p.phone,
  ur.role,
  p.tenant_id
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
JOIN auth.users au ON au.id = p.user_id
WHERE p.tenant_id = '9b4b048e-7d09-48a7-aebb-8376cc443695'
ORDER BY p.full_name;