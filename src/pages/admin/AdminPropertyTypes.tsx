import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminPropertyTypes = () => {
  const { tenantId, isReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", icon: "Building2", active: true });

  const { data: types, isLoading } = useQuery({
    queryKey: ["admin-property-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_types")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { tenant_id: tenantId!, name: form.name, icon: form.icon, active: form.active };
      if (editingId) {
        const { error } = await supabase.from("property_types").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("property_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-property-types"] });
      toast({ title: editingId ? "Tipo atualizado!" : "Tipo criado!" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-property-types"] });
      toast({ title: "Tipo removido" });
    },
  });

  const resetForm = () => { setForm({ name: "", icon: "Building2", active: true }); setEditingId(null); };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({ name: t.name, icon: t.icon || "Building2", active: t.active });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Tipos de Imóvel</h1>
            <p className="text-muted-foreground">Gerencie os tipos disponíveis</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Tipo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Tipo" : "Novo Tipo"}</DialogTitle>
                <DialogDescription className="sr-only">Cadastre ou edite os tipos de imóveis disponíveis na plataforma, definindo nomes, ícones e status de exibição.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nome *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Ícone</label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Building2" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <label className="text-sm">Ativo</label>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !types?.length ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <Tag className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-display font-semibold">Nenhum tipo cadastrado</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ícone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.icon}</TableCell>
                    <TableCell>
                      <Badge variant={t.active ? "default" : "secondary"}>
                        {t.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirmId(t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tipo de Imóvel</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este tipo? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId) { deleteMutation.mutate(deleteConfirmId); setDeleteConfirmId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPropertyTypes;
