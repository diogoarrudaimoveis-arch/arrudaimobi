import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader, PageCard } from "@/components/admin/shared/AdminComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { sonnerToast } from "@/components/ui/sonner";
import { Plus, Pencil, Trash2, Loader2, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminAmenities = () => {
  const { tenantId, isReady } = useAuth();
    const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", icon: "Check" });

  const { data: amenities, isLoading } = useQuery({
    queryKey: ["admin-amenities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("amenities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { tenant_id: tenantId!, name: form.name, icon: form.icon };
      if (editingId) {
        const { error } = await supabase.from("amenities").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("amenities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-amenities"] });
      sonnerToast({ title: editingId ? "Comodidade atualizada!" : "Comodidade criada!" });
      setForm({ name: "", icon: "Check" }); setEditingId(null); setDialogOpen(false);
    },
    onError: (err: any) => sonnerToast({ title: "Erro", description: err?.message || String(err || "Erro desconhecido"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("amenities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-amenities"] });
      sonnerToast({ title: "Comodidade removida" });
    },
  });

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Comodidades"
          subtitle="Gerencie as comodidades disponíveis"
          actions={
            <Button onClick={() => { setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Comodidade
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !amenities?.length ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-display font-semibold">Nenhuma comodidade cadastrada</p>
          </Card>
        ) : (
          <PageCard>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ícone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amenities.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.icon}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingId(a.id); setForm({ name: a.name, icon: a.icon || "Check" }); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirmId(a.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </PageCard>
        )}
      </AdminPageShell>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setForm({ name: "", icon: "Check" }); setEditingId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nova Comodidade"}</DialogTitle>
            <DialogDescription className="sr-only">Gerencie as comodidades disponíveis para os imóveis, definindo nomes, ícones e categorias.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ícone</label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Check" />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comodidade</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta comodidade? Esta ação não pode ser desfeita.</AlertDialogDescription>
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

export default AdminAmenities;