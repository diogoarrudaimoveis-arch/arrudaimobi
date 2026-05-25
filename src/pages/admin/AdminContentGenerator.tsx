import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sonnerToast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles, ImageIcon, FileText, Video, Download, Loader2, Copy, Check,
  Instagram, Youtube, FileImage, Layers, Wand2, RefreshCw, ChevronDown
} from "lucide-react";

const CONTENT_TYPES = [
  { id: "post", label: "Post de Blog", icon: FileText, color: "bg-blue-500", desc: "Artigo completo com título, conteúdo e tags" },
  { id: "story", label: "Story Instagram", icon: Instagram, color: "bg-gradient-instagram", desc: "Carrossel de imagens para story 1080x1920" },
  { id: "reel", label: "Reel Instagram", icon: Video, color: "bg-gradient-reel", desc: "Roteiro para vídeo vertical 9:16" },
  { id: "youtube_thumb", label: "Thumbnail YouTube", icon: Youtube, color: "bg-red-600", desc: "Imagem de capa 1280x720 para vídeo" },
  { id: "youtube_cover", label: "Capa YouTube", icon: Layers, color: "bg-red-500", desc: "Banner de canal com texto" },
  { id: "property_card", label: "Cartão de Imóvel", icon: ImageIcon, color: "bg-green-600", desc: "Card promocional para imóvel específico" },
];

interface GeneratedContent {
  type: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  script?: string;
  hashtags?: string[];
  captions?: string[];
  slug?: string;
  content?: string;
  prompt?: string;
}

