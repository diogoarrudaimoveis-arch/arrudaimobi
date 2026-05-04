import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Globe, Loader2, Link as LinkIcon, FileJson, 
  Trash2, ExternalLink, ShieldCheck, Database, Info, Copy, Check
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminPortals = () => {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [integrationType, setIntegrationType] = useState<"xml" | "api">("xml");
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["portal_integrations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_integrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // 2. Create Mutation
  const createMutation = useMutation({
    mutationFn: async (vars: { name: string; type: string; endpointUrl?: string | null; apiToken?: string | null }) => {
      const { data, error } = await supabase
        .from("portal_integrations")
        .insert({
          tenant_id: tenantId,
          name: vars.name,
          type: vars.type,
          endpoint_url: vars.endpointUrl || null,
          api_token: vars.apiToken || null,
          status: "pendente",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_integrations", tenantId] });
      toast.success("Integração solicitada com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao criar integração: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portal_integrations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_integrations", tenantId] });
      toast.success("Integração removida.");
    },
  });

  const resetForm = () => {
    setName("");
    setEndpointUrl("");
    setApiToken("");
    setIntegrationType("xml");
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Insira o nome do portal.");
      return;
    }
    createMutation.mutate({ name, type: integrationType, endpointUrl, apiToken });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("URL copiada!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getXmlUrl = (id: string) => `https://www.arrudaimobi.com.br/api/feeds/xml?tenant_id=${tenantId}&portal_id=${id}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Portais Imobiliários</h1>
            <p className="text-muted-foreground">Gerencie integrações e sincronização com portais parceiros</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-[#003366] hover:bg-[#002244]">
            <Plus className="h-4 w-4" /> Adicionar Nova Integração
          </Button>
        </div>

        <Tabs defaultValue="integracoes" className="space-y-6">
          <TabsList className="bg-transparent h-10 gap-6 w-full justify-start rounded-none p-0 border-b">
            <TabsTrigger value="integracoes" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-2 pb-2 text-sm font-medium transition-all">
              Integrações de Portais
            </TabsTrigger>
            <TabsTrigger value="legados" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-2 pb-2 text-sm font-medium transition-all">
              Portais Legados
            </TabsTrigger>
            <TabsTrigger value="historico" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-2 pb-2 text-sm font-medium transition-all">
              Histórico de Sincronização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integracoes" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
              </div>
            ) : integrations?.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed">
                <Globe className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold">Nenhuma integração ativa</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Conecte sua imobiliária aos maiores portais do país (Zap, VivaReal, Imovelweb) via XML ou API.
                </p>
                <Button onClick={() => setDialogOpen(true)} variant="outline" className="mt-6">Criar primeira integração</Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {integrations?.map((portal) => (
                  <Card key={portal.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between font-display">
                        <CardTitle className="text-lg">{portal.name}</CardTitle>
                        <Badge variant={portal.status === "pendente" ? "secondary" : "default"} className="capitalize">
                          {portal.status}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 capitalize">
                        {portal.type === "xml" ? <FileJson className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                        {portal.type === "xml" ? "Feed XML (VivaReal/Zap)" : "Integração API"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {portal.type === "xml" ? (
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL do Feed</Label>
                          <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2 text-xs font-mono group">
                            <span className="truncate flex-1">{getXmlUrl(portal.id)}</span>
                            <button
                              onClick={() => handleCopy(getXmlUrl(portal.id), portal.id)}
                              className="text-muted-foreground hover:text-[#003366] transition-colors"
                            >
                              {copiedId === portal.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                           <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Endpoint</Label>
                           <p className="text-xs truncate text-muted-foreground font-mono bg-muted/40 p-1.5 rounded">{portal.endpoint_url || 'N/A'}</p>
                        </div>
                      )}
                      
                      <div className="pt-4 flex justify-between gap-2 border-t">
                        <p className="text-[10px] text-muted-foreground italic">Sincronizado há 2h</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive" 
                          onClick={() => {
                            if(confirm("Deseja realmente remover esta integração?")) {
                              deleteMutation.mutate(portal.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="legados" className="mt-0">
            <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">Nenhum portal legado configurado.</p>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed">
              <Database className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">Histórico de sincronização ficará disponível após a primeira carga.</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Adicionar Nova Integração */}
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if(!v) resetForm(); }}>
          <DialogContent className="max-w-[500px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl">Adicionar Nova Integração</DialogTitle>
              <DialogDescription>Configure a integração com portais imobiliários parceiros</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="portal-name">Nome do Portal</Label>
                <Input 
                  id="portal-name" 
                  placeholder="Ex: Imovelweb, Chaves na Mão, Zap Imóveis..." 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/30"
                />
              </div>

              <div className="space-y-3">
                <Label>Tipo de Integração</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIntegrationType("xml")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 transition-all text-center",
                      integrationType === "xml" 
                        ? "border-[#003366] bg-[#003366]/5" 
                        : "border-transparent bg-muted/40 hover:bg-muted/60"
                    )}
                  >
                    <div className="p-2 rounded-full bg-background shadow-sm">
                      <FileJson className={cn("h-6 w-6", integrationType === "xml" ? "text-[#003366]" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Arquivo XML</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Feed automático padrão VivaReal/Zap</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntegrationType("api")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 transition-all text-center",
                      integrationType === "api" 
                        ? "border-[#003366] bg-[#003366]/5" 
                        : "border-transparent bg-muted/40 hover:bg-muted/60"
                    )}
                  >
                    <div className="p-2 rounded-full bg-background shadow-sm">
                      <LinkIcon className={cn("h-6 w-6", integrationType === "api" ? "text-[#003366]" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Conexão API</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Integração direta via endpoint</p>
                    </div>
                  </button>
                </div>
              </div>

              {integrationType === "xml" ? (
                <div className="flex gap-3 p-4 bg-muted/30 rounded-lg border text-sm text-balance">
                  <Info className="h-5 w-5 text-[#003366] shrink-0" />
                  <p className="leading-relaxed text-muted-foreground">
                    Será gerada uma URL única que exporta automaticamente todos os imóveis ativos no formato XML padrão VivaReal/Zap. Basta colar no portal parceiro.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">URL do Endpoint</Label>
                    <Input 
                      id="endpoint" 
                      placeholder="https://api.portal.com/v1/..." 
                      value={endpointUrl}
                      onChange={(e) => setEndpointUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token">Chave de API (Token)</Label>
                    <Input 
                      id="token" 
                      type="password" 
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 p-3 bg-amber-50 rounded-md border border-amber-200 text-[11px] text-amber-800">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Utilize o n8n ou automações externas para carga inicial via esta integração.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="px-8">Cancelar</Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className="bg-[#003366] hover:bg-[#002244] px-8"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Integração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPortals;
