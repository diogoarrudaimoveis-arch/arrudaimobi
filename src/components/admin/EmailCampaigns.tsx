import { useState, useEffect, useCallback } from "react";
import RichEmailEditor, { type PropertyForTemplate } from "@/components/admin/RichEmailEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, Loader2, Users, Mail, CheckCircle2, XCircle, Clock,
  FileCode, ChevronDown, ChevronUp, Search, Trash2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Contact {
  id: string;
  name: string;
  email: string | null;
}

interface Campaign {
  id: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface CampaignRecipient {
  id: string;
  email: string;
  name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

const DEFAULT_CAMPAIGN_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Olá, {{nome_cliente}}!</h2>
  <p>Temos uma mensagem especial para você.</p>
  <p>Insira seu conteúdo aqui.</p>
  <p style="color: #6b7280; font-size: 12px;">E-mail enviado para {{email_cliente}}</p>
</body>
</html>`;

export default function EmailCampaigns() {
  const { toast } = useToast();
  const { session } = useAuth();

  // Compose
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(DEFAULT_CAMPAIGN_HTML);
  const [editorMode, setEditorMode] = useState<"visual" | "html" | "preview">("visual");

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Sending
  const [sending, setSending] = useState(false);

  // Properties for template
  const [properties, setProperties] = useState<PropertyForTemplate[]>([]);

  // History
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    if (session) {
      loadContacts();
      loadHistory();
      loadProperties();
    }
  }, [session]);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", session!.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email")
        .eq("tenant_id", profile.tenant_id)
        .not("email", "is", null)
        .order("name");

      if (error) throw error;
      setContacts(data || []);
    } catch {
      toast({ title: "Erro ao carregar contatos", variant: "destructive" });
    } finally {
      setLoadingContacts(false);
    }
  }

  async function loadProperties() {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", session!.user.id)
        .single();
      if (!profile) return;

      const { data: props } = await supabase
        .from("properties")
        .select("id, title, price, address, city, state, neighborhood, bedrooms, bathrooms, area, garages, purpose, currency")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!props) return;

      const ids = props.map(p => p.id);
      const { data: images } = await supabase
        .from("property_images")
        .select("property_id, url, display_order")
        .in("property_id", ids)
        .order("display_order", { ascending: true });

      const imageMap = new Map<string, { url: string }[]>();
      (images || []).forEach((img) => {
        if (!imageMap.has(img.property_id)) imageMap.set(img.property_id, []);
        imageMap.get(img.property_id)!.push({ url: img.url });
      });

      setProperties(
        props.map((p) => ({
          ...p,
          images: imageMap.get(p.id) || [],
        }))
      );
    } catch {
      // silent
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { action: "history" },
      });
      if (error) throw error;
      setCampaigns(data || []);
    } catch {
      // Silently fail history load
    } finally {
      setLoadingHistory(false);
    }
  }

  const [clearingHistory, setClearingHistory] = useState(false);

  async function handleClearHistory() {
    setClearingHistory(true);
    try {
      const { error } = await supabase.functions.invoke("send-campaign-email", {
        body: { action: "clear_history" },
      });
      if (error) throw error;
      setCampaigns([]);
      setExpandedCampaign(null);
      toast({ title: "Histórico limpo com sucesso!" });
    } catch {
      toast({ title: "Erro ao limpar histórico", variant: "destructive" });
    } finally {
      setClearingHistory(false);
    }
  }

  async function loadRecipients(campaignId: string) {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }
    setExpandedCampaign(campaignId);
    setLoadingRecipients(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { action: "recipients", campaign_id: campaignId },
      });
      if (error) throw error;
      setRecipients(data || []);
    } catch {
      toast({ title: "Erro ao carregar destinatários", variant: "destructive" });
    } finally {
      setLoadingRecipients(false);
    }
  }

  function toggleAll() {
    const filtered = filteredContacts;
    if (filtered.every(c => selectedIds.has(c.id))) {
      const newSet = new Set(selectedIds);
      filtered.forEach(c => newSet.delete(c.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filtered.forEach(c => newSet.add(c.id));
      setSelectedIds(newSet);
    }
  }

  function toggleContact(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  const filteredContacts = contacts.filter(c => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  async function handleSend() {
    if (!subject.trim()) {
      toast({ title: "Preencha o assunto do e-mail", variant: "destructive" });
      return;
    }
    if (!htmlBody.trim()) {
      toast({ title: "Preencha o corpo do e-mail", variant: "destructive" });
      return;
    }
    if (selectedIds.size === 0) {
      toast({ title: "Selecione ao menos um contato", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: {
          action: "send",
          subject: subject.trim(),
          html_body: htmlBody,
          contact_ids: Array.from(selectedIds),
        },
      });

      if (error) throw error;

      const result = data as { message?: string; sent?: number; failed?: number };
      toast({
        title: result?.message || "Envio concluído!",
        variant: (result?.failed ?? 0) > 0 ? "destructive" : "default",
      });

      // Reset form
      setSubject("");
      setHtmlBody(DEFAULT_CAMPAIGN_HTML);
      setSelectedIds(new Set());
      loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function getPreviewHtml() {
    return htmlBody
      .replace(/\{\{nome_cliente\}\}/g, "João Silva")
      .replace(/\{\{email_cliente\}\}/g, "joao@email.com");
  }

  function statusBadge(status: string) {
    switch (status) {
      case "sent": return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Enviado</Badge>;
      case "failed": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "sending": return <Badge className="bg-warning/10 text-warning border-warning/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Enviando</Badge>;
      case "pending": return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Compor E-mail
          </CardTitle>
          <CardDescription>
            Envie e-mails para seus contatos. Use o botão <strong>Variáveis</strong> para inserir dados dinâmicos e <strong>Imóveis</strong> para inserir cards de imóveis cadastrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-subject">Assunto *</Label>
            <Input
              id="campaign-subject"
              placeholder="Assunto do e-mail"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Corpo do E-mail</Label>
              <div className="flex gap-1">
                <Button
                  variant={editorMode === "visual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("visual")}
                  className="gap-1.5 text-xs h-7"
                >
                  Editor Visual
                </Button>
                <Button
                  variant={editorMode === "html" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("html")}
                  className="gap-1.5 text-xs h-7"
                >
                  <FileCode className="h-3 w-3" />
                  HTML
                </Button>
                <Button
                  variant={editorMode === "preview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("preview")}
                  className="gap-1.5 text-xs h-7"
                >
                  Pré-visualizar
                </Button>
              </div>
            </div>

            {editorMode === "visual" && (
              <RichEmailEditor
                content={htmlBody}
                onChange={(html) => setHtmlBody(html)}
                properties={properties}
              />
            )}

            {editorMode === "html" && (
              <Textarea
                className="min-h-[250px] font-mono text-xs"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            )}

            {editorMode === "preview" && (
              <div className="min-h-[250px] rounded-md border bg-background p-4 overflow-auto">
                <iframe
                  srcDoc={getPreviewHtml()}
                  className="w-full min-h-[230px] border-0"
                  title="Preview do e-mail"
                  sandbox=""
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Destinatários
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-2">{selectedIds.size} selecionado(s)</Badge>
            )}
          </CardTitle>
          <CardDescription>Selecione os contatos que receberão o e-mail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contatos..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.has(c.id))
                ? "Desmarcar Todos"
                : "Selecionar Todos"}
            </Button>
          </div>

          {loadingContacts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {contacts.length === 0 ? "Nenhum contato com e-mail cadastrado." : "Nenhum contato encontrado."}
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto rounded-md border divide-y">
              {filteredContacts.map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleContact(contact.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || selectedIds.size === 0 || !subject.trim()}
            className="w-full gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Enviando..." : `Enviar para ${selectedIds.size} contato(s)`}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Envios
          </CardTitle>
          {campaigns.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar Histórico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar histórico de envios?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso removerá permanentemente todas as campanhas e registros de destinatários. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} disabled={clearingHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {clearingHistory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Limpar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum envio realizado.</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-md border">
                  <button
                    onClick={() => loadRecipients(campaign.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(campaign.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {" · "}
                        {campaign.sent_count}/{campaign.total_recipients} enviados
                        {campaign.failed_count > 0 && ` · ${campaign.failed_count} falhas`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {statusBadge(campaign.status)}
                      {expandedCampaign === campaign.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </button>

                  {expandedCampaign === campaign.id && (
                    <div className="border-t px-4 py-3 bg-muted/30">
                      {loadingRecipients ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : recipients.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Sem destinatários.</p>
                      ) : (
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {recipients.map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-sm py-1.5">
                              <div className="min-w-0 flex-1">
                                <span className="font-medium">{r.name || "—"}</span>
                                <span className="text-muted-foreground ml-2">{r.email}</span>
                              </div>
                              <div className="ml-2 flex items-center gap-2">
                                {statusBadge(r.status)}
                                {r.error_message && (
                                  <span className="text-xs text-destructive max-w-[200px] truncate" title={r.error_message}>
                                    {r.error_message}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
