import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyContext: any; // Context formatado já no pattern requerido
  onAccept: (text: string) => void;
  tenantId: string | null;
}

const TONES = [
  { id: "persuasivo, emocional e sofisticado", label: "Sofisticado & Emocional (Luxo)" },
  { id: "familiar, acolhedor e seguro", label: "Familiar & Acolhedor" },
  { id: "analítico, focado em retorno financeiro e segurança", label: "Investidor & Analítico" },
  { id: "direto, objetivo e comercial", label: "Direto & Objetivo" },
  { id: "descontraído e jovem", label: "Descontraído & Jovem" },
];

const PROVIDERS = [
  { id: "auto", label: "Automático (Recomendado)" },
  { id: "openai", label: "GPT-4 / 3.5 (OpenAI)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "groq", label: "Groq Llama 3" },
];

export function AIAssistantModal({
  isOpen,
  onClose,
  propertyContext,
  onAccept,
  tenantId,
}: AIAssistantModalProps) {
  const [provider, setProvider] = useState<string>("auto");
  const [tone, setTone] = useState<string>(TONES[0].id);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [errorText, setErrorText] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorText("");
    setGeneratedText("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const payload = {
        tenant_id: tenantId,
        feature: "property_description",
        prompt: `Gere uma descrição atraente e persuasiva para um imóvel. Foque em benefícios e emoção.`,
        tone: tone,
        context: propertyContext,
        forced_provider: provider === "auto" ? undefined : provider,
      };

      const { data, error } = await supabase.functions.invoke("generate-ai-content", {
        body: payload,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) {
        // Fallback catch de erros hard (ex: network issue, cors)
        throw new Error(error.message || "Erro desconhecido ao chamar a IA.");
      }

      // Erros soft disparados em 200 OK
      if (data && data.error) {
        let errorMsg = data.error;
        if (data.debug) {
          console.log("[AIAssistant] Debug Info:", data.debug);
          const { tenant, settings, counts } = data.debug;
          errorMsg += `\n[Diagnóstico Final: ID=${tenant?.slice(0,8) || '?'}, Keys=${JSON.stringify(counts)}]`;
          if (settings) {
            console.log("[AIAssistant] Settings received:", settings);
          }
        }
        throw new Error(errorMsg);
      }

      if (data && data.content) {
        setGeneratedText(data.content);
      } else {
        throw new Error("A resposta da IA veio vazia.");
      }
    } catch (err: any) {
      console.log("[AIAssistant] Falha na Geração Controlada:", err.message);
      // Limpeza da mensagem original pra ficar agradável ao olho.
      let eMsg = err.message || "Falha na geração.";
      if (eMsg.includes("Edge Function returned a non-2xx status code")) {
        eMsg = "Erro de configuração do servidor ou rota na base do Supabase.";
      }
      setErrorText(eMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    onAccept(generatedText);
  };

  const formatCurrency = (val: any) => {
    if (!val) return "Consulte";
    const num = parseFloat(String(val).replace(/[^0-9,.-]/g, ""));
    if (isNaN(num)) return "Consulte";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] gap-0 p-0 border-[#2A2D3C] bg-[#1A1D27] text-gray-200">
        <DialogHeader className="p-6 border-b border-[#2A2D3C] bg-gradient-to-r from-[#1A1D27] to-[#1E2230]">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Assistente de IA
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Gerando descrição profissional para seu imóvel
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Fita Resumo das Características do Imóvel Evidenciadas na Tela */}
          <div className="flex flex-wrap items-center justify-between text-xs font-medium text-gray-300 gap-4 bg-[#212431] px-4 py-3 rounded-lg border border-[#2A2D3C]">
            <div className="flex items-center gap-1.5 min-w-fit">
              <Home className="h-4 w-4 text-gray-400" />
              <span>{propertyContext?.["Tipo"] || "Imóvel"}</span>
            </div>
            {propertyContext?.["Logradouro"] && (
              <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="truncate">{propertyContext?.["Bairro"] || propertyContext?.["Logradouro"]}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 min-w-fit text-blue-400 font-bold">
              <span>{formatCurrency(propertyContext?.["Preço Base (R$)"])}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1" title="Dormitórios"><BedDouble className="h-3.5 w-3.5"/> {propertyContext?.["Dormitórios"] || 0}</span>
              <span className="flex items-center gap-1" title="Banheiros"><Bath className="h-3.5 w-3.5"/> {propertyContext?.["Banheiros"] || 0}</span>
              <span className="flex items-center gap-1" title="Vagas"><Car className="h-3.5 w-3.5"/> {propertyContext?.["Vagas de Garagem"] || 0}</span>
              <span className="flex items-center gap-1" title="A.Útil"><Maximize className="h-3.5 w-3.5"/> {propertyContext?.["Área Útil (m²)"] || 0}m²</span>
            </div>
          </div>

          {/* Configurações da IA (Tom e Provedor) */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-gray-400 font-normal shrink-0">Tom:</Label>
              <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
                <SelectTrigger className="h-8 bg-transparent border-none text-blue-400 hover:text-blue-300 font-medium focus:ring-0 px-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#212431] border-[#2A2D3C] text-gray-200">
                  {TONES.map(t => <SelectItem key={t.id} value={t.id} className="focus:bg-[#2A2D3C] focus:text-white">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-[220px]">
              <Label className="text-gray-400 font-normal shrink-0">Provedor:</Label>
              <Select value={provider} onValueChange={setProvider} disabled={isGenerating}>
                <SelectTrigger className="h-8 bg-[#212431] border-[#2A2D3C]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#212431] border-[#2A2D3C] text-gray-200">
                  {PROVIDERS.map(p => <SelectItem key={p.id} value={p.id} className="focus:bg-[#2A2D3C] focus:text-white">{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ÁREA MAIN (Loading, Texto ou Erro) */}
          <div className="relative min-h-[200px] max-h-[350px] overflow-hidden rounded-xl border border-[#2A2D3C] bg-[#12141A]">
            
            {!generatedText && !errorText && !isGenerating && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <Sparkles className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">Clique em <strong>Gerar Descrição</strong> para que nosso assistente construa uma oferta persuasiva baseada nas configurações e comodidades deste imóvel.</p>
               </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1DA1F2]/5 backdrop-blur-sm z-10 text-blue-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm font-medium animate-pulse">Inspirando a IA... Produzindo Copywriting...</p>
              </div>
            )}

            {errorText && !isGenerating && (
              <div className="absolute inset-0 flex items-center p-6">
                <div className="w-full rounded-lg border border-[#3C2A2D] bg-[#2A1D21] p-4 text-[#F87171]">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Erro ao gerar</h4>
                      <p className="text-sm leading-relaxed opacity-90">
                        {errorText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {generatedText && !isGenerating && (
              <Textarea 
                className="w-full h-full min-h-[250px] max-h-[350px] resize-y p-5 bg-transparent border-none text-gray-300 focus-visible:ring-0 font-serif leading-relaxed"
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                placeholder="A descrição aparecerá aqui..."
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-[#2A2D3C] bg-[#1A1D27]">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-[#212431]">
            Cancelar
          </Button>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="gap-2 border-[#2A2D3C] bg-[#212431] text-gray-300 hover:bg-[#2A2D3C] hover:text-white"
            >
              {generatedText || errorText ? (
                <><RefreshCcw className="h-4 w-4" /> Refazer</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Gerar Descrição</>
              )}
            </Button>
            
            <Button 
              onClick={handleAccept} 
              disabled={isGenerating || !generatedText}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
            >
              <Check className="h-4 w-4" /> 
              Aceitar Descrição
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
