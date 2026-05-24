import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, LayoutGrid, TableIcon, RefreshCw, Trash2, RotateCcw, MessageSquare, Phone, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { useCrmLeads, filterLeads, CrmStage } from "@/hooks/use-crm-leads";
import { useContacts } from "@/hooks/use-contacts";
import { toast as sonnerToast } from "sonner";

const TABLE_PAGE_SIZE = 20;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://udutxbyzrdwucabxqvgg.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkdXR4Ynl6cmR3dWNhYnhxdmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODQ4NjUsImV4cCI6MjA5MTM2MDg2NX0.UjjlVpTn7mCbCQg3tlvK3Sn-ZsNCDNoX28woozbZA2A";

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
      sonnerToast.success("Lead movido para lixeira");
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
// Lead card for Kanban
// =============================================================================

function LeadCard({ lead }: { lead: any }) {
  const isZpro = lead.source === "zpro" || lead.origin === "zpro";

  return (
    <Card className="p-3 cursor-grab hover:shadow-md transition-shadow text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{lead.name || lead.phone || "—"}</p>
          {lead.phone && (
            <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {lead.phone}
            </p>
          )}
          {lead.last_message && (
            <p className="text-muted-foreground mt-1 line-clamp-2">{lead.last_message}</p>
          )}
        </div>
        {isZpro && (
          <Badge variant="secondary" className="text-[10px] shrink-0">ZPRO</Badge>
        )}
      </div>
      {lead.last_interaction && (
        <p className="text-muted-foreground/60 text-[10px] mt-2">
          {new Date(lead.last_interaction).toLocaleDateString("pt-BR")}
        </p>
      )}
    </Card>
  );
}

// =============================================================================
// Kanban column
// =============================================================================

