/**
 * Hook para carregar e salvar permissões de menu do tenant.
 * Lê do banco primeiro (Supabase), com fallback para localStorage (compatibilidade legada).
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MenuPermissionMatrix } from "@/lib/adminPermissions";

const STORAGE_KEY = "arruda_menu_permissions";

interface UseMenuPermissionsReturn {
  permissions: MenuPermissionMatrix | null;
  isLoading: boolean;
  savePermissions: (matrix: MenuPermissionMatrix) => Promise<void>;
  refresh: () => void;
}

export function useMenuPermissions(tenantId: string | undefined): UseMenuPermissionsReturn {
  const [permissions, setPermissions] = useState<MenuPermissionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("menu_permissions")
        .select("module_id, admin_access, agent_access, user_access")
        .eq("tenant_id", tenantId);

      if (!error && data && data.length > 0) {
        const matrix: MenuPermissionMatrix = {};
        data.forEach((row: any) => {
          matrix[row.module_id] = {
            admin: row.admin_access,
            agent: row.agent_access,
            user: row.user_access,
          };
        });
        setPermissions(matrix);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
        setIsLoading(false);
        return;
      }
    } catch { /* fall through */ }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setPermissions(JSON.parse(stored)); } catch { setPermissions({}); }
    } else {
      setPermissions({});
    }
    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const savePermissions = useCallback(async (matrix: MenuPermissionMatrix) => {
    setPermissions(matrix);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
    if (!tenantId) return;
    const rows = Object.entries(matrix).map(([module_id, roles]) => ({
      tenant_id: tenantId,
      module_id,
      admin_access: roles.admin || false,
      agent_access: roles.agent || false,
      user_access: roles.user || false,
      updated_at: new Date().toISOString(),
    }));
    for (const row of rows) {
      await supabase
        .from("menu_permissions")
        .upsert(row, { onConflict: "tenant_id,module_id" });
    }
  }, [tenantId]);

  return { permissions, isLoading, savePermissions, refresh: fetch };
}