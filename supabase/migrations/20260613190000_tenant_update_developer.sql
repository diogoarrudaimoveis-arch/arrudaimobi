-- Migration: Allow developer role to update any tenant
-- Required because AdminSettings uses supabase.from("tenants").update
-- and developer user (dhsolucoesdigital001) was getting silently blocked

DROP POLICY IF EXISTS "Admins and developers can update tenant" ON tenants;

CREATE POLICY "Admins and developers can update tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), id, 'admin')
    OR public.has_tenant_role(auth.uid(), id, 'developer')
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'developer'
    )
  );