function KanbanColumn({
  stage,
  leads,
  onDragStart,
  onDragOver,
  onDrop,
  draggedId,
}: {
  stage: CrmStage;
  leads: any[];
  onDragStart: (id: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageSlug: string) => void;
  draggedId: string | null;
}) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-muted/60 border border-b-0 border-border">
        <span className="text-base">{stage.emoji || "📋"}</span>
        <span className="font-semibold text-sm flex-1 truncate">{stage.name}</span>
        <Badge variant="secondary" className="text-xs shrink-0">{leads.length}</Badge>
      </div>
      <ScrollArea className="flex-1 border border-border rounded-b-lg bg-muted/20">
        <div className="p-2 space-y-2 min-h-[200px]">
          {leads.map((lead) => (
            <div
              key={lead.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                onDragStart(lead.id);
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(e); }}
              onDrop={(e) => onDrop(e, stage.slug)}
              className={draggedId === String(lead.id) ? "opacity-50 scale-95" : ""}
            >
              <LeadCard lead={lead} />
            </div>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">Nenhum lead</div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Contact table row (legacy contacts)
// =============================================================================

function ContactTableRow({ contact, onDelete, onRestore }: {
  contact: any;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{contact.name || "—"}</TableCell>
      <TableCell className="text-sm">{contact.phone || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{contact.email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">{contact.status || "—"}</Badge>
      </TableCell>
      <TableCell>
        {contact.is_external_lead ? (
          <Badge variant="secondary" className="text-xs">Externo</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">Orgânico</Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {contact.message || "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {contact.deleted_at
          ? new Date(contact.deleted_at).toLocaleDateString("pt-BR")
          : contact.created_at
            ? new Date(contact.created_at).toLocaleDateString("pt-BR")
            : "—"}
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
// Lead table row (CRM leads)
// =============================================================================

function LeadTableRow({ lead, onDelete }: { lead: any; onDelete: (id: number) => void }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{lead.name || "—"}</TableCell>
      <TableCell className="text-sm">
        {lead.phone ? <span className={lead.phone_quality === "invalid" ? "text-destructive line-through" : ""}>{lead.phone}</span> : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{lead.email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">{lead.stage_name || lead.stage_slug || "—"}</Badge>
      </TableCell>
      <TableCell>
        {lead.channel && <Badge variant="secondary" className="text-xs">{lead.channel}</Badge>}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {lead.last_message || "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString("pt-BR") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            title="Mover para lixeira"
            onClick={() => onDelete(lead.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
  const { toast } = useToast();

  // View mode
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [tablePage, setTablePage] = useState(1);
  const [search, setSearch] = useState("");

  // Legacy contacts tab
  const [contactsTab, setContactsTab] = useState<"active" | "trash">("active");

  // Dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  const softDeleteMutation = useSoftDeleteContact(tenantId);
  const restoreMutation = useRestoreContact(tenantId);

  // CRM data
  const {
    stages,
    leads,
    leadsByStage,
    countsByStage,
    total,
    loading: crmLoading,
    isCrmAvailable,
    refetch,
  } = useCrmLeads();

  // Legacy contacts
  const { data: activeContacts } = useContacts();
  const activeCount = activeContacts?.length ?? 0;

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

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Search / pagination for leads
  const filteredLeads = useMemo(() => filterLeads(leads, { search }), [leads, search]);
  const paginatedLeads = useMemo(() => {
    const from = (tablePage - 1) * TABLE_PAGE_SIZE;
    return filteredLeads.slice(from, from + TABLE_PAGE_SIZE);
  }, [filteredLeads, tablePage]);
  const totalPages = Math.ceil(filteredLeads.length / TABLE_PAGE_SIZE);

  const handleDragStart = (id: number) => setDraggedId(String(id));
  const handleDragOver = (e: React.DragEvent, stageSlug: string) => {
    e.preventDefault();
    setDragOverStage(stageSlug);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedId) return;

    const leadId = draggedId;
    const lead = leads.find((l) => String(l.id) === leadId);
    if (!lead) return;

    if (lead.source === "zpro" || lead.origin === "zpro") {
      sonnerToast({ title: "Bloqueado", description: "Lead ZPRO não pode ser movido pelo CRM.", variant: "default" });
      setDraggedId(null); setDragOverStage(null);
      return;
    }
    if (lead.stage_slug === targetStage) {
      setDraggedId(null); setDragOverStage(null);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        sonnerToast({ title: "Erro", description: "Sessão não encontrada." });
        return;
      }
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-api?action=crm-update-lead-stage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ leadId: String(leadId), stageSlug: targetStage, reason: "kanban-drag-drop", actor: "admin" }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        sonnerToast({ title: "Erro ao mover lead", description: json.error || "Falha", variant: "destructive" });
      } else {
        sonnerToast({ title: "Lead movido", description: `${lead.name || "Lead"} → ${targetStage}` });
        refetch?.();
      }
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setDraggedId(null); setDragOverStage(null);
  };

  // Soft delete handlers
  const handleSoftDelete = (id: number | string) => {
    softDeleteMutation.mutate(String(id));
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
          title="Contatos / Leads"
          subtitle={`${total} leads${!isCrmAvailable ? " — CRM indisponível (modo legado)" : ""}`}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { refetch?.(); sonnerToast({ title: "Sincronizando ZPRO..." }); }}
                disabled={crmLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${crmLoading ? "animate-spin" : ""}`} />
                Atualizar ZPRO
              </Button>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none gap-1.5"
                  onClick={() => setViewMode("kanban")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none gap-1.5"
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Tabela</span>
                </Button>
              </div>
            </div>
          }
        />

        {/* CRM Summary */}
        {isCrmAvailable && (
          <Card className="bg-muted/30 border-primary/20 mb-4">
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-primary">📊 CRM ZPRO</span>
                <Badge variant="default" className="bg-primary text-white">{total} leads</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {stages.slice(0, 6).map((s) => (
                  <span key={s.slug} className="flex items-center gap-1">
                    {s.emoji} {s.name}: <strong>{countsByStage[s.slug] || 0}</strong>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search (table mode) */}
        {viewMode === "table" && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Buscar por nome, telefone, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setTablePage(1); }}
              className="max-w-sm"
            />
          </div>
        )}

        {/* Loading */}
        {crmLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Carregando CRM ZPRO...</span>
          </div>
        )}

        {/* KANBAN VIEW */}
        {!crmLoading && viewMode === "kanban" && (
          <ScrollArea className="w-full overflow-x-auto">
            <div className="flex gap-3 pb-4" style={{ minWidth: "max-content" }}>
              {stages.map((stage) => (
                <KanbanColumn
                  key={stage.slug}
                  stage={stage}
                  leads={leadsByStage[stage.slug] || []}
                  onDragStart={handleDragStart}
                  onDragOver={(e) => handleDragOver(e, stage.slug)}
                  onDrop={handleDrop}
                  draggedId={draggedId}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* TABLE VIEW — CRM leads + legacy tabs */}
        {!crmLoading && viewMode === "table" && (
          <>
            {/* Tabs — Lixeira sempre visível */}
            <Tabs value={contactsTab} onValueChange={(v) => setContactsTab(v as "active" | "trash")} className="mb-4">
              <TabsList>
                <TabsTrigger value="active" className="gap-1.5">
                  Ativos
                  <Badge variant="secondary" className="text-xs ml-1">{activeCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="trash" className="gap-1.5">
                  Lixeira
                  <Badge variant="outline" className="text-xs ml-1">{trashCount}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* CRM Leads — Active Tab */}
              <TabsContent value="active" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">CRM ZPRO — {total} leads</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Etapa</TableHead>
                            <TableHead>Canal</TableHead>
                            <TableHead>Última Mensagem</TableHead>
                            <TableHead>Última Interação</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLeads.length > 0 ? (
                            filteredLeads.map((lead) => (
                              <LeadTableRow
                                key={lead.id}
                                lead={lead}
                                onDelete={(id) => setDeleteConfirmId(id)}
                              />
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                  <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                                  <p className="text-muted-foreground">Nenhum lead no CRM.</p>
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
                          Página {tablePage} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={tablePage <= 1} onClick={() => setTablePage(p => p - 1)}>Anterior</Button>
                          <Button size="sm" variant="outline" disabled={tablePage >= totalPages} onClick={() => setTablePage(p => p + 1)}>Próxima</Button>
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
                        <TableHead>Excluído em</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
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
          </>
        )}
      </AdminPageShell>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar este lead? Ele aparecerá na aba Lixeira e poderá ser restaurado.
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