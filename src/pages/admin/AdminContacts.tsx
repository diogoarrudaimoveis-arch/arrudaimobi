import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader, PageCard } from "@/components/admin/shared/AdminComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, LayoutGrid, TableIcon, Phone, Mail, MessageCircle, AlertTriangle, RefreshCw, Shield, Star, Flame, Trash2, RotateCcw, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCrmLeads, filterLeads, CrmStage } from "@/hooks/use-crm-leads";
import { useContacts } from "@/hooks/use-contacts";
import { toast as sonnerToast } from "sonner";
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

const TABLE_PAGE_SIZE = 20;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://udutxbyzrdwucabxqvgg.supabase.co";

// =============================================================================
// Blocked actions — ZPRO source (no write/WhatsApp/delete until audit)
// =============================================================================

function blockedToast(toast: any, message: string) {
  toast({
    title: "Ação bloqueada",
    description: message,
    variant: "default",
    icon: <Shield className="h-4 w-4" />,
  });
}

function BlockedButton({ children, onClick, blocked, blockedReason, ...props }: any) {
  const { toast } = useToast();
  if (blocked) {
    return (
      <Button
        {...props}
        disabled
        onClick={() => blockedToast({ toast }, blockedReason)}
      >
        {children}
      </Button>
    );
  }
  return <Button {...props}>{children}</Button>;
}

// =============================================================================
// Lead card component
// =============================================================================

