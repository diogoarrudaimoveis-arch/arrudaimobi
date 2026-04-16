import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Users, UserPlus, Trash2, Pencil, Save } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { DialogDescription } from "@/components/ui/dialog";
import { LogoCropper } from "@/components/admin/LogoCropper";

const AdminAgents = () => {
  const { tenantId, isReady, session, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // New agent form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("agent");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [showOnPublicPage, setShowOnPublicPage] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<{ userId: string; name: string } | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["admin-agents", tenantId],
    queryFn: async () => {
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (profErr) throw profErr;

      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("tenant_id", tenantId!);
      if (rolesErr) throw rolesErr;

      const roleMap: Record<string, string> = {};
      roles?.forEach(r => { roleMap[r.user_id] = r.role; });

      return (profiles || []).map(p => ({
        ...p,
        role: roleMap[p.user_id] || "user",
      }));
    },
    enabled: isReady && !!tenantId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("tenant_id", tenantId!);
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        tenant_id: tenantId!,
        role: role as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
      toast({ title: "Papel atualizado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("tenant_id", tenantId!);
      if (roleErr) throw roleErr;
      const { error: profileErr } = await supabase.from("profiles").delete().eq("user_id", userId).eq("tenant_id", tenantId!);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
      toast({ title: "Usuário removido!" });
      setDeleteConfirmAgent(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleCreateAgent = async () => {
    if (!newEmail.trim() || (!editingAgent && !newPassword.trim())) {
      toast({ title: "Email e senha são obrigatórios", variant: "destructive" });
      return;
    }
    if (!editingAgent && newPassword.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/create-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: editingAgent ? "update" : "create",
          userId: editingAgent?.user_id,
          email: newEmail.trim(),
          password: newPassword || undefined,
          full_name: newName.trim() || newEmail.trim(),
          phone: newPhone.trim(),
          role: newRole,
          avatar_url: newAvatarUrl || undefined,
          show_on_public_page: showOnPublicPage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar usuário");

      toast({ title: editingAgent ? "Usuário atualizado!" : "Usuário criado com sucesso!" });
      resetForm();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewPhone("");
    setNewRole("agent");
    setShowOnPublicPage(false);
    setNewAvatarUrl("");
    setEditingAgent(null);
  };

  const openEditDialog = async (agent: any) => {
    setEditingAgent(agent);
    setNewName(agent.full_name || "");
    setNewEmail(agent.email || "");
    setNewPhone(agent.phone || "");
    setNewRole(agent.role || "agent");
    setShowOnPublicPage(!!agent.show_on_public_page);
    setNewAvatarUrl(agent.avatar_url || "");

    if (!agent.email && agent.user_id) {
      try {
        const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/create-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "load", userId: agent.user_id }),
        });
        const data = await res.json();
        if (res.ok && data?.email) {
          setNewEmail(data.email);
        }
      } catch (err) {
        console.warn("Falha ao carregar email do usuário:", err);
      }
    }

    setDialogOpen(true);
  };

  const handleAvatarCropped = async (blob: Blob) => {
    try {
      const fileName = `avatars/${crypto.randomUUID()}.png`;
      const { data, error } = await supabase.storage
        .from("property-images")
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("property-images")
        .getPublicUrl(data.path);

      setNewAvatarUrl(publicUrl);
      setIsCropperOpen(false);
      toast({ title: "Foto enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    }
  };

  const getRoleLabel = (agent: any) => agent.role || "user";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Agentes & Usuários</h1>
            <p className="text-muted-foreground">{agents?.length || 0} membros</p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <UserPlus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {/* Create Agent Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAgent ? "Editar Usuário" : "Adicionar Usuário"}</DialogTitle>
              <DialogDescription className="sr-only">
                Gerenciamento de usuários e corretores da imobiliária
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={newAvatarUrl} />
                  <AvatarFallback className="bg-muted text-2xl font-display">
                    {(newName || "U").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={() => setIsCropperOpen(true)}>
                  {newAvatarUrl ? "Alterar Foto" : "Adicionar Foto"}
                </Button>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nome completo</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="João Silva" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email *</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              {!editingAgent && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Senha *</label>
                  <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(11) 99999-0000" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Papel</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Exibir no site público</p>
                  <p className="text-xs text-muted-foreground">Ative para que este agente apareça na página pública de agentes.</p>
                </div>
                <Switch checked={showOnPublicPage} onCheckedChange={(checked) => setShowOnPublicPage(checked)} />
              </div>
              <Button onClick={handleCreateAgent} disabled={creating} className="w-full gap-2 bg-[#003366] hover:bg-[#002244] text-white">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : editingAgent ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingAgent ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <LogoCropper
          open={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          onCropped={handleAvatarCropped}
          aspect={1}
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !agents?.length ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-display font-semibold">Nenhum membro encontrado</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent: any) => {
                  const role = getRoleLabel(agent);
                  return (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={agent.avatar_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {(agent.full_name || "U").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{agent.full_name || "Sem nome"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{agent.phone || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={role}
                          onValueChange={(v) => updateRoleMutation.mutate({ userId: agent.user_id, role: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agente</SelectItem>
                            <SelectItem value="user">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Badge variant={role === "admin" ? "default" : role === "agent" ? "secondary" : "outline"}>
                            {role}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(agent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {agent.user_id !== user?.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmAgent({ userId: agent.user_id, name: agent.full_name || "Sem nome" })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteConfirmAgent} onOpenChange={() => setDeleteConfirmAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteConfirmAgent?.name}" do sistema? O perfil e permissões serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmAgent) deleteAgentMutation.mutate(deleteConfirmAgent.userId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAgentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAgents;
