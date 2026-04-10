import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Settings2, Loader2, MessageSquareText, Phone, CheckCircle2,
  XCircle, Clock, RefreshCw, Wifi, WifiOff, Users, FileText, Save, Trash2
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

const HISTORY_PAGE_SIZE = 20;
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

const AdminMessages = () => {
  const { tenantId, user, isReady, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Config state
  const [configForm, setConfigForm] = useState({ api_key: "", base_url: "", instance_name: "" });
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);

  // Send state
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [sendPhone, setSendPhone] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  // Fetch config
  const { data: evolutionConfig, isLoading: configLoading } = useQuery({
    queryKey: ["evolution-config", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evolution_config")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  // Fetch contacts
  const { data: contacts } = useQuery({
    queryKey: ["contacts-for-messages", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, email")
        .eq("tenant_id", tenantId!)
        .not("phone", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  // Fetch messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages-log", tenantId, historyPage],
    queryFn: async () => {
      const from = (historyPage - 1) * HISTORY_PAGE_SIZE;
      const to = from + HISTORY_PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("messages")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: isReady && !!tenantId,
  });

  const messages = messagesData?.data || [];
  const totalMessages = messagesData?.total || 0;
  const historyTotalPages = Math.ceil(totalMessages / HISTORY_PAGE_SIZE);

  // Fetch tenant for template
  const { data: tenant } = useQuery({
    queryKey: ["admin-tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  // Load template from tenant settings
  if (tenant && !templateLoaded) {
    const s = (tenant.settings as TenantSettings) || {};
    setWhatsappTemplate(s.whatsapp_template || "");
    setTemplateLoaded(true);
  }

  // Save template
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const currentSettings = (tenant?.settings as TenantSettings) || {};
      const settings = { ...currentSettings, whatsapp_template: whatsappTemplate.trim() };
      const { error } = await supabase
        .from("tenants")
        .update({ settings: settings as any })
        .eq("id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Template salvo!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Save config
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId!,
        api_key: configForm.api_key,
        base_url: configForm.base_url.replace(/\/+$/, ""),
        instance_name: configForm.instance_name || null,
      };

      if (evolutionConfig?.id) {
        const { error } = await supabase
          .from("evolution_config")
          .update(payload)
          .eq("id", evolutionConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("evolution_config")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-config"] });
      toast({ title: "Configuração salva!" });
      setConfigDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // List instances
  const handleListInstances = async () => {
    setLoadingInstances(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: null,
        headers: { "Content-Type": "application/json" },
      });

      // Use URL params approach
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-message?action=list-instances`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao listar instâncias");
      }

      const result = await res.json();
      setInstances(Array.isArray(result) ? result : []);
      toast({ title: `${Array.isArray(result) ? result.length : 0} instância(s) encontrada(s)` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingInstances(false);
    }
  };

  // Send message
  const sendMutation = useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-message?action=send-message`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
           body: JSON.stringify({
            phone: sendPhone,
            message: sendMessage,
            contact_id: selectedContactId && selectedContactId !== "__manual__" ? selectedContactId : undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok && res.status !== 502) throw new Error(data.error || "Erro ao enviar");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages-log"] });
      if (data.status === "sent") {
        toast({ title: "Mensagem enviada!", description: `Para: ${data.phone_sanitized}` });
        setSendPhone("");
        setSendMessage("");
        setSelectedContactId("");
      } else {
        toast({ title: "Falha no envio", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const openConfig = () => {
    setConfigForm({
      api_key: evolutionConfig?.api_key || "",
      base_url: evolutionConfig?.base_url || "",
      instance_name: evolutionConfig?.instance_name || "",
    });
    setInstances([]);
    setConfigDialogOpen(true);
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-message?action=clear-history`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao limpar histórico");
      queryClient.invalidateQueries({ queryKey: ["messages-log"] });
      toast({ title: "Histórico limpo com sucesso!" });
    } catch (err: any) {
      toast({ title: err.message || "Erro ao limpar histórico", variant: "destructive" });
    } finally {
      setClearingHistory(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3" /> Enviada</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {status}</Badge>;
    }
  };

  const isConfigured = !!evolutionConfig?.api_key && !!evolutionConfig?.base_url && !!evolutionConfig?.instance_name;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Mensagens</h1>
            <p className="text-muted-foreground">Envie mensagens via WhatsApp</p>
          </div>
          {isAdmin && (
            <Button variant="outline" className="gap-2" onClick={openConfig}>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Configurar</span> API
            </Button>
          )}
        </div>

        {/* Status banner */}
        <Card className={`flex items-center gap-3 p-4 ${isConfigured ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
          {isConfigured ? (
            <>
              <Wifi className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Evolution API conectada</p>
                <p className="text-xs text-muted-foreground">Instância: {evolutionConfig?.instance_name}</p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">API não configurada</p>
                <p className="text-xs text-muted-foreground">Configure a API Key, URL e instância para começar a enviar</p>
              </div>
            </>
          )}
        </Card>

        <Tabs defaultValue="send">
          <TabsList>
            <TabsTrigger value="send" className="gap-2"><Send className="h-4 w-4" /> Enviar</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><MessageSquareText className="h-4 w-4" /> Histórico</TabsTrigger>
            <TabsTrigger value="template" className="gap-2"><FileText className="h-4 w-4" /> Template</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-4">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Enviar Mensagem</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    <Users className="inline h-4 w-4 mr-1" />
                    Selecionar Contato
                  </label>
                  <Select
                    value={selectedContactId}
                    onValueChange={(v) => {
                      setSelectedContactId(v);
                      if (v === "__manual__") {
                        setSendPhone("");
                      } else {
                        const contact = contacts?.find((c) => c.id === v);
                        if (contact?.phone) {
                          setSendPhone(contact.phone);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contato ou digite manualmente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">✏️ Digitar número manualmente</SelectItem>
                      {contacts?.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} — {contact.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Telefone *</label>
                  <Input
                    placeholder="(11) 99999-1234 ou 5511999991234"
                    value={sendPhone}
                    onChange={(e) => setSendPhone(e.target.value)}
                    required
                    readOnly={!!selectedContactId && selectedContactId !== "__manual__"}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    O número será sanitizado automaticamente (DDI +55 adicionado se necessário)
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Mensagem *</label>
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={sendMutation.isPending || !isConfigured}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Mensagem
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            {messages && messages.length > 0 && (
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar Histórico
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar histórico de mensagens?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso removerá permanentemente todas as mensagens enviadas. Esta ação não pode ser desfeita.
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
              </div>
            )}
            {messagesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !messages?.length ? (
              <Card className="flex flex-col items-center py-12 text-center">
                <MessageSquareText className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-display font-semibold">Nenhuma mensagem enviada</p>
                <p className="text-sm text-muted-foreground">As mensagens aparecerão aqui após o primeiro envio</p>
              </Card>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg: any) => (
                        <TableRow key={msg.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono text-sm">{msg.phone_sanitized}</span>
                            </div>
                            {msg.phone_raw && msg.phone_raw !== msg.phone_sanitized && (
                              <span className="text-xs text-muted-foreground">Original: {msg.phone_raw}</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{msg.message}</TableCell>
                          <TableCell>
                            {statusBadge(msg.status)}
                            {msg.error_message && (
                              <p className="mt-1 text-xs text-destructive">{msg.error_message}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(msg.created_at).toLocaleString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={historyPage}
                  totalPages={historyTotalPages}
                  total={totalMessages}
                  pageSize={HISTORY_PAGE_SIZE}
                  onPageChange={setHistoryPage}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Template WhatsApp Automático</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Personalize a mensagem enviada automaticamente quando um lead solicita contato pelo site.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs space-y-1">
                <p className="font-medium text-sm mb-2">Variáveis disponíveis:</p>
                <p><code className="bg-background px-1 py-0.5 rounded font-mono">{"{{nome}}"}</code> — Nome do lead</p>
                <p><code className="bg-background px-1 py-0.5 rounded font-mono">{"{{imovel}}"}</code> — Título do imóvel</p>
                <p><code className="bg-background px-1 py-0.5 rounded font-mono">{"{{empresa}}"}</code> — Nome da imobiliária</p>
                <p><code className="bg-background px-1 py-0.5 rounded font-mono">{"{{telefone}}"}</code> — Telefone do lead</p>
                <p><code className="bg-background px-1 py-0.5 rounded font-mono">{"{{email}}"}</code> — Email do lead</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Template da Mensagem</label>
                  <Textarea
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    placeholder={`Olá, {{nome}}! 👋\n\nRecebemos seu contato sobre o imóvel *{{imovel}}* e ficamos muito felizes com seu interesse!\n\nEm breve, um de nossos especialistas entrará em contato para te ajudar.\n\nAtenciosamente,\n*{{empresa}}*`}
                    rows={10}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deixe vazio para usar o template padrão. Use *texto* para negrito no WhatsApp.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Pré-visualização</label>
                  <div className="rounded-lg border border-border bg-[#e5ddd5] p-4 min-h-[200px]">
                    <div className="max-w-[85%] ml-auto rounded-lg bg-[#dcf8c6] px-3 py-2 shadow-sm text-sm whitespace-pre-wrap break-words">
                      {(() => {
                        const defaultTpl = `Olá, {{nome}}! 👋\n\nRecebemos seu contato sobre o imóvel *{{imovel}}* e ficamos muito felizes com seu interesse!\n\nEm breve, um de nossos especialistas entrará em contato para te ajudar.\n\nAtenciosamente,\n*{{empresa}}*`;
                        const tpl = whatsappTemplate.trim() || defaultTpl;
                        const preview = tpl
                          .replace(/\{\{nome\}\}/g, "João Silva")
                          .replace(/\{\{imovel\}\}/g, "Apartamento Centro SP")
                          .replace(/\{\{empresa\}\}/g, tenant?.name || "Minha Imobiliária")
                          .replace(/\{\{telefone\}\}/g, "(11) 99999-1234")
                          .replace(/\{\{email\}\}/g, "joao@email.com");
                        // Render WhatsApp bold *text*
                        return preview.split(/(\*[^*]+\*)/).map((part, i) =>
                          part.startsWith("*") && part.endsWith("*") ? (
                            <strong key={i}>{part.slice(1, -1)}</strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        );
                      })()}
                      <div className="text-right mt-1">
                        <span className="text-[10px] text-muted-foreground">19:59 ✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={() => saveTemplateMutation.mutate()} disabled={saveTemplateMutation.isPending} className="gap-2">
                {saveTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Template
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Config dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Evolution API</DialogTitle>
            <DialogDescription className="sr-only">Insira a URL base, a API Key e o nome da instância da sua Evolution API para habilitar as automações de WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Base URL *</label>
              <Input
                placeholder="https://sua-api.example.com"
                value={configForm.base_url}
                onChange={(e) => setConfigForm({ ...configForm, base_url: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">API Key (Global) *</label>
              <Input
                type="password"
                placeholder="Sua API Key global"
                value={configForm.api_key}
                onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Instância</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {instances.length > 0 ? (
                    <Select
                      value={configForm.instance_name}
                      onValueChange={(v) => setConfigForm({ ...configForm, instance_name: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione uma instância" /></SelectTrigger>
                      <SelectContent>
                        {instances.map((inst: any) => {
                          const name = inst.instance?.instanceName || inst.instanceName || inst.name || JSON.stringify(inst);
                          return (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Nome da instância"
                      value={configForm.instance_name}
                      onChange={(e) => setConfigForm({ ...configForm, instance_name: e.target.value })}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={loadingInstances || !configForm.base_url || !configForm.api_key}
                  onClick={async () => {
                    // Save first, then list
                    await saveConfigMutation.mutateAsync();
                    handleListInstances();
                  }}
                  title="Buscar instâncias"
                >
                  {loadingInstances ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Salve a URL e API Key primeiro, depois clique em buscar para listar as instâncias disponíveis
              </p>
            </div>
            <Button
              className="w-full"
              disabled={saveConfigMutation.isPending || !configForm.base_url || !configForm.api_key}
              onClick={() => saveConfigMutation.mutate()}
            >
              {saveConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Configuração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMessages;
