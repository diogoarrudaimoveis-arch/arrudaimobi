import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAISettings, useUpdateAISettingsMutation } from "@/hooks/use-ai-settings";
import {
  Sparkles, Brain, Cpu, MessageSquare, Loader2, Save,
  Key, ShieldCheck, AlertCircle, Plus, Trash2, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyEntry {
  value: string;
  visible: boolean;
}

function toKeyEntries(keys: string[]): KeyEntry[] {
  return keys.map((v) => ({ value: v, visible: false }));
}

function fromKeyEntries(entries: KeyEntry[]): string[] {
  return entries.map((e) => e.value.trim()).filter(Boolean);
}

// ─── Sub-component: Key List ──────────────────────────────────────────────────

function KeyList({
  label,
  entries,
  onChange,
}: {
  label: string;
  entries: KeyEntry[];
  onChange: (entries: KeyEntry[]) => void;
}) {
  const addKey = () => onChange([...entries, { value: "", visible: false }]);

  const removeKey = (i: number) => onChange(entries.filter((_, idx) => idx !== i));

  const updateKey = (i: number, value: string) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, value } : e)));

  const toggleVisible = (i: number) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, visible: !e.visible } : e)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Key className="h-3 w-3" /> {label}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-primary hover:text-primary"
          onClick={addKey}
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar chave
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="py-3 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
          Nenhuma chave adicionada
        </p>
      )}

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={entry.visible ? "text" : "password"}
                value={entry.value}
                onChange={(e) => updateKey(i, e.target.value)}
                placeholder="sk-..."
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => toggleVisible(i)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {entry.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <Badge
              variant={entry.value.trim() ? "default" : "secondary"}
              className={
                entry.value.trim()
                  ? "bg-emerald-100 text-emerald-700 border-none text-[10px] shrink-0"
                  : "text-[10px] shrink-0"
              }
            >
              {entry.value.trim() ? "Ativa" : "Pendente"}
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeKey(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminAIConfig = () => {
  const { data: settings, isLoading } = useAISettings();
  const updateMutation = useUpdateAISettingsMutation();

  const [openaiKeys, setOpenaiKeys]       = useState<KeyEntry[]>([]);
  const [geminiKeys, setGeminiKeys]       = useState<KeyEntry[]>([]);
  const [groqKeys, setGroqKeys]           = useState<KeyEntry[]>([]);
  const [primaryProvider, setPrimary]     = useState("openai");
  const [rotationStrategy, setStrategy]  = useState("fallback");

  useEffect(() => {
    if (settings) {
      setOpenaiKeys(toKeyEntries(settings.openai_keys ?? []));
      setGeminiKeys(toKeyEntries(settings.gemini_keys ?? []));
      setGroqKeys(toKeyEntries(settings.groq_keys ?? []));
      setPrimary(settings.primary_provider ?? "openai");
      setStrategy(settings.rotation_strategy ?? "fallback");
    }
  }, [settings]);

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      openai_keys: fromKeyEntries(openaiKeys),
      gemini_keys: fromKeyEntries(geminiKeys),
      groq_keys: fromKeyEntries(groqKeys),
      primary_provider: primaryProvider,
      rotation_strategy: rotationStrategy,
    });
  }, [openaiKeys, geminiKeys, groqKeys, primaryProvider, rotationStrategy, updateMutation]);

  const hasAnyKey =
    fromKeyEntries(openaiKeys).length > 0 ||
    fromKeyEntries(geminiKeys).length > 0 ||
    fromKeyEntries(groqKeys).length > 0;

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
      title: "OpenAI (GPT-3.5 / 4)",
      icon: Cpu,
      description: "Líder de mercado. Ideal para descrições criativas e persuasivas.",
      iconColor: "text-emerald-500",
      entries: openaiKeys,
      setEntries: setOpenaiKeys,
      keyCount: fromKeyEntries(openaiKeys).length,
    },
    {
      id: "gemini",
      title: "Google Gemini",
      icon: Brain,
      description: "Alta velocidade e grandes janelas de contexto para análise completa.",
      iconColor: "text-blue-500",
      entries: geminiKeys,
      setEntries: setGeminiKeys,
      keyCount: fromKeyEntries(geminiKeys).length,
    },
    {
      id: "groq",
      title: "Groq LPU (Llama 3)",
      icon: MessageSquare,
      description: "O provedor mais rápido do mundo. Excelente para respostas instantâneas.",
      iconColor: "text-orange-500",
      entries: groqKeys,
      setEntries: setGroqKeys,
      keyCount: fromKeyEntries(groqKeys).length,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold">Configurações de IA</h1>
          <p className="text-muted-foreground">
            Gerencie múltiplas chaves por provedor e estratégias de resiliência automática.
          </p>
        </div>

        {/* Provider Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((prov) => (
            <Card key={prov.id} className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-muted ${prov.iconColor}`}>
                    <prov.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {prov.keyCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {prov.keyCount} chave{prov.keyCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <Badge
                      className={
                        prov.keyCount > 0
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shrink-0"
                          : undefined
                      }
                      variant={prov.keyCount > 0 ? "default" : "secondary"}
                    >
                      {prov.keyCount > 0 ? "Configurado" : "Pendente"}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg mt-4">{prov.title}</CardTitle>
                <CardDescription className="min-h-[36px]">{prov.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <KeyList
                  label="API Keys"
                  entries={prov.entries}
                  onChange={prov.setEntries}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Strategy Config */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#003366]" /> Inteligência de Geração
            </CardTitle>
            <CardDescription>
              Configure a ordem de tentativas e o comportamento automático de fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor Principal</Label>
                <Select value={primaryProvider} onValueChange={setPrimary}>
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
                <Select value={rotationStrategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary_only">Apenas Principal</SelectItem>
                    <SelectItem value="fallback">Fallback Automático (Recomendado)</SelectItem>
                    <SelectItem value="rotation">Rodízio Aleatório</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {rotationStrategy === "fallback" &&
                    "Tenta todas as chaves do provedor principal. Se todas falharem, avança para os demais."}
                  {rotationStrategy === "rotation" &&
                    "Seleciona randomicamente um provedor ativo a cada geração, distribuindo a carga."}
                  {rotationStrategy === "primary_only" &&
                    "Usa somente o provedor principal. Sem fallback automático."}
                </p>
              </div>
            </div>

            <Separator />

            {/* Rotation diagram */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold mb-3 text-foreground">
                Fluxo de Tentativas ({rotationStrategy === "primary_only" ? "Simples" : rotationStrategy === "rotation" ? "Rodízio" : "Fallback"})
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {rotationStrategy === "primary_only" ? (
                  <>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium capitalize">{primaryProvider}</span>
                    <span>→ resultado ou erro</span>
                  </>
                ) : rotationStrategy === "rotation" ? (
                  <>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Seleção aleatória</span>
                    <span>→</span>
                    {(["openai", "gemini", "groq"] as const).filter(p => fromKeyEntries(
                      p === "openai" ? openaiKeys : p === "gemini" ? geminiKeys : groqKeys
                    ).length > 0).map(p => (
                      <span key={p} className="bg-muted px-2 py-1 rounded capitalize">{p}</span>
                    ))}
                  </>
                ) : (
                  <>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium capitalize">{primaryProvider} (todas as chaves)</span>
                    <span>→ Fallback</span>
                    {(["openai", "gemini", "groq"] as AIProvider[]).filter(p => p !== primaryProvider).map(p => (
                      <span key={p} className="bg-muted px-2 py-1 rounded capitalize">{p}</span>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#003366]/5 border border-[#003366]/20 rounded-xl space-y-2">
              <h4 className="font-semibold text-[#003366] flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4" /> Compromisso com Privacidade
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As chaves de API são armazenadas em ambiente isolado no Supabase com RLS ativo.
                Nunca são expostas no código-fonte nem compartilhadas entre tenants.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/30 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-amber-600">
              {!hasAnyKey && (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Nenhuma IA ativa — adicione ao menos uma chave</span>
                </>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-[#003366] hover:bg-[#002244] gap-2 min-w-[140px]"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
};

// needed to satisfy TypeScript when the AIProvider type is used without direct import
type AIProvider = "openai" | "gemini" | "groq";

export default AdminAIConfig;
