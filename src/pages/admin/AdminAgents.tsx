import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, PageCard } from "@/components/admin/shared/AdminComponents";
import { Users, UserPlus, Loader2, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRoleLabel, getRoleBadgeVariant, normalizeRole } from "@/lib/adminPermissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CompanyUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string;
  role: string;
  email?: string;
}

const AdminAgents = () => {
const { tenantId, isReady, session, isDeveloper, profile, normalizedRole } = useAuth();
  const isAdmin = normalizedRole === "admin";

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["company-users", tenantId],
    queryFn: async (): Promise<CompanyUser[]> => {
      if (!tenantId) throw new Error("No tenantId");

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone, bio, created_at")
        .eq("tenant_id", tenantId);
      if (profErr) throw profErr;

      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("tenant_id", tenantId);
      if (rolesErr) throw rolesErr;

      const roleMap: Record<string, string> = {};
      roles?.forEach((r) => { roleMap[r.user_id] = r.role; });

      const userIds = (profiles || []).map((p) => p.user_id);
      const emailMap: Record<string, string> = {};

      if (userIds.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            emailMap[user.id] = user.email;
          }
        } catch {
          // proceed without emails
        }
      }

      return (profiles || []).map((p) => ({
        ...p,
        role: roleMap[p.user_id] || "user",
        email: emailMap[p.user_id] || undefined,
      }));
    },
    enabled: isReady && !!tenantId,
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "user",
    bio: "",
    is_corretor: false,
    corretor_key: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);

  const handleCreateUser = async () => {
    if (!newUserForm.full_name || !newUserForm.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    setCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserForm.email,
        email_confirm: true,
        user_metadata: { full_name: newUserForm.full_name, phone: newUserForm.phone },
      });
      if (error) throw error;
      const userId = data.user.id;

      const { error: profileErr } = await supabase.from("profiles").upsert({
        user_id: userId,
        tenant_id: tenantId,
        full_name: newUserForm.full_name,
        phone: newUserForm.phone || null,
        bio: newUserForm.bio || null,
        is_corretor: newUserForm.is_corretor,
        corretor_key: newUserForm.is_corretor ? newUserForm.corretor_key : null,
      });
      if (profileErr) console.error("profile err:", profileErr);

      const { error: roleErr } = await supabase.from("user_roles").upsert({
        user_id: userId,
        tenant_id: tenantId,
        role: newUserForm.role,
      });
      if (roleErr) console.error("role err:", roleErr);

      toast.success("Usuário criado com sucesso");
      setShowCreateDialog(false);
      setNewUserForm({ full_name: "", email: "", phone: "", role: "user", bio: "", is_corretor: false, corretor_key: "" });
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
    } catch (err: any) {
      toast.error("Erro ao criar usuário: " + err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = (user: CompanyUser) => {
    setEditingUser(user);
    setShowCreateDialog(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Excluir este usuário? Esta ação não pode ser desfeita.")) return;
    try {
      // Delete role
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Delete profile
      await supabase.from("profiles").delete().eq("user_id", userId);
      // Delete auth user via service role (done via server action or manually in Supabase Dashboard)
      // Local records deleted; auth user cleanup requires manual dashboard action
      toast.success("Usuário removido do painel (perfil e role excluídos)");
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  };

  const roleBadgeVariant = (role: string) => {
    const variant = getRoleBadgeVariant(role);
    if (variant === "default") return "default";
    if (variant === "developer") return "secondary";
    if (variant === "secondary") return "success";
    return "outline";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  // Developer can do everything. Admin can only edit/delete agent/user (not admin or developer)
  const canEditUser = (u: CompanyUser) => {
    if (isDeveloper) return true;
    if (isAdmin && u.role !== "admin" && u.role !== "developer") return true;
    return false;
  };

  return (
    <AdminLayout>
      <AdminPageShell>
        <PageCard title="Agentes & Usuários" icon={Users}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  Agentes & Usuários
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLoading ? "Carregando membros..." : `${users.length} membros na imobiliária`}
                </p>
              </div>
              {isDeveloper && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="gap-2 bg-[#003366] hover:bg-[#002244] text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Criar Usuário
                </Button>
              )}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <Skeleton variant="circle" className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-48" />
                      <Skeleton variant="text" className="w-32" />
                    </div>
                    <Skeleton variant="default" className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : !users.length ? (
              <Card className="flex flex-col items-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-display font-semibold">Nenhum membro encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nenhum perfil encontrado para este tenant.
                </p>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Data Criação</TableHead>
                      {isDeveloper && <TableHead className="w-[100px]">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {(u.full_name || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.full_name || "Sem nome"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{u.email || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{u.phone || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(u.role)}>{getRoleLabel(u.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{formatDate(u.created_at)}</span>
                        </TableCell>
                        {isDeveloper && (
                          <TableCell>
                            {canEditUser(u) ? (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(u)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteUser(u.user_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {isAdmin && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Admin:</strong> Você pode visualizar todos os membros. Apenas o{" "}
                  <strong>Desenvolvedor</strong> pode criar e gerenciar usuários.
                </p>
              </div>
            )}
          </div>
        </PageCard>
      </AdminPageShell>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Nome da pessoa"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(31) 99999-9999"
              />
            </div>
            <div>
              <Label>Tipo de usuário *</Label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="user">Usuário</option>
                <option value="agent">Agente</option>
                <option value="financeiro">Financeiro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <Label>Biografia / Observações</Label>
              <Textarea
                value={newUserForm.bio}
                onChange={(e) => setNewUserForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>
            {/* Corretor section */}
            <div className="space-y-2 rounded-lg border p-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUserForm.is_corretor}
                  onChange={(e) => setNewUserForm((p) => ({ ...p, is_corretor: e.target.checked }))}
                  className="rounded"
                />
                Este usuário é um <strong>CORRETOR</strong> (exibir no portal público)
              </Label>
              {newUserForm.is_corretor && (
                <div>
                  <Label>Chave do Corretor (para portal público) *</Label>
                  <Input
                    value={newUserForm.corretor_key}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, corretor_key: e.target.value }))}
                    placeholder="Creci ou código único"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta chave identifica o corretor no portal público de agentes.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!newUserForm.full_name || !newUserForm.email || creatingUser}
            >
              {creatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAgents;