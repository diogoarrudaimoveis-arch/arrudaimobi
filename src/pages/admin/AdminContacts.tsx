import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquare, Plus, Pencil, Trash2, LayoutGrid, TableIcon, Phone, Mail, GripVertical, MessageCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TablePagination } from "@/components/ui/table-pagination";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";

const TABLE_PAGE_SIZE = 20;

const statusColumns = [
  { key: "new", label: "Novo", color: "bg-blue-500" },
  { key: "read", label: "Lido", color: "bg-amber-500" },
  { key: "replied", label: "Respondido", color: "bg-green-500" },
  { key: "archived", label: "Arquivado", color: "bg-muted-foreground" },
] as const;

const statusLabels: Record<string, string> = {
  new: "Novo",
  read: "Lido",
  replied: "Respondido",
  archived: "Arquivado",
};

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
}

const emptyForm: ContactForm = { name: "", email: "", phone: "", message: "", status: "new" };

const AdminContacts = () => {
  const { tenantId, isReady, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(1);
  
  // Quick Message state
  const [isQuickMessageOpen, setIsQuickMessageOpen] = useState(false);
  const [quickMessageTarget, setQuickMessageTarget] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["admin-contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, properties(title)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contacts").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      if (!form.phone.trim()) throw new Error("Telefone é obrigatório");

      if (editingId) {
        const { error } = await supabase.from("contacts").update({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          message: form.message.trim() || null,
          status: form.status as any,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          message: form.message.trim() || null,
          status: form.status as any,
          tenant_id: tenantId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      toast({ title: editingId ? "Contato atualizado!" : "Contato adicionado!" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      toast({ title: "Contato excluído" });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };


  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      message: c.message || "",
      status: c.status || "new",
    });
    setDialogOpen(true);
  };


  const openQuickMessage = (c: any) => {
    setQuickMessageTarget(c);
    setMessageText("");
    setIsQuickMessageOpen(true);
  };

  const handleSendQuickMessage = async () => {
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      const PROJECT_ID = "udutxbyzrdwucabxqvgg";
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/send-message?action=send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          phone: quickMessageTarget.phone,
          message: messageText.trim(),
          contact_id: quickMessageTarget.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar mensagem");

      toast({ title: "Mensagem enviada com sucesso!" });
      setMessageText("");
      setIsQuickMessageOpen(false);
      
      // Update status to replied automatically if it was new/read
      if (quickMessageTarget.status === "new" || quickMessageTarget.status === "read") {
        updateStatusMutation.mutate({ id: quickMessageTarget.id, status: "replied" });
      }
    } catch (err: any) {
      toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };


  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedId) {
      updateStatusMutation.mutate({ id: draggedId, status: targetStatus });
      setDraggedId(null);
    }
  };

  const contactsByStatus = (status: string) =>
    contacts?.filter((c: any) => c.status === status) || [];

  const paginatedContacts = useMemo(() => {
    if (!contacts) return [];
    const from = (tablePage - 1) * TABLE_PAGE_SIZE;
    return contacts.slice(from, from + TABLE_PAGE_SIZE);
  }, [contacts, tablePage]);

  const tableTotalPages = Math.ceil((contacts?.length || 0) / TABLE_PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Contatos / Leads</h1>
            <p className="text-muted-foreground">{contacts?.length || 0} contatos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">Kanban</span>
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4" /> <span className="hidden sm:inline">Tabela</span>
              </Button>
            </div>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !contacts?.length ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-display font-semibold">Nenhum contato</p>
            <Button variant="outline" className="mt-3 gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Adicionar primeiro contato
            </Button>
          </Card>
        ) : viewMode === "kanban" ? (
          /* ───── KANBAN VIEW ───── */
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4 min-w-max">
              {statusColumns.map((col) => {
                const items = contactsByStatus(col.key);
                return (
                  <div
                    key={col.key}
                    className="w-72 shrink-0 rounded-xl border border-border bg-muted/30 flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.key)}
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
                      <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      <span className="text-sm font-semibold">{col.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
                    </div>

                    {/* Column cards */}
                    <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                      {items.map((c: any) => (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          className="group cursor-grab active:cursor-grabbing rounded-lg border border-border bg-background p-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                              <span className="font-medium text-sm truncate">{c.name}</span>
                            </div>
                            <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={() => openQuickMessage(c)} title="Mensagem WhatsApp">
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(c)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(c.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {c.phone}
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> <span className="truncate">{c.email}</span>
                            </div>
                          )}
                          {c.properties?.title && (
                            <div className="mt-1.5">
                              <Badge variant="outline" className="text-[10px] font-normal truncate max-w-full">
                                {c.properties.title}
                              </Badge>
                            </div>
                          )}
                          {c.message && (
                            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{c.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContacts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.properties?.title || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "new" ? "default" : "secondary"}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "new" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: c.id, status: "read" })}>
                            Marcar Lido
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-primary" onClick={() => openQuickMessage(c)} title="Mensagem WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(c.id)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={tablePage}
            totalPages={tableTotalPages}
            total={contacts?.length || 0}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={setTablePage}
          />
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Contato" : "Adicionar Contato"}</DialogTitle>
            <DialogDescription className="sr-only">Formulário para gerenciar informações de contatos, incluindo nome, telefone, e-mail e categoria (cliente, proprietário ou parceiro).</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefone *</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mensagem</label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="read">Lido</SelectItem>
                  <SelectItem value="replied">Respondido</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Salvar Alterações" : "Adicionar Contato"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription className="sr-only">Confirme se deseja excluir permanentemente as informações deste contato.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Message Dialog */}
      <Dialog open={isQuickMessageOpen} onOpenChange={setIsQuickMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mensagem Rápida</DialogTitle>
            <DialogDescription>
              Enviando para <span className="font-bold text-foreground">{quickMessageTarget?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sua mensagem</label>
              <Textarea 
                value={messageText} 
                onChange={(e) => setMessageText(e.target.value)} 
                placeholder="Olá, gostaria de falar sobre o imóvel..."
                rows={4}
                className="resize-none"
              />
            </div>
            <Button 
              className="w-full gap-2 bg-[#003366] hover:bg-[#002244]" 
              onClick={handleSendQuickMessage}
              disabled={sendingMessage || !messageText.trim()}
            >
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Enviar via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminContacts;
