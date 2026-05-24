/**
 * AdminMostruario — Developer-only panel for tenant configuration
 * Path: #/admin/mostruario
 * Access: ONLY developer role
 *
 * Shows:
 * - Tenant identity and status
 * - Plan limits (max properties, users, agents, etc.)
 * - Enabled/disabled modules
 * - Menu permission matrix by role
 * - Current usage vs limits
 */
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, PageCard } from "@/components/admin/shared/AdminComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Download, AlertTriangle, Lock } from "lucide-react";
import { normalizeRole } from "@/lib/adminPermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Modules that can be enabled/disabled per tenant
const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", description: "Visão geral e métricas" },
  { key: "owners", label: "Proprietários", description: "Gestão de proprietários" },
  { key: "properties", label: "Imóveis", description: "Gestão de imóveis" },
  { key: "agenda", label: "Agenda", description: "Agenda e agendamentos" },
  { key: "agents", label: "Agentes", description: "Gestão de agentes e usuários" },
  { key: "property-types", label: "Tipos de Imóvel", description: "Tipos e categorias" },
  { key: "amenities", label: "Comodidades", description: "Comodidades e recursos" },
  { key: "media", label: "Biblioteca de Mídias", description: "Fotos e mídias" },
  { key: "blog", label: "Blog", description: "Blog e artigos" },
  { key: "contacts", label: "Contatos", description: "CRM e contatos" },
  { key: "messages", label: "Mensagens", description: "Mensagens e conversas" },
  { key: "ai-config", label: "Configurações de IA", description: "Configuração de IA" },
  { key: "portals", label: "Portais Imobiliários", description: "Integração com portais" },
  { key: "tracking", label: "Rastreamento do Portal", description: "Tracking de portais" },
  { key: "performance", label: "Performance de Imóveis", description: "Análise de performance" },
  { key: "central-ai", label: "Central IA", description: "Operações de IA" },
  { key: "ai-agents", label: "Agentes IA", description: "Agentes autônomos" },
  { key: "n8n", label: "Automações N8N", description: "Workflows N8N" },
  { key: "logs", label: "Logs", description: "Logs do sistema" },
  { key: "health", label: "Health Checks", description: "Monitoramento" },
  { key: "devops", label: "DevOps", description: "DevOps e deploy" },
  { key: "meta-ads", label: "Meta Ads", description: "Integração Meta Ads" },
  { key: "supabase", label: "Supabase", description: "Monitor Supabase" },
  { key: "email-config", label: "Config. E-mail", description: "Configuração de e-mail" },
  { key: "settings", label: "Configurações", description: "Configurações gerais" },
  { key: "menu-permissions", label: "Permissões de Menu", description: "Permissões" },
];

// Menu permission matrix
const MENU_PERMISSIONS = [
  { key: "owners", label: "Proprietários" },
  { key: "properties", label: "Imóveis" },
  { key: "agenda", label: "Agenda" },
  { key: "agents", label: "Agentes" },
  { key: "contacts", label: "Contatos" },
  { key: "messages", label: "Mensagens" },
  { key: "blog", label: "Blog" },
  { key: "media", label: "Mídias" },
  { key: "portals", label: "Portais" },
  { key: "ai-config", label: "Config IA" },
  { key: "central-ai", label: "Central IA" },
  { key: "devops", label: "DevOps" },
];

