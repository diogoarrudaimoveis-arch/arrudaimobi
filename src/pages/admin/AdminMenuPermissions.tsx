import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdmin, normalizeRole } from "@/lib/adminPermissions";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { Shield, Lock, Eye, EyeOff, AlertTriangle, CreditCard, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MenuPermissionMatrix } from "@/lib/adminPermissions";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  techOnly: boolean;
  required: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊", techOnly: false, required: false },
  { id: "proprietarios", label: "Proprietários", icon: "👥", techOnly: false, required: false },
  { id: "imoveis", label: "Imóveis", icon: "🏠", techOnly: false, required: false },
  { id: "agenda", label: "Agenda", icon: "📅", techOnly: false, required: false },
  { id: "agentes", label: "Agentes & Usuários", icon: "👤", techOnly: false, required: false },
  { id: "tipos", label: "Tipos de Imóvel", icon: "🏷️", techOnly: false, required: false },
  { id: "comodidades", label: "Comodidades", icon: "✨", techOnly: false, required: false },
  { id: "blog", label: "Blog", icon: "📝", techOnly: false, required: false },
  { id: "contactos", label: "Contatos", icon: "📒", techOnly: false, required: false },
  { id: "mensagens", label: "Mensagens", icon: "💬", techOnly: false, required: false },
  { id: "configuracoes-ia", label: "Configurações de IA", icon: "🤖", techOnly: true, required: true },
  { id: "portais", label: "Portais", icon: "🌐", techOnly: true, required: true },
  { id: "marketing-portal", label: "Marketing Portal", icon: "📢", techOnly: true, required: true },
  { id: "performance", label: "Performance", icon: "📈", techOnly: true, required: true },
  { id: "central-ai", label: "Central IA", icon: "⚙️", techOnly: true, required: true },
  { id: "ia-agentes", label: "Agentes IA", icon: "🤖", techOnly: true, required: true },
  { id: "ia-automacoes", label: "IA Automações", icon: "🔄", techOnly: true, required: true },
  { id: "ia-logs", label: "IA Logs", icon: "📋", techOnly: true, required: true },
  { id: "ia-health", label: "IA Health", icon: "💚", techOnly: true, required: true },
  { id: "devops", label: "DevOps", icon: "🛠️", techOnly: true, required: true },
  { id: "meta-ads", label: "Meta Ads", icon: "📱", techOnly: true, required: true },
  { id: "supabase-monitor", label: "Supabase Monitor", icon: "🗄️", techOnly: true, required: true },
  { id: "perfil", label: "Perfil", icon: "👤", techOnly: false, required: false },
  { id: "email", label: "Email", icon: "✉️", techOnly: false, required: false },
  { id: "configuracoes", label: "Configurações", icon: "⚡", techOnly: true, required: true },
  { id: "permissoes-menu", label: "Permissões de Menu", icon: "🔐", techOnly: true, required: true },
];

const ROLES = [
  { id: "admin", label: "Admin", color: "bg-blue-100 text-blue-700" },
  { id: "developer", label: "Desenvolvedor", color: "bg-purple-100 text-purple-700" },
  { id: "agent", label: "Agente", color: "bg-green-100 text-green-700" },
  { id: "user", label: "Usuário", color: "bg-slate-100 text-slate-700" },
];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(MENU_ITEMS.map((m) => [m.id, true])),
  developer: Object.fromEntries(MENU_ITEMS.map((m) => [m.id, true])),
  agent: Object.fromEntries(MENU_ITEMS.map((m) => [m.id, !m.techOnly])),
  user: Object.fromEntries(MENU_ITEMS.map((m) => [m.id, !m.techOnly && m.id !== "agentes"])),
};

const STORAGE_KEY = "arruda_menu_permissions";
const ASAAS_KEY_STORAGE = "asaas_api_key";
const ASAAS_SANDBOX_STORAGE = "asaas_sandbox";