export default function AdminContentGenerator() {
  const { tenantId, user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["post"]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingImage, setLoadingImage] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);

  // Load properties for reference
  useState(() => {
    if (!tenantId) return;
    supabase.from("properties").select("id, title, city, price, property_images(url)").eq("status", "available").limit(50)
      .then(({ data }) => setProperties(data || []));
  });

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const generateAll = async () => {
    if (!prompt.trim()) {
      sonnerToast({ title: "Informe o prompt", variant: "destructive" }); return;
    }
    if (!selectedTypes.length) {
      sonnerToast({ title: "Selecione pelo menos um tipo de conteúdo", variant: "destructive" }); return;
    }
    if (!tenantId) return;

    setLoading(true);
    setResults([]);

    try {
      const propertyImages: string[] = [];
      if (propertyId) {
        const { data: prop } = await supabase
          .from("property_images")
          .select("url")
          .eq("property_id", propertyId)
          .order("display_order")
          .limit(10);
        if (prop) propertyImages.push(...prop.map(p => p.url));
      }

      const res = await fetch(
        `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=generate-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            content_types: selectedTypes,
            tenant_id: tenantId,
            author_id: user?.id || "",
            property_id: propertyId || null,
            property_images: propertyImages,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Erro na geração");

      setResults(json.data.results || []);
      sonnerToast({ title: "Conteúdo gerado!", description: `${(json.data.results || []).length} itens criados` });
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (item: GeneratedContent, index: number) => {
    if (!item.prompt) return;
    setLoadingImage(`${item.type}-${index}`);

    try {
      const res = await fetch(
        `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=generate-content-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: item.prompt, type: item.type }),
        }
      );
      const json = await res.json();
      if (json.ok && json.data?.image_url) {
        setResults(prev => prev.map((r, i) => i === index ? { ...r, imageUrl: json.data.image_url } : r));
        sonnerToast({ title: "Imagem gerada!" });
      } else {
        sonnerToast({ title: "Erro ao gerar imagem", description: json.data?.error || json.error, variant: "destructive" });
      }
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingImage(null);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTypeInfo = (type: string) => CONTENT_TYPES.find(t => t.id === type);

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Gerador de Conteúdo IA"
          subtitle="Gere posts de blog, stories, reels, thumbnails e capas para YouTube usando IA. Use fotos dos imóveis como referência."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setResults([]); setPrompt(""); setSelectedTypes(["post"]); setPropertyId(""); }} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Limpar
              </Button>
            </div>
          }
        />

        {/* Main editor */}
        <div className="space-y-6">
          {/* Prompt input */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Prompt / Tema do Conteúdo *</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Apartamento de 3 quartos no Funcionários com varanda gourmet, próximo ao parque. gerar conteudo para instagram e youtube..."
                  rows={4}
                  disabled={loading}
                  className="text-sm"
                />
              </div>

              {/* Property selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4" /> Usar fotos de imóvel específico (opcional)
                </Label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Nenhum — gerar sem referência de imóvel</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.city} — R$ {Number(p.price).toLocaleString("pt-BR")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content types */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipos de Conteúdo</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                      disabled={loading}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-center ${
                        selectedTypes.includes(type.id)
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50 bg-secondary/30"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl ${type.color} flex items-center justify-center`}>
                        <type.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{type.label}</span>
                      {selectedTypes.includes(type.id) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <div className="flex justify-end">
                <Button
                  onClick={generateAll}
                  disabled={loading || !prompt.trim() || !selectedTypes.length}
                  className="gap-2 px-6"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loading ? "Gerando..." : "Gerar Conteúdo"}
                </Button>
              </div>

              {loading && (
                <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <div>
                    <p className="font-medium text-sm">Gerando conteúdo...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criando textos, prompts e gerando imagens para {selectedTypes.length} tipo(s) de conteúdo
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold">Resultados ({results.length})</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((item, idx) => {
                  const typeInfo = getTypeInfo(item.type);
                  return (
                    <Card key={idx} className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {typeInfo && (
                              <div className={`w-8 h-8 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                                <typeInfo.icon className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">{typeInfo?.label || item.type}</Badge>
                          </div>
                        </div>

                        {/* Image preview */}
                        {item.imageUrl && (
                          <div className="rounded-lg overflow-hidden border border-border h-40 bg-secondary">
                            <img src={item.imageUrl} alt={item.title || item.type} className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Text content */}
                        {item.title && (
                          <p className="font-semibold text-sm line-clamp-2">{item.title}</p>
                        )}

                        {item.text && (
                          <p className="text-xs text-muted-foreground line-clamp-3">{item.text}</p>
                        )}

                        {item.script && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs font-medium mb-1">Roteiro</p>
                            <p className="text-xs text-muted-foreground line-clamp-4">{item.script}</p>
                          </div>
                        )}

                        {item.hashtags && item.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.hashtags.slice(0, 5).map((tag, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {!item.imageUrl && item.prompt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateImage(item, idx)}
                              disabled={loadingImage === `${item.type}-${idx}`}
                              className="gap-1.5 flex-1"
                            >
                              {loadingImage === `${item.type}-${idx}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ImageIcon className="h-3 w-3" />
                              )}
                              Gerar Imagem
                            </Button>
                          )}

                          {item.text && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyText(item.text || "")}
                              className="gap-1.5"
                            >
                              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          )}

                          {(item.title || item.text) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPreviewContent(item);
                                setPreviewOpen(true);
                              }}
                              className="gap-1.5"
                            >
                              <Wand2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AdminPageShell>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Preview do Conteúdo
            </DialogTitle>
          </DialogHeader>
          {previewContent && (
            <div className="space-y-4">
              {previewContent.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={previewContent.imageUrl} alt="" className="w-full" />
                </div>
              )}
              {previewContent.title && (
                <div>
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <p className="font-display font-semibold">{previewContent.title}</p>
                </div>
              )}
              {previewContent.text && (
                <div>
                  <Label className="text-xs text-muted-foreground">Texto</Label>
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap">{previewContent.text}</div>
                </div>
              )}
              {previewContent.script && (
                <div>
                  <Label className="text-xs text-muted-foreground">Roteiro</Label>
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap">{previewContent.script}</div>
                </div>
              )}
              {previewContent.captions && previewContent.captions.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Captions</Label>
                  <div className="space-y-2">
                    {previewContent.captions.map((cap, i) => (
                      <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm">{cap}</div>
                    ))}
                  </div>
                </div>
              )}
              {previewContent.hashtags && (
                <div>
                  <Label className="text-xs text-muted-foreground">Hashtags</Label>
                  <p className="text-sm">{previewContent.hashtags.map(t => `#${t}`).join(" ")}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
                {previewContent.text && (
                  <Button variant="default" onClick={() => { copyText(previewContent.text || ""); sonnerToast({ title: "Copiado!" }); }} className="gap-1.5">
                    <Copy className="h-4 w-4" /> Copiar Texto
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}