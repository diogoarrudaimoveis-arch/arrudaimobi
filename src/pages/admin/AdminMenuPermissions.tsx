import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdmin, normalizeRole } from "@/lib/adminPermissions";
import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
  { id: "ia-operacional", label: "IA Operacional", icon: "⚙️", techOnly: true, required: true },
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

const AdminMenuPermissions = () => {
  const { profile } = useAuth();
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_MATRIX;
    } catch {
      return DEFAULT_MATRIX;
    }
  });

  const userRole = normalizeRole(profile?.role);
  const canEdit = canAccessAdmin(userRole);

  const togglePermission = (role: string, menuId: string) => {
    if (!canEdit) return;
    const menu = MENU_ITEMS.find((m) => m.id === menuId);
    if (menu?.required && (role === "admin" || role === "developer")) return;
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [menuId]: !prev[role]?.[menuId] },
    }));
  };

  const handleSave = () => {
    if (!canEdit) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
    toast.success("Configurações salvas localmente", {
      description: "Persistência em banco pendente de aprovação do backend.",
    });
  };

  const handleReset = () => {
    setMatrix(DEFAULT_MATRIX);
    localStorage.removeItem(STORAGE_KEY);
    toast("Configurações restauradas para padrão");
  };

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Permissões de Menu"
          subtitle="Configure qual menu cada perfil pode ver no painel admin."
          actions={
            canEdit ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Restaurar Padrão
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Salvar Configuração
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" /> Apenas Admin/Developer
              </Badge>
            )
          }
        />

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300">
                Persistência em banco pendente de aprovação
              </p>
              <p className="text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                As configurações estão sendo salvas localmente neste navegador. Para persistir
                globalmente, é necessário criar uma tabela de permissões no banco com policy RLS
                apropriada. Backend approval required.
              </p>
            </div>
          </CardContent>
        </Card>

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
                {MENU_ITEMS.map((menu) => {
                  const menuRow = (
                    <td key={menu.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{menu.icon}</span>
                        <span className="text-xs font-medium">{menu.label}</span>
                        {menu.techOnly && (
                          <Badge variant="secondary" className="text-[10px] ml-1">
                            tech
                          </Badge>
                        )}
                        {menu.required && (
                          <Badge variant="outline" className="text-[10px] ml-1">
                            obrigatório
                          </Badge>
                        )}
                      </div>
                    </td>
                  );

                  return (
                    <tr key={menu.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      {menuRow}
                      {ROLES.map((role) => {
                        const isLocked = menu.required && (role.id === "admin" || role.id === "developer");
                        const checked = matrix[role.id]?.[menu.id] ?? false;
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
                                {checked ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
      </AdminPageShell>
    </AdminLayout>
  );
};

export default AdminMenuPermissions;