export default function AdminMostruario() {
  const { tenantId, isReady, session, profile } = useAuth();
  const { toast } = useToast();

  const normalizedRole = normalizeRole(profile?.role);
  if (normalizedRole !== "developer") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md text-center">
            <CardHeader>
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <CardTitle>Acesso Restrito</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Esta página é exclusiva para <strong>Desenvolvedor</strong>.
                Apenas o desenvolvedor pode gerenciar identidade da imobiliária e módulos habilitados.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Load current tenant usage
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["tenant-usage", tenantId],
    queryFn: async () => {
      const [propertiesRes, profilesRes, contactsRes] = await Promise.allSettled([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
      ]);

      return {
        properties: (propertiesRes.status === "fulfilled" ? propertiesRes.value.count ?? 0 : 0),
        users: (profilesRes.status === "fulfilled" ? profilesRes.value.count ?? 0 : 0),
        contacts: (contactsRes.status === "fulfilled" ? contactsRes.value.count ?? 0 : 0),
      };
    },
    enabled: isReady && !!tenantId,
  });

  // Form state for limits
  const [limits, setLimits] = useState({
    max_properties: 100,
    max_users: 20,
    max_agents: 10,
    max_owners: 200,
    max_contacts: 500,
    max_media: 1000,
  });

  const [enabledModules, setEnabledModules] = useState<string[]>(ALL_MODULES.map((m) => m.key));
  const [menuPermissions, setMenuPermissions] = useState<Record<string, Record<string, boolean>>>({
    admin: {},
    agent: {},
    user: {},
  });
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState("Arruda Imobi");
  const [tenantStatus, setTenantStatus] = useState<"active" | "inactive">("active");

  const toggleModule = (key: string) => {
    setEnabledModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleMenuPermission = (role: string, menuKey: string) => {
    setMenuPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menuKey]: !prev[role][menuKey],
      },
    }));
  };

  const resetToDefault = () => {
    setLimits({ max_properties: 100, max_users: 20, max_agents: 10, max_owners: 200, max_contacts: 500, max_media: 1000 });
    setEnabledModules(ALL_MODULES.map((m) => m.key));
    setMenuPermissions({
      admin: Object.fromEntries(MENU_PERMISSIONS.map((m) => [m.key, true])),
      agent: Object.fromEntries(MENU_PERMISSIONS.map((m) => [m.key, false])),
      user: Object.fromEntries(MENU_PERMISSIONS.map((m) => [m.key, false])),
    });
    toast({ title: "Restaurado padrão", description: "Configurações restauradas para padrão." });
  };

  const handleSave = async () => {
    setSaving(true);
    // In a full implementation, this would save to tenant_plans, tenant_menu_permissions tables
    // For now, save to localStorage as a temporary bridge until SaaS tables are created
    try {
      const config = { limits, enabledModules, menuPermissions, tenantName, tenantStatus, updated_at: new Date().toISOString() };
      localStorage.setItem(`mostruario_config_${tenantId}`, JSON.stringify(config));
      toast({ title: "Configuração salva", description: "Mostruário salvo com sucesso. Persistência em banco exige SQL aprovado." });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const config = { limits, enabledModules, menuPermissions, tenantName, tenantStatus };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mostruario-${tenantId}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const usagePercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  return (
    <AdminLayout>
      <AdminPageShell title="Mostruário" description="Configuração completa da imobiliária — módulos, limites e permissões.">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Persistência em banco de dados depende de SQL aprovado para tabelas SaaS. Atualmente salvo em localStorage como ponte.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Tenant Identity */}
          <PageCard title="Identidade da Imobiliária" description="Informações básicas da conta">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tenant-name">Nome da Imobiliária</Label>
                <Input
                  id="tenant-name"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Nome da imobiliária"
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    variant={tenantStatus === "active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTenantStatus("active")}
                  >
                    Ativo
                  </Button>
                  <Button
                    variant={tenantStatus === "inactive" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setTenantStatus("inactive")}
                  >
                    Inativo
                  </Button>
                </div>
              </div>
            </div>
          </PageCard>

          {/* Plan Limits */}
          <PageCard title="Limites do Plano" description="Quantidade máxima de recursos permitidos">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "max_properties", label: "Imóveis", current: usage?.properties ?? 0 },
                { key: "max_users", label: "Usuários", current: usage?.users ?? 0 },
                { key: "max_agents", label: "Agentes", current: usage?.users ?? 0 },
                { key: "max_owners", label: "Proprietários", current: 0 },
                { key: "max_contacts", label: "Contatos", current: usage?.contacts ?? 0 },
                { key: "max_media", label: "Mídias", current: 0 },
              ].map(({ key, label, current }) => {
                const max = (limits as any)[key] || 0;
                const pct = usagePercentage(current, max);
                return (
                  <div key={key} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{current} / {max}</span>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={max}
                      onChange={(e) => setLimits((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="mb-2"
                    />
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn("h-2 rounded-full transition-all", pct > 90 ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </PageCard>

          {/* Enabled Modules */}
          <PageCard title="Módulos Habilitados" description="Marque os módulos disponíveis para esta imobiliária">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_MODULES.map((module) => (
                <div
                  key={module.key}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-colors",
                    enabledModules.includes(module.key) ? "border-primary bg-primary/5" : "border-border opacity-60"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{module.label}</p>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                  <Switch
                    checked={enabledModules.includes(module.key)}
                    onCheckedChange={() => toggleModule(module.key)}
                  />
                </div>
              ))}
            </div>
          </PageCard>

          {/* Menu Permission Matrix */}
          <PageCard title="Permissões de Menu por Papel" description="Configure o que cada papel pode acessar">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Menu</th>
                    <th className="text-center py-2 px-3 font-medium">Admin</th>
                    <th className="text-center py-2 px-3 font-medium">Agente</th>
                    <th className="text-center py-2 px-3 font-medium">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {MENU_PERMISSIONS.map((menu) => (
                    <tr key={menu.key} className="border-b border-border">
                      <td className="py-2 px-3">{menu.label}</td>
                      {["admin", "agent", "user"].map((role) => (
                        <td key={role} className="text-center py-2 px-3">
                          <Switch
                            checked={menuPermissions[role]?.[menu.key] ?? (role === "admin")}
                            onCheckedChange={() => toggleMenuPermission(role, menu.key)}
                            disabled={role === "admin"}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Admin sempre tem acesso total. Desenvolvedor vê tudo independente desta matriz.
            </p>
          </PageCard>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#003366] hover:bg-[#002244]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Configuração
            </Button>
            <Button variant="outline" onClick={resetToDefault} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrão
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar JSON
            </Button>
          </div>
        </div>
      </AdminPageShell>
    </AdminLayout>
  );
}