-- Tabela menu_permissions: controlar acesso a módulos do admin por tenant e role
CREATE TABLE IF NOT EXISTS public.menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  admin_access BOOLEAN NOT NULL DEFAULT false,
  agent_access BOOLEAN NOT NULL DEFAULT false,
  user_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, module_id)
);

COMMENT ON TABLE public.menu_permissions IS 'Permissões de menu por tenant — controla quais módulos cada role pode ver no admin.';

CREATE INDEX IF NOT EXISTS idx_menu_permissions_tenant ON public.menu_permissions(tenant_id);

-- RLS: tenants só veem suas próprias permissões
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_permissions_tenant_isolation"
  ON public.menu_permissions
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID);