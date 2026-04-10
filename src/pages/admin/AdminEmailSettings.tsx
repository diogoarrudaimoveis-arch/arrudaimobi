import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Server, Send, Eye, EyeOff, Save, TestTube, Loader2,
  CheckCircle2, XCircle, FileCode, Users
} from "lucide-react";
import EmailCampaigns from "@/components/admin/EmailCampaigns";

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Olá, {{nome_cliente}}!</h2>
  <p>Temos uma novidade para você! O imóvel <strong>{{nome_imovel}}</strong> está disponível e pode ser exatamente o que você procura.</p>
  <p><strong>Detalhes do Imóvel:</strong></p>
  <ul style="color: #374151; line-height: 1.8;">
    <li>Endereço: {{endereco_imovel}}</li>
    <li>Valor: {{valor_imovel}}</li>
  </ul>
  <p><a href="{{link_imovel}}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: #fff; text-decoration: none; border-radius: 6px;">Ver Imóvel</a></p>
  <p style="color: #6b7280; font-size: 12px;">E-mail enviado para {{email_cliente}}</p>
</body>
</html>`;

export default function AdminEmailSettings() {
  const { toast } = useToast();
  const { session } = useAuth();

  // SMTP fields
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState("tls");
  const [hasPassword, setHasPassword] = useState(false);

  // Sender fields
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");

  // Product email fields
  const [productSubject, setProductSubject] = useState("");
  const [productHtml, setProductHtml] = useState(DEFAULT_HTML);
  const [editingHtml, setEditingHtml] = useState(false);

  // UI states
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connected" | "error">("idle");
  const [testEmail, setTestEmail] = useState("");

  // Load saved settings
  useEffect(() => {
    loadSettings();
  }, [session]);

  async function getInvokeErrorMessage(error: unknown, fallback: string) {
    const maybeResponse = (error as { context?: { json?: () => Promise<unknown>; text?: () => Promise<string> } } | null)?.context;

    if (maybeResponse && typeof maybeResponse.json === "function") {
      const payload = await maybeResponse.json().catch(() => null);
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        return payload.error;
      }
    }

    if (maybeResponse && typeof maybeResponse.text === "function") {
      const text = await maybeResponse.text().catch(() => "");
      if (text) return text;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  async function loadSettings() {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("manage-smtp", {
        body: { action: "load" },
      });

      if (error) throw error;

      if (data && typeof data === "object" && "id" in data) {
        const settings = data as any;
        setHost(settings.host || "");
        setPort(String(settings.port || 587));
        setUsername(settings.username || "");
        setEncryption(settings.encryption || "tls");
        setSenderEmail(settings.sender_email || "");
        setSenderName(settings.sender_name || "");
        setProductSubject(settings.product_email_subject || "");
        // Se o HTML salvo ainda usa variáveis antigas de produto, substituir pelo novo default de imóveis
        const savedHtml = settings.product_email_html || "";
        const isOldProductTemplate = savedHtml.includes("{{nome_produto}}") || savedHtml.includes("{{link_produto}}") || savedHtml.includes("Acessar Produto");
        setProductHtml(isOldProductTemplate || !savedHtml ? DEFAULT_HTML : savedHtml);
        setHasPassword(settings.has_password || false);
        setConnectionStatus(settings.has_password ? "connected" : "idle");
        toast({ title: "Configurações carregadas com sucesso!" });
      }
    } catch (error) {
      const message = await getInvokeErrorMessage(error, "Erro ao carregar configurações");
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!host || !port || !username || !senderEmail || !senderName) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!hasPassword && !password) {
      toast({ title: "Senha SMTP é obrigatória na primeira configuração", variant: "destructive" });
      return;
    }
    if (!session?.access_token) {
      toast({ title: "Sessão inválida. Faça login novamente.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("manage-smtp", {
        body: {
          action: "save",
          host,
          port,
          username,
          password,
          encryption,
          sender_email: senderEmail,
          sender_name: senderName,
          product_email_subject: productSubject,
          product_email_html: productHtml,
        },
      });

      if (error) throw error;

      toast({ title: "Configurações salvas com sucesso!" });
      setHasPassword(true);
      setPassword("");
      setConnectionStatus("connected");
    } catch (error) {
      const message = await getInvokeErrorMessage(error, "Erro ao salvar");
      toast({ title: message, variant: "destructive" });
      setConnectionStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!session?.access_token) {
      toast({ title: "Sessão inválida. Faça login novamente.", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-smtp", {
        body: {
          action: "test",
          test_email: testEmail || undefined,
        },
      });

      if (error) throw error;

      const payload = data as { message?: string } | null;
      toast({ title: payload?.message || "E-mail de teste enviado!" });
      setConnectionStatus("connected");
    } catch (error) {
      console.error("SMTP test error:", error);
      const message = await getInvokeErrorMessage(error, "Erro no teste SMTP");
      toast({ title: message, variant: "destructive" });
      setConnectionStatus("error");
    } finally {
      setTesting(false);
    }
  }

  // Preview with sample variables
  function getPreviewHtml() {
    return productHtml
      .replace(/\{\{nome_cliente\}\}/g, "João Silva")
      .replace(/\{\{email_cliente\}\}/g, "joao@email.com")
      .replace(/\{\{nome_imovel\}\}/g, "Apartamento 3 quartos - Centro")
      .replace(/\{\{link_imovel\}\}/g, "https://exemplo.com/imovel/123")
      .replace(/\{\{endereco_imovel\}\}/g, "Rua das Flores, 123 - Centro, São Paulo/SP")
      .replace(/\{\{valor_imovel\}\}/g, "R$ 450.000,00");
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Configurações de E-mail</h1>
            <p className="text-muted-foreground">Configure o servidor SMTP e envie e-mails</p>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" && (
              <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Conectado
              </div>
            )}
            {connectionStatus === "error" && (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                Erro
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="smtp" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="smtp" className="gap-2">
              <Server className="h-4 w-4" />
              Configuração SMTP
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Users className="h-4 w-4" />
              Envio de E-mails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smtp" className="space-y-6 mt-6">

        {/* Section 1: SMTP Server */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Detalhes do Servidor SMTP
            </CardTitle>
            <CardDescription>Configure a conexão com seu servidor de e-mail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host">Host SMTP *</Label>
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Porta SMTP *</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="587"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuário SMTP (E-mail) *</Label>
              <Input
                id="username"
                type="email"
                placeholder="seu-email@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-password">Senha SMTP {!hasPassword && "*"}</Label>
              <div className="relative">
                <Input
                  id="smtp-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={hasPassword ? "Deixe em branco para manter a senha atual" : "Digite a senha SMTP"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasPassword
                  ? "Deixe em branco para manter a senha atual."
                  : "Obrigatório na primeira configuração."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="encryption">Criptografia</Label>
              <Select value={encryption} onValueChange={setEncryption}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS (Recomendado)</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="none">Nenhuma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Sender Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Detalhes do Remetente
            </CardTitle>
            <CardDescription>Informações que aparecerão como remetente dos e-mails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sender-email">E-mail do Remetente *</Label>
                <Input
                  id="sender-email"
                  type="email"
                  placeholder="noreply@empresa.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name">Nome do Remetente *</Label>
                <Input
                  id="sender-name"
                  placeholder="Nome da Empresa"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Para evitar erros, este e-mail deve ser o mesmo do "Usuário SMTP" na maioria dos provedores.
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Property Email Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              E-mail de Imóveis
            </CardTitle>
            <CardDescription>
              Template do e-mail enviado aos clientes sobre imóveis. Variáveis: {"{"}{"{"} nome_cliente {"}"}{"}"},
              {" "}{"{"}{"{"} email_cliente {"}"}{"}"},
              {" "}{"{"}{"{"} nome_imovel {"}"}{"}"},
              {" "}{"{"}{"{"} link_imovel {"}"}{"}"},
              {" "}{"{"}{"{"} endereco_imovel {"}"}{"}"},
              {" "}{"{"}{"{"} valor_imovel {"}"}{"}"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-subject">Assunto do E-mail</Label>
              <Input
                id="product-subject"
                placeholder="Confira este imóvel incrível!"
                value={productSubject}
                onChange={(e) => setProductSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo HTML do E-mail</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingHtml(!editingHtml)}
                  className="gap-1.5"
                >
                  <FileCode className="h-3.5 w-3.5" />
                  {editingHtml ? "Pré-visualizar" : "Editar HTML"}
                </Button>
              </div>

              {editingHtml ? (
                <Textarea
                  className="min-h-[300px] font-mono text-xs"
                  value={productHtml}
                  onChange={(e) => setProductHtml(e.target.value)}
                />
              ) : (
                <div className="min-h-[300px] rounded-md border bg-background p-4 overflow-auto">
                  <iframe
                    srcDoc={getPreviewHtml()}
                    className="w-full min-h-[280px] border-0"
                    title="Preview do e-mail"
                    sandbox=""
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1 space-y-2">
                <Label htmlFor="test-email">E-mail para teste</Label>
                <div className="flex gap-2">
                  <Input
                    id="test-email"
                    type="email"
                    placeholder={senderEmail || "email@exemplo.com"}
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing || connectionStatus === "idle"}
                    className="gap-2"
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                    Enviar Teste
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Salve as configurações antes de enviar o teste.</p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <EmailCampaigns />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