function LeadCard({ lead, onDragStart, onDragOver, onDrop, isDragging }: any) {
  const { toast } = useToast();
  const isZpro = lead.source === "zpro" || lead.origin === "zpro";

  const handleBlockedWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    blockedToast({ toast }, "Envio pelo CRM será liberado após validação da função segura.");
  };

  const handleBlockedDrag = (e: React.DragEvent) => {
    e.preventDefault();
    blockedToast({ toast }, "Movimentação de estágio será liberada após endpoint seguro de auditoria.");
  };

  const staleBadge = lead.stale_hours && lead.stale_hours > 24
    ? { label: `${Math.floor(lead.stale_hours / 24)}d stale`, variant: "destructive" as const }
    : null;

  return (
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? "opacity-50 rotate-2" : ""
      }`}
      draggable={!isZpro}
      onDragStart={isZpro ? undefined : onDragStart}
      onDragOver={isZpro ? undefined : onDragOver}
      onDrop={isZpro ? undefined : onDrop}
      onDragLeave={isZpro ? handleBlockedDrag : undefined}
    >
      <div className="space-y-2">
        {/* Header: name + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm truncate flex-1">
            {lead.name || "Sem nome"}
          </div>
          <div className="flex gap-1 shrink-0">
            {lead.is_vip && (
              <Badge variant="default" className="bg-amber-500 text-white text-xs gap-1">
                <Star className="h-3 w-3" /> VIP
              </Badge>
            )}
            {lead.is_hot && (
              <Badge variant="default" className="bg-red-500 text-white text-xs gap-1">
                <Flame className="h-3 w-3" /> HOT
              </Badge>
            )}
            {lead.phone_quality === "invalid" && (
              <Badge variant="destructive" className="text-xs">📵</Badge>
            )}
          </div>
        </div>

        {/* Phone + email */}
        <div className="space-y-0.5">
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{lead.phone}</span>
              {lead.phone_quality === "invalid" && (
                <span className="text-destructive text-[10px]">inválido</span>
              )}
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>

        {/* Last message */}
        {lead.last_message && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 line-clamp-2">
            {lead.last_message}
          </div>
        )}

        {/* Footer: channel + stale + actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {lead.channel && (
              <Badge variant="outline" className="text-xs">
                {lead.channel}
              </Badge>
            )}
            {staleBadge && (
              <Badge variant={staleBadge.variant} className="text-xs">
                {staleBadge.label}
              </Badge>
            )}
          </div>

          <div className="flex gap-1">
            {/* WhatsApp button — blocked for ZPRO */}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-primary"
              title={isZpro ? "Bloqueado: ZPRO" : "Mensagem WhatsApp"}
              onClick={isZpro ? handleBlockedWhatsApp : undefined}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Source badge */}
        {lead.source && (
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
            {lead.source}
          </div>
        )}
      </div>
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
  const { toast } = useToast();

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-muted/60 border border-b-0 border-border">
        <span className="text-base">{stage.emoji || "📋"}</span>
        <span className="font-semibold text-sm flex-1 truncate">{stage.name}</span>
        <Badge variant="secondary" className="text-xs shrink-0">
          {leads.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 border border-border rounded-b-lg bg-muted/20">
        <div className="p-2 space-y-2 min-h-[200px]">
          {leads.map((lead) => (
            <div
              key={lead.id}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                onDragStart(lead.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onDragOver(e);
              }}
              onDrop={(e) => {
                onDrop(e, stage.slug);
              }}
              className={draggedId === String(lead.id) ? "opacity-50 scale-95" : ""}
            >
              <LeadCard
                lead={lead}
                isDragging={draggedId === String(lead.id)}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDrop={() => {}}
              />
            </div>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Nenhum lead
            </div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Table row (CRM)
// =============================================================================

function LeadTableRow({ lead, isZpro }: { lead: any; isZpro: boolean }) {
  const { toast } = useToast();

  const handleBlockedWhatsApp = () => {
    blockedToast({ toast }, "Envio pelo CRM será liberado após validação da função segura.");
  };

  const handleBlockedDelete = () => {
    blockedToast({ toast }, "Exclusão de leads ZPRO será liberada após auditoria.");
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{lead.name || "—"}</TableCell>
      <TableCell className="text-sm">
        {lead.phone ? (
          <span className={lead.phone_quality === "invalid" ? "text-destructive line-through" : ""}>
            {lead.phone}
          </span>
        ) : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{lead.email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {lead.stage_name || lead.stage_slug}
        </Badge>
      </TableCell>
      <TableCell>
        {lead.channel && (
          <Badge variant="secondary" className="text-xs">{lead.channel}</Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {lead.last_message || "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString("pt-BR") : "—"}
      </TableCell>
      <TableCell>
        {lead.stale_hours && lead.stale_hours > 24 && (
          <Badge variant="destructive" className="text-xs">
            {Math.floor(lead.stale_hours / 24)}d
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {lead.is_vip && <Badge className="bg-amber-500 text-white text-xs">VIP</Badge>}
          {lead.is_hot && <Badge className="bg-red-500 text-white text-xs">HOT</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {lead.source || "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary"
            title={isZpro ? "Bloqueado (ZPRO)" : "WhatsApp"}
            onClick={isZpro ? handleBlockedWhatsApp : undefined}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            title={isZpro ? "Bloqueado (ZPRO)" : "Excluir"}
            onClick={isZpro ? handleBlockedDelete : undefined}
          >
            <span className="text-xs">🗑</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// Soft delete mutations
// =============================================================================

function useSoftDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      sonnerToast.success("Contato movido para a lixeira.");
    },
    onError: (err: Error) => {
      sonnerToast.error(`Erro ao excluir: ${err.message}`);
    },
  });
}

function useRestoreContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ deleted_at: null })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      sonnerToast.success("Contato restaurado.");
    },
    onError: (err: Error) => {
      sonnerToast.error(`Erro ao restaurar: ${err.message}`);
    },
  });
}

// =============================================================================
// useToast must be called inside a component — helper wrapper
// =============================================================================

function useToast() {
  // This hook is used by sub-components that need toast access
  // In this file we primarily use sonner toast directly
  return { toast: sonnerToast };
}

// =============================================================================
// Main component
// =============================================================================

const AdminContacts = () => {
  const { tenantId, isReady } = useAuth();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [tablePage, setTablePage] = useState(1);
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Tab state for soft delete views
  const [contactsTab, setContactsTab] = useState<"active" | "trash">("active");

  // Soft delete dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  const softDeleteMutation = useSoftDeleteContact();
  const restoreMutation = useRestoreContact();

  // CRM data
  const {
    stages,
    leads,
    leadsByStage,
    countsByStage,
    total,
    loading: crmLoading,
    isCrmAvailable,
    isFallbackMode,
    refetch,
  } = useCrmLeads();

  // Legacy contacts — active (non-deleted)
  const { data: activeContacts, isLoading: activeLoading } = useContacts();
  const activeCount = activeContacts?.length ?? 0;

  // Deleted contacts (trash)
  const { data: trashedContacts, isLoading: trashLoading } = useQuery({
    queryKey: ["contacts", "trash", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });
  const trashCount = trashedContacts?.length ?? 0;

  const useLegacy = isFallbackMode || (!isCrmAvailable && !!activeContacts?.length);

  // Filter leads for table/search
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, { search });
  }, [leads, search]);

  const paginatedLeads = useMemo(() => {
    const from = (tablePage - 1) * TABLE_PAGE_SIZE;
    return filteredLeads.slice(from, from + TABLE_PAGE_SIZE);
  }, [filteredLeads, tablePage]);

  const totalPages = Math.ceil(filteredLeads.length / TABLE_PAGE_SIZE);

  const handleDragStart = (id: number) => {
    setDraggedId(String(id));
  };

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

    // Block ZPRO leads
    if (lead.source === "zpro" || lead.origin === "zpro") {
      blockedToast({ toast }, "Lead ZPRO não pode ser movido via CRM. Atualize diretamente no ZPRO.");
      setDraggedId(null);
      setDragOverStage(null);
      return;
    }

    // Block if same stage
    if (lead.stage_slug === targetStage) {
      setDraggedId(null);
      setDragOverStage(null);
      return;
    }

    // Call Edge Function to update stage
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({ title: "Erro", description: "Sessão não encontrada. Faça login novamente.", variant: "destructive" });
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
          body: JSON.stringify({
            leadId: String(leadId),
            stageSlug: targetStage,
            reason: "kanban-drag-drop",
            actor: "admin",
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || json.error) {
        toast({ title: "Erro ao mover lead", description: json.error || "Falha ao atualizar estágio", variant: "destructive" });
      } else {
        toast({
          title: "Lead movido",
          description: `${lead.name || "Lead"} movido para ${targetStage}. Movimentação registrada em auditoria.`,
          variant: "default",
        });
        // Refetch CRM data
        refetch?.();
      }
    } catch (err: any) {
      toast({ title: "Erro de conexão", description: err.message, variant: "destructive" });
    }

    setDraggedId(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  const displayLeads = useLegacy ? [] : leads;
  const displayTotal = useLegacy ? (activeContacts?.length ?? 0) : total;

  // Handle soft delete confirmation
  const handleSoftDelete = (contactId: string) => {
    softDeleteMutation.mutate(contactId);
    setDeleteConfirmId(null);
  };

  // Handle restore confirmation
  const handleRestore = (contactId: string) => {
    restoreMutation.mutate(contactId);
    setRestoreConfirmId(null);
  };

  // Contacts table row for legacy/active contacts tab
  const ContactTableRow = ({ contact }: { contact: any }) => (
    <TableRow>
      <TableCell className="font-medium">{contact.name || "—"}</TableCell>
      <TableCell className="text-sm">{contact.phone || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{contact.email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {contact.status || "—"}
        </Badge>
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
        {contact.created_at ? new Date(contact.created_at).toLocaleDateString("pt-BR") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            title="Mover para lixeira"
            onClick={() => setDeleteConfirmId(contact.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  // Contacts table row for trash tab
  const TrashedContactRow = ({ contact }: { contact: any }) => (
    <TableRow>
      <TableCell className="font-medium">{contact.name || "—"}</TableCell>
      <TableCell className="text-sm">{contact.phone || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{contact.email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {contact.status || "—"}
        </Badge>
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
        {contact.deleted_at ? new Date(contact.deleted_at).toLocaleDateString("pt-BR") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-green-600"
            title="Restaurar contato"
            onClick={() => setRestoreConfirmId(contact.id)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Contatos / Leads"
          subtitle={`${displayTotal} leads${isFallbackMode ? " — Modo legado: CRM ZPRO indisponível" : ""}`}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetch();
                  toast({ title: "Sincronizando...", description: "Buscando dados do CRM ZPRO." });
                }}
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

        {/* CRM Summary Banner */}
        {!isFallbackMode && isCrmAvailable && (
          <Card className="bg-muted/30 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-primary">📊 CRM ZPRO</span>
                <Badge variant="default" className="bg-primary text-white">
                  {total} leads
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {stages.slice(0, 6).map((s) => (
                  <span key={s.slug} className="flex items-center gap-1">
                    {s.emoji} {s.name}: <strong>{countsByStage[s.slug] || 0}</strong>
                  </span>
                ))}
                {stages.length > 6 && <span>+{stages.length - 6} estágios</span>}
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Sync automático ainda não ativado. Última carga: <strong>{total} leads</strong>.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search (table mode) */}
        {viewMode === "table" && (
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome, telefone, email ou mensagem..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setTablePage(1); }}
              className="max-w-sm"
            />
          </div>
        )}

        {/* Loading state */}
        {(crmLoading && !useLegacy) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Carregando CRM ZPRO...</span>
          </div>
        )}

        {/* KANBAN VIEW */}
        {viewMode === "kanban" && !useLegacy && !crmLoading && (
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

        {/* TABLE VIEW — CRM leads + legacy contacts tabs */}
        {viewMode === "table" && !useLegacy && !crmLoading && (
          <>
            {/* Soft Delete Tabs — only shown when CRM is active */}
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

              {/* Active contacts tab */}
              <TabsContent value="active" className="mt-0">
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
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeContacts && activeContacts.length > 0 ? (
                        activeContacts.map((contact) => (
                          <ContactTableRow key={contact.id} contact={contact} />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                              <p className="text-muted-foreground">Nenhum contato ativo.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Trash tab */}
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
                          <TrashedContactRow key={contact.id} contact={contact} />
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

        {/* LEGACY MODE */}
        {useLegacy && (
          <div className="space-y-4">
            {/* Legacy contacts with soft delete tabs */}
            <Tabs value={contactsTab} onValueChange={(v) => setContactsTab(v as "active" | "trash")}>
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

              <TabsContent value="active" className="mt-0">
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
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeContacts && activeContacts.length > 0 ? (
                        activeContacts.map((contact) => (
                          <ContactTableRow key={contact.id} contact={contact} />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                              <p className="text-muted-foreground">
                                Nenhum contato legados disponível.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

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
                          <TrashedContactRow key={contact.id} contact={contact} />
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

            {/* Legacy mode notice */}
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  <strong>Modo Legado Ativo:</strong> CRM ZPRO indisponível. Exibindo {activeContacts?.length ?? 0} contatos legados via tabela direta.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Soft Delete Dialogs */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar contato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja arquivar este contato? Ele será movido para a lixeira e poderá ser restaurado a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deleteConfirmId) handleSoftDelete(deleteConfirmId); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {softDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!restoreConfirmId} onOpenChange={() => setRestoreConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar contato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja restaurar este contato? Ele voltará para a lista de contatos ativos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (restoreConfirmId) handleRestore(restoreConfirmId); }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Restaurar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminPageShell>
    </AdminLayout>
  );
};

export default AdminContacts;