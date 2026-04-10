import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAISettings, useUpdateAISettingsMutation } from "@/hooks/use-ai-settings";
import { Sparkles, Brain, Cpu, MessageSquare, Loader2, Save, Key, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const AdminAIConfig = () => {
  const { data: settings, isLoading } = useAISettings();
  const updateMutation = useUpdateAISettingsMutation();

  const [form, setForm] = useState({
    openai_key: "",
    gemini_key: "",
    groq_key: "",
    primary_provider: "openai",
    rotation_strategy: "fallback",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        openai_key: settings.openai_key || "",
        gemini_key: settings.gemini_key || "",
        groq_key: settings.groq_key || "",
        primary_provider: settings.primary_provider || "openai",
        rotation_strategy: settings.rotation_strategy || "fallback",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
        </div>
      </AdminLayout>
    );
  }

  const providers = [
    {
      id: "openai",
      title: "OpenAI (GPT-3.5/4)",
      icon: Cpu,
      description: "Líder de mercado, ideal para descrições criativas e persuasivas.",
      keyField: "openai_key",
      color: "text-emerald-500",
    },
    {
      id: "gemini",
      title: "Google Gemini",
      icon: Brain,
      description: "Alta velocidade e grandes janelas de contexto para análise de dados.",
      keyField: "gemini_key",
      color: "text-blue-500",
    },
    {
      id: "groq",
      title: "Groq LPU (Llama 3)",
      icon: MessageSquare,
      description: "O provedor mais rápido do mundo, excelente para respostas instantâneas.",
      keyField: "groq_key",
      color: "text-orange-500",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Configurações de IA</h1>
          <p className="text-muted-foreground">Gerencie seus provedores de inteligência artificial e estratégias de fallback</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => {
            const isConfigured = !!form[provider.keyField as keyof typeof form];
            return (
              <Card key={provider.id} className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-muted ${provider.color}`}>
                      <provider.icon className="h-5 w-5" />
                    </div>
                    {isConfigured ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shrink-0">
                        Configurado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-4">{provider.title}</CardTitle>
                  <CardDescription className="min-h-[40px]">{provider.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5" /> API Key
                    </Label>
                    <Input
                      type="password"
                      placeholder="Insira sua chave..."
                      value={form[provider.keyField as keyof typeof form] as string}
                      onChange={(e) => setForm({ ...form, [provider.keyField]: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#003366]" /> Inteligência de Geração
            </CardTitle>
            <CardDescription>Defina como o sistema deve se comportar ao gerar descrições.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Provedor Principal</Label>
                  <Select value={form.primary_provider} onValueChange={(v) => setForm({ ...form, primary_provider: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI (Padrão)</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="groq">Groq LPU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estratégia de Resiliência</Label>
                  <Select value={form.rotation_strategy} onValueChange={(v) => setForm({ ...form, rotation_strategy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary_only">Apenas Principal</SelectItem>
                      <SelectItem value="fallback">Fallback Automático (Recomendado)</SelectItem>
                      <SelectItem value="rotation">Rodízio (Aleatório)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    O **Fallback** tentará automaticamente os outros provedores caso o principal falhe.
                  </p>
                </div>
            </div>

            <Separator />

            <div className="p-4 bg-[#003366]/5 border border-[#003366]/20 rounded-xl space-y-3">
              <h4 className="font-semibold text-[#003366] flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4" /> Compromisso com Privacidade
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As chaves de API são armazenadas em um ambiente isolado e nunca são exibidas em código-fonte aberto ou para outros tenants. O uso das descrições foca em benefícios emocionais e persuasão de vendas, mantendo o controle de custos sob sua gestão direta via tokens dos provedores.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/30 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-amber-600">
               {!form.openai_key && !form.gemini_key && !form.groq_key && (
                 <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Nenhuma IA ativa</span>
                 </>
               )}
            </div>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-[#003366] hover:bg-[#002244] gap-2 min-w-[120px]">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAIConfig;
