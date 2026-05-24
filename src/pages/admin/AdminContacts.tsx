import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, TableIcon, Trash2, RotateCcw, MessageSquare, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useContacts, useCreateContact } from "@/hooks/use-contacts";
import { toast as sonnerToast } from "sonner";

const TABLE_PAGE_SIZE = 20;

// =============================================================================
// Soft delete / restore mutations
// =============================================================================

function useSoftDeleteContact(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ deleted_at: new Date().toISOString(), status: "archived" })
        .eq("id", contactId)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      sonnerToast.success("Contato movido para lixeira");
    },
    onError: (err: any) => {
      sonnerToast.error(`Erro: ${err.message}`);
    },
  });
}

function useRestoreContact(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ deleted_at: null, status: "read" })
        .eq("id", contactId)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      sonnerToast.success("Contato restaurado");
    },
    onError: (err: any) => {
      sonnerToast.error(`Erro: ${err.message}`);
    },
  });
}

// =============================================================================
// Contact table row
// =============================================================================

function ContactTableRow({ contact, onDelete, onRestore }: {
  contact: any;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{contact.name || "â€”"}</TableCell>
      <TableCell className="text-sm">{contact.phone || "â€”"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{contact.email || "â€”"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">{contact.status || "â€”"}</Badge>
      </TableCell>
      <TableCell>
        {contact.is_external_lead ? (
          <Badge variant="secondary" className="text-xs">Externo</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">OrgÃ¢nico</Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {contact.message || "â€”"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {contact.deleted_at
          ? new Date(contact.deleted_at).toLocaleDateString("pt-BR")
          : contact.created_at
            ? new Date(contact.created_at).toLocaleDateString("pt-BR")
            : "â€”"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              title="Mover para lixeira"
              onClick={() => onDelete(contact.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRestore && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-600"
              title="Restaurar"
              onClick={() => onRestore(contact.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// Main component
// =============================================================================

export default function AdminContacts() {
  const { tenantId, isReady } = useAuth();

  // Table pagination
  const [tablePage, setTablePage] = useState(1);
  const [search, setSearch] = useState("");

  // Contacts tab (manuais = manual contacts, trash = lixeira)
  const [contactsTab, setContactsTab] = useState<"manuais" | "trash">("manuais");

  // Dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Create contact form state
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateContact();

  const validateCreate = () => {
    const e: Record<string, string> = {};
    if (!createName.trim() || createName.trim().length < 2) e.name = "Nome e obrigatorio (minimo 2 caracteres)";
    if (!createEmail.trim() && !createPhone.trim()) e.contact = "Informe email ou telefone";
    if (createEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail)) e.email = "Email invalido";
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    try {
      await createMutation.mutateAsync({
        name: createName.trim(),
        email: createEmail.trim() || null,
        phone: createPhone.trim() || null,
        message: createMessage.trim() || null,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreateMessage("");
      setCreateErrors({});
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const softDeleteMutation = useSoftDeleteContact(tenantId);
  const restoreMutation = useRestoreContact(tenantId);

  // Manual contacts (from contacts table, not is_external_lead)
  const { data: allContacts } = useContacts();
  const manualContacts = useMemo(() =>
    (allContacts || []).filter(c => !c.is_external_lead),
    [allContacts]
  );
  const activeCount = manualContacts.length;

  // Filter by search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return manualContacts;
    const q = search.toLowerCase();
    return manualContacts.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [manualContacts, search]);

  const paginatedContacts = useMemo(() => {
    const from = (tablePage - 1) * TABLE_PAGE_SIZE;
    return filteredContacts.slice(from, from + TABLE_PAGE_SIZE);
  }, [filteredContacts, tablePage]);
  const totalPages = Math.ceil(filteredContacts.length / TABLE_PAGE_SIZE);

  // Trashed contacts
  const { data: trashedContacts } = useQuery({
    queryKey: ["contacts", "trash", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isReady && !!tenantId,
  });
  const trashCount = trashedContacts?.length ?? 0;

  // Soft delete handlers
  const handleSoftDelete = (id: string) => {
    softDeleteMutation.mutate(id);
    setDeleteConfirmId(null);
  };

  const handleRestore = (id: string) => {
    restoreMutation.mutate(id);
    setRestoreConfirmId(null);
  };

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Contatos"
          subtitle={`${activeCount} cadastrados manualmente`}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Novo Contato
              </Button>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button variant="default" size="sm" className="rounded-none gap-1.5">
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Tabela</span>
                </Button>
              </div>
            </div>
          }
        />

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Buscar por nome, telefone, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setTablePage(1); }}
            className="max-w-sm"
          />
        </div>

        {/* Tabs */}
        <Tabs value={contactsTab} onValueChange={(v) => setContactsTab(v as "manuais" | "trash")} className="mb-4">
          <TabsList>
            <TabsTrigger value="manuais" className="gap-1.5">
              <span className="hidden sm:inline">Cadastrados Manualmente</span>
              <span className="sm:hidden">Manuais</span>
              <Badge variant="secondary" className="text-xs ml-1">{activeCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-1.5">
              Lixeira
              <Badge variant="outline" className="text-xs ml-1">{trashCount}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Manual Contacts Tab */}
          <TabsContent value="manuais" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cadastrados Manualmente â€” {activeCount} contatos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="w-[80px]">AÃ§Ãµes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedContacts.length > 0 ? (
                        paginatedContacts.map((contact) => (
                          <ContactTableRow
                            key={contact.id}
                            contact={contact}
                            onDelete={(id) => setDeleteConfirmId(id)}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                              <p className="text-muted-foreground">
                                {search ? "Nenhum contato encontrado." : "Nenhum contato cadastrado manualmente."}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">
                      PÃ¡gina {tablePage} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={tablePage <= 1} onClick={() => setTablePage(p => p - 1)}>Anterior</Button>
                      <Button size="sm" variant="outline" disabled={tablePage >= totalPages} onClick={() => setTablePage(p => p + 1)}>PrÃ³xima</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash" className="mt-0">
            <div className="border border-destructive/30 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>ExcluÃ­do em</TableHead>
                    <TableHead className="w-[80px]">AÃ§Ãµes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashedContacts && trashedContacts.length > 0 ? (
                    trashedContacts.map((contact) => (
                      <ContactTableRow
                        key={contact.id}
                        contact={contact}
                        onRestore={(id) => setRestoreConfirmId(id)}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <Trash2 className="h-10 w-10 text-muted-foreground/30" />
                          <p className="text-muted-foreground">Lixeira vazia.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </AdminPageShell>

      {/* Create Contact Dialog */}
      <AlertDialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateErrors({}); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Novo Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Cadastre um novo lead manualmente no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input placeholder="Nome completo" value={createName} onChange={(e) => setCreateName(e.target.value)} />
              {createErrors.name && <p className="text-xs text-destructive mt-1">{createErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Telefone</label>
                <Input placeholder="(11) 99999-0000" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input placeholder="email@exemplo.com" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
                {createErrors.email && <p className="text-xs text-destructive mt-1">{createErrors.email}</p>}
              </div>
            </div>
            {createErrors.contact && <p className="text-xs text-destructive">{createErrors.contact}</p>}
            <div>
              <label className="text-sm font-medium mb-1 block">Mensagem</label>
              <Textarea placeholder="Observacoes sobre o contato..." value={createMessage} onChange={(e) => setCreateMessage(e.target.value)} className="min-h-[80px]" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCreateOpen(false); setCreateErrors({}); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cadastrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar este contato? Ele aparecerÃ¡ na aba Lixeira e poderÃ¡ ser restaurado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId !== null) handleSoftDelete(deleteConfirmId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {softDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirmation dialog */}
      <AlertDialog open={restoreConfirmId !== null} onOpenChange={() => setRestoreConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar contato</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja restaurar este contato da lixeira?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRestoreConfirmId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRestore(restoreConfirmId!)}>
              {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