const AdminMenuPermissions = () => {
  const { profile, normalizedRole } = useAuth();
  const { data: tenant } = useTenantSettings();
  const userRole = normalizedRole;
  const isDev = normalizedRole === 'developer';
  const canEdit = canAccessAdmin(userRole);
  const tenantId = tenant?.id;

  // Matrix: Record<module_id, Record<role, boolean>>
  const [matrix, setMatrix] = useState<MenuPermissionMatrix>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"idle"|"testing"|"success"|"error">("idle");
  const [asaasKey, setAsaasKey] = useState(() => localStorage.getItem("asaas_api_key") || "");
  const [asaasSandbox, setAsaasSandbox] = useState(() => localStorage.getItem("asaas_sandbox") === "true");
  const [showAsaasConfig, setShowAsaasConfig] = useState(false);
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    const load = async () => {
      if (!tenantId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("menu_permissions")
          .select("module_id, admin_access, agent_access, user_access")
          .eq("tenant_id", tenantId);

        if (!error && data && data.length > 0) {
          const loaded: MenuPermissionMatrix = {};
          data.forEach((row: any) => {
            loaded[row.module_id] = {
              admin: row.admin_access,
              agent: row.agent_access,
              user: row.user_access,
            };
          });
          setMatrix(loaded);
          // Cache locally for offline-first
          localStorage.setItem("arruda_menu_permissions", JSON.stringify(loaded));
        } else {
          // No DB data: try localStorage
          const stored = localStorage.getItem("arruda_menu_permissions");
          if (stored) {
            try { setMatrix(JSON.parse(stored)); } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
      setIsLoading(false);
    };
    load();
  }, [tenantId]);

  const testAsaasConnection = async () => {
    if (!asaasKey) { toast.error("Cole uma API Key primeiro"); return; }
    setConnectionStatus("testing");
    try {
      const baseUrl = asaasSandbox ? "https://api-sandbox.asaas.com" : "https://api.asaas.com";
      const resp = await fetch(`${baseUrl}/v3/myAccount`, {
        headers: { "access_token": asaasKey, "Content-Type": "application/json" },
      });
      if (resp.ok) { setConnectionStatus("success"); toast.success("Conexão Asaas OK"); }
      else if (resp.status === 401) { setConnectionStatus("error"); toast.error("API key inválida"); }
      else { setConnectionStatus("error"); toast.error(`Erro: ${resp.status}`); }
    } catch { setConnectionStatus("error"); toast.error("Erro ao conectar com Asaas"); }
  };

  const saveAsaasSettings = () => {
    localStorage.setItem("asaas_api_key", asaasKey);
    localStorage.setItem("asaas_sandbox", String(asaasSandbox));
    toast.success("Configurações Asaas salvas");
  };

  const clearAsaasSettings = () => {
    setAsaasKey(""); setConnectionStatus("idle");
    localStorage.removeItem("asaas_api_key"); localStorage.removeItem("asaas_sandbox");
    toast("Configurações Asaas removidas");
  };

  const togglePermission = (role: string, menuId: string) => {
    if (!canEdit) return;
    const menu = MENU_ITEMS.find((m) => m.id === menuId);
    if (menu?.required && (role === "admin" || role === "developer")) return;
setMatrix((prev) => {
        const currentRoleVal = (prev[menuId] as any)?.[role] ?? false;
        return {
          ...prev,
          [menuId]: { ...(prev[menuId] as any || {}), [role]: !currentRoleVal },
        };
      });
  };

  const handleSave = useCallback(async () => {
    if (!canEdit || !tenantId) return;
    setSaving(true);
    try {
      const rows = Object.entries(matrix).map(([module_id, roles]) => ({
        tenant_id: tenantId,
        module_id,
        admin_access: (roles as any)?.admin ?? false,
        agent_access: (roles as any)?.agent ?? false,
        user_access: (roles as any)?.user ?? false,
        updated_at: new Date().toISOString(),
      }));
      for (const row of rows) {
        await supabase
          .from("menu_permissions")
          .upsert(row, { onConflict: "tenant_id,module_id" });
      }
      localStorage.setItem("arruda_menu_permissions", JSON.stringify(matrix));
      toast.success("Permissões salvas no banco de dados!");
    } catch {
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  }, [canEdit, tenantId, matrix]);

  const handleReset = async () => {
    if (!tenantId) return;
    setMatrix({});
    await supabase.from("menu_permissions").delete().eq("tenant_id", tenantId);
    localStorage.removeItem("arruda_menu_permissions");
    toast("Permissões restauradas para padrão");
  };

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Permissões de Menu"
          subtitle="Configure qual menu cada perfil pode ver no painel admin."
          actions={
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Restaurar Padrão
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Salvar Configuração
                  </Button>
                </>
              )}
              {/* Asaas Settings button */}
              {isDev && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAsaasConfig(!showAsaasConfig)}
                  className={showAsaasConfig ? "bg-purple-50 border-purple-200 text-purple-700" : ""}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Asaas
                </Button>
              )}
            </div>
          }
        />

        {/* Asaas Payment Configuration — developer only */}
        {isDev && showAsaasConfig && (
          <Card className="mb-6 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-purple-600" />
                Configuração de Pagamento — Asaas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type={showAsaasKey ? "text" : "password"}
                    value={asaasKey}
                    onChange={(e) => setAsaasKey(e.target.value)}
                    placeholder="Cole sua API Key do Asaas"
                    className="w-full px-3 py-2 pr-10 border rounded-lg text-sm bg-background"
                  />
                  <button
                    onClick={() => setShowAsaasKey(!showAsaasKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAsaasKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asaasSandbox}
                    onChange={(e) => setAsaasSandbox(e.target.checked)}
                    className="rounded"
                  />
                  Modo Sandbox (testes)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testAsaasConnection}
                    disabled={!asaasKey || connectionStatus === "testing"}
                  >
                    {connectionStatus === "testing" ? "Testando..." : "Testar Conexão"}
                  </Button>
                  {connectionStatus === "success" && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Conectado
                    </Badge>
                  )}
                  {connectionStatus === "error" && (
                    <Badge variant="destructive">Erro de conexão</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveAsaasSettings}>
                  Salvar Asaas
                </Button>
                {asaasKey && (
                  <Button size="sm" variant="ghost" onClick={clearAsaasSettings}>
                    Limpar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                A API Key é armazenada apenas neste navegador. Para persistir globalmente,
                conecte ao Supabase na aba Plans.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Banner */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-700 dark:text-green-300">
                Permissões persistidas no banco de dados
              </p>
              <p className="text-green-600/70 dark:text-green-400/70 mt-0.5">
                As configurações são salvas no Supabase e aplicadas em tempo real para todos os usuários do tenant.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading ? (
          <Card className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </Card>
        ) : (
          <>
          {/* Permissions Matrix */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">Matriz de Permissões por Perfil</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 w-[200px]">
                      Menu
                    </th>
                    {ROLES.map((role) => (
                      <th key={role.id} className="text-center px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${role.color}`}>
                            {role.label}
                          </span>
                          {(role.id === "admin" || role.id === "developer") && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MENU_ITEMS.map((menu) => (
                    <tr key={menu.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{menu.icon}</span>
                          <span className="text-xs font-medium">{menu.label}</span>
                          {menu.techOnly && (
                            <Badge variant="secondary" className="text-[10px] ml-1">tech</Badge>
                          )}
                          {menu.required && (
                            <Badge variant="outline" className="text-[10px] ml-1">obrigatório</Badge>
                          )}
                        </div>
                      </td>
                      {ROLES.map((role) => {
                        const isLocked = menu.required && (role.id === "admin" || role.id === "developer");
                        const checked = (matrix[menu.id] as any)?.[role.id] ?? false;
                        return (
                          <td key={role.id} className="text-center px-4 py-2.5">
                            {isLocked ? (
                              <div className="flex justify-center">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                                  <Shield className="h-3.5 w-3.5 text-primary" />
                                </div>
                              </div>
                            ) : canEdit ? (
                              <div className="flex justify-center">
                                <Switch
                                  checked={checked}
                                  onCheckedChange={() => togglePermission(role.id, menu.id)}
                                  aria-label={`${menu.label} para ${role.label}`}
                                />
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {checked
                                  ? <Eye className="h-4 w-4 text-green-600" />
                                  : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Current User Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Usuário atual:</span>
                  <span className="font-medium">{profile?.full_name || profile?.email || "Carregando..."}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Papel:</span>
                  <Badge variant="secondary" className="text-xs">
                    {profile?.role || "não definido"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}
      </AdminPageShell>
    </AdminLayout>
  );
};

export default AdminMenuPermissions;