import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sonnerToast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles, ImageIcon, FileText, Video, Loader2, Copy,
  Instagram, Youtube, FileImage, Layers, RefreshCw, CheckCircle2,
  Home, PenLine, Eye, Save
} from "lucide-react";

const CONTENT_TYPES = [
  { id: "post", label: "Post de Blog", icon: FileText, color: "from-blue-500 to-blue-600", desc: "Artigo completo com título, conteúdo e tags para blog" },
  { id: "story", label: "Story Instagram", icon: Instagram, color: "from-purple-500 via-pink-500 to-orange-400", desc: "Carrossel de imagens 1080x1920 para story" },
  { id: "reel", label: "Reel Instagram", icon: Video, color: "from-pink-500 via-red-400 to-yellow-400", desc: "Roteiro para vídeo vertical 9:16" },
  { id: "youtube_thumb", label: "Thumbnail YouTube", icon: Youtube, color: "from-red-600 to-red-700", desc: "Imagem de capa 1280x720 para vídeo" },
  { id: "youtube_cover", label: "Capa YouTube", icon: Layers, color: "from-red-500 to-red-600", desc: "Banner de canal 2560x1440" },
  { id: "property_card", label: "Cartão de Imóvel", icon: ImageIcon, color: "from-green-600 to-green-700", desc: "Card promocional para imóvel" },
];

interface PropertyData {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  price: number;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  images: string[];
}

interface GeneratedItem {
  type: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  script?: string;
  hashtags?: string[];
  captions?: string[];
  content?: string;
  prompt?: string;
}

export default function AdminContentGenerator() {
  const { tenantId, user } = useAuth();

  const [properties, setProperties] = useState<{ id: string; title: string; city: string; price: number }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<typeof CONTENT_TYPES[0] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<GeneratedItem | null>(null);

  // Load properties list
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("properties")
      .select("id, title, city, price")
      .eq("tenant_id", tenantId)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setProperties(data); });
  }, [tenantId]);

  // Load full property data when propertyId changes
  useEffect(() => {
    if (!selectedPropertyId) {
      setPropertyData(null);
      return;
    }

    setPropertyLoading(true);
    setPropertyData(null);

    supabase
      .from("properties")
      .select("*, property_images(url, display_order)")
      .eq("id", selectedPropertyId)
      .single()
      .then(({ data, error }) => {
        setPropertyLoading(false);
        if (error || !data) {
          sonnerToast({ title: "Erro ao carregar imóvel", description: error?.message, variant: "destructive" });
          return;
        }

        const sortedImages = (data.property_images || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((i: any) => i.url)
          .filter(Boolean);

        const fullProperty: PropertyData = {
          id: data.id,
          title: data.title || "",
          description: data.description || "",
          city: data.city || "",
          state: data.state || "",
          price: data.price || 0,
          type: data.type || "",
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          area: data.area || data.area_usable,
          images: sortedImages,
        };

        setPropertyData(fullProperty);

        // Pre-fill prompt with property description
        if (!prompt.trim()) {
          const parts: string[] = [];
          if (data.title) parts.push(data.title);
          if (data.description) parts.push(data.description);
          if (data.city || data.state) parts.push(`Localização: ${[data.city, data.state].filter(Boolean).join(", ")}`);
          if (data.price) parts.push(`Preço: R$ ${Number(data.price).toLocaleString("pt-BR")}`);
          if (data.bedrooms) parts.push(`${data.bedrooms} quarto(s)`);
          if (data.bathrooms) parts.push(`${data.bathrooms} banheiro(s)`);
          if (data.area) parts.push(`Área: ${data.area}m²`);
          setPrompt(parts.join(". "));
        }
      });
  }, [selectedPropertyId]);

  const triggerGenerate = useCallback(async () => {
    if (!selectedType) return;

    // Wait for property data to be fully loaded if property is selected
    if (selectedPropertyId && !propertyData && !propertyLoading) {
      sonnerToast({ title: "Aguarde", description: "Carregando dados do imóvel..." });
      return;
    }

    setLoading(true);

    const prop = propertyData;

    // Build prompt from property + user input
    const propertyPrompt = prop
      ? [
          prop.title,
          prop.description,
          prop.city || prop.state ? `Localização: ${[prop.city, prop.state].filter(Boolean).join(", ")}` : null,
          prop.price ? `Preço: R$ ${Number(prop.price).toLocaleString("pt-BR")}` : null,
          prop.bedrooms ? `${prop.bedrooms} quarto(s)` : null,
          prop.bathrooms ? `${prop.bathrooms} banheiro(s)` : null,
          prop.area ? `Área: ${prop.area}m²` : null,
          prop.type ? `Tipo: ${prop.type}` : null,
        ].filter(Boolean).join(". ")
      : "";

    const finalPrompt = prompt.trim() || propertyPrompt;

    if (!finalPrompt.trim()) {
      setLoading(false);
      sonnerToast({ title: "Prompt vazio", description: "Informe uma descrição ou selecione um imóvel com descrição.", variant: "destructive" });
      return;
    }

    const session = (await supabase.auth.getSession()).data.session;

    fetch(`https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=generate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({
        prompt: finalPrompt,
        content_types: [selectedType.id],
        tenant_id: tenantId,
        author_id: user?.id || "",
        property_id: selectedPropertyId || null,
        property_images: prop?.images?.length ? prop.images : [],
      }),
    })
      .then(res => res.json())
      .then(json => {
        if (json.ok && json.data?.results?.length > 0) {
          // Patch: for 'post' type, use the first property image as cover if no AI image was generated
          const patched = json.data.results.map((item: GeneratedItem) => {
            if (item.type === "post" && !item.imageUrl && prop?.images?.length) {
              return { ...item, imageUrl: prop.images[0] };
            }
            return item;
          });
          setResults(patched);
          sonnerToast({ title: "Conteúdo gerado!", description: `${patched.length} resultado(s)` });
        } else {
          sonnerToast({ title: "Erro", description: json.error || "Falha na geração", variant: "destructive" });
        }
      })
      .catch((err: any) => {
        sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [selectedType, propertyData, propertyLoading, selectedPropertyId, prompt, tenantId, user]);

  // Auto-generate when type is selected AND property data is fully loaded
  useEffect(() => {
    if (!selectedType || !selectedPropertyId) return;
    // Only trigger if property data is fully loaded (not loading, has data)
    if (propertyLoading) return;

    // If property is selected, we need its data. If we have it, trigger.
    if (selectedPropertyId && !propertyData && !propertyLoading) return;

    // If user already typed a custom prompt, don't auto-generate - let them click
    if (prompt.trim() && prompt.trim().length > 20) return;

    const timer = setTimeout(() => triggerGenerate(), 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType?.id, selectedPropertyId, propertyData?.id]);

  const generateImage = async (item: GeneratedItem, index: number) => {
    if (!item.prompt) { sonnerToast({ title: "Prompt não disponível", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=generate-content-image`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: item.prompt, type: item.type }),
      });
      const json = await res.json();
      if (json.ok && json.data?.image_url) {
        setResults(prev => prev.map((r, i) => i === index ? { ...r, imageUrl: json.data.image_url } : r));
        sonnerToast({ title: "Imagem gerada!" });
      } else {
        sonnerToast({ title: "Erro ao gerar imagem", description: json.data?.error || json.error || "Quota esgotada", variant: "destructive" });
      }
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async (item: GeneratedItem, index: number) => {
    if (!tenantId || !user) return;
    try {
      const slugBase = (item.title || prompt || "content").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
      const slug = `${slugBase}-${Date.now()}`;
      const { data, error } = await supabase.from("blog_posts").insert({
        tenant_id: tenantId, author_id: user.id,
        title: item.title || prompt.slice(0, 60), slug,
        excerpt: item.text?.slice(0, 200) || item.script?.slice(0, 200) || null,
        content: item.content || item.script || item.text || `<p>${item.title || ""}</p>`,
        cover_image_url: item.imageUrl || null, published: false,
      }).select("id").single();
      if (error) throw error;
      setSavedIds(prev => new Set([...prev, index]));
      sonnerToast({ title: "Salvo!", description: `Post criado com ID: ${data.id.slice(0, 8)}...` });
    } catch (err: any) {
      sonnerToast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const resetFlow = () => {
    setSelectedPropertyId("");
    setPropertyData(null);
    setSelectedType(null);
    setPrompt("");
    setResults([]);
    setSavedIds(new Set());
  };

  const getTypeInfo = (type: string) => CONTENT_TYPES.find(t => t.id === type);

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Gerador de Conteúdo IA"
          subtitle="Selecione o imóvel para usar sua descrição e fotos. Escolha o tipo de conteúdo e clique em Gerar."
        />

        <div className="space-y-6">

          {/* Step 1: Select Property */}
          <Card className={`border-2 ${propertyData ? "border-green-300 dark:border-green-700" : "border-border"}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Selecionar Imóvel</CardTitle>
                  <CardDescription>Escolha um imóvel para usar sua descrição e fotos como referência.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setPropertyData(null);
                  setPrompt("");
                  setResults([]);
                  setSelectedType(null);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Nenhum — gerar sem referência</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} — {p.city} — R$ {Number(p.price).toLocaleString("pt-BR")}</option>
                ))}
              </select>

              {/* Property info + images */}
              {propertyLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do imóvel...
                </div>
              )}

              {propertyData && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-400">{propertyData.title}</p>
                      <p className="text-sm text-green-600/80">{propertyData.city}{propertyData.state ? `, ${propertyData.state}` : ""}</p>
                    </div>
                    <Badge className="bg-green-600 text-white">R$ {Number(propertyData.price).toLocaleString("pt-BR")}</Badge>
                  </div>

                  {propertyData.description && (
                    <div>
                      <Label className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                        <FileText className="h-3 w-3" /> Descrição do imóvel
                      </Label>
                      <p className="text-sm bg-white/50 dark:bg-black/20 rounded-lg p-2 max-h-28 overflow-y-auto">
                        {propertyData.description.slice(0, 500)}{propertyData.description.length > 500 ? "..." : ""}
                      </p>
                    </div>
                  )}

                  {propertyData.images.length > 0 && (
                    <div>
                      <Label className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                        <ImageIcon className="h-3 w-3" /> {propertyData.images.length} foto(s) carregada(s)
                      </Label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {propertyData.images.slice(0, 8).map((url, i) => (
                          <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-green-300 shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {propertyData.images.length > 8 && (
                          <div className="w-16 h-16 rounded-lg border border-green-300 bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                            <span className="text-xs text-green-700 dark:text-green-400">+{propertyData.images.length - 8}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Content Type */}
          <Card className={`border-2 ${selectedType ? "border-primary/30" : "border-border"}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Tipo de Conteúdo</CardTitle>
                  <CardDescription>Selecione o formato desejado, depois clique em Gerar.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CONTENT_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-center ${selectedType?.id === type.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-secondary/30"}`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                      <type.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold block">{type.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-1 block">{type.desc}</span>
                    </div>
                    {selectedType?.id === type.id && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Prompt + Generate */}
          <Card className="border-2 border-purple-200 dark:border-purple-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <PenLine className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Prompt / Descrição</CardTitle>
                  <CardDescription>
                    {propertyData?.description
                      ? "Descrição do imóvel carregada automaticamente. Edite se necessário."
                      : "Escreva uma descrição ou selecione um imóvel acima."}
                    {selectedType && <span className="text-primary ml-1">• {selectedType.label} selecionado</span>}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva o conteúdo que deseja gerar..."
                rows={5}
                className="text-sm"
              />
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={resetFlow} className="gap-1">
                  <RefreshCw className="h-4 w-4" /> Reiniciar
                </Button>
                <Button
                  onClick={triggerGenerate}
                  disabled={loading || !selectedType || !prompt.trim()}
                  className="gap-2 px-6"
                  size="lg"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Gerando..." : "Gerar Conteúdo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {loading && (
            <Card className="border-2 border-primary/20">
              <CardContent className="py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <p className="font-semibold">Gerando conteúdo com IA...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {propertyData ? `Usando: ${propertyData.title}` : "Sem referência de imóvel"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && !loading && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-400">Conteúdo gerado!</p>
                  <p className="text-sm text-green-600/80">{results.length} resultado(s) pronto(s) para revisão</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {results.map((item, idx) => {
                  const typeInfo = getTypeInfo(item.type);
                  const isSaved = savedIds.has(idx);
                  return (
                    <Card key={idx} className="overflow-hidden border-2 border-green-200 dark:border-green-900">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {typeInfo && (
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${typeInfo.color} flex items-center justify-center`}>
                                <typeInfo.icon className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">{typeInfo?.label || item.type}</Badge>
                            {isSaved && <Badge className="text-xs bg-green-600">Salvo ✓</Badge>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        {item.title && <p className="font-semibold text-sm line-clamp-2">{item.title}</p>}
                        {/* Cover image preview */}
                        {item.imageUrl && (
                          <div className="rounded-lg overflow-hidden border border-border">
                            <div className="relative">
                              <img src={item.imageUrl} alt="" className="w-full h-36 object-cover" />
                              <div className="absolute top-2 left-2">
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0 gap-1">
                                  <ImageIcon className="h-2.5 w-2.5" />
                                  {item.type === "post" && propertyData?.images?.includes(item.imageUrl) ? "Foto do imóvel" : "IA"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}
                        {item.text && <p className="text-xs text-muted-foreground line-clamp-4">{item.text}</p>}
                        {item.content && !item.text && <p className="text-xs text-muted-foreground line-clamp-4" dangerouslySetInnerHTML={{ __html: item.content.slice(0, 200) }} />}
                        {item.hashtags && item.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.hashtags.slice(0, 5).map((tag, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">#{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          {item.prompt && !item.imageUrl && (
                            <Button variant="default" size="sm" onClick={() => generateImage(item, idx)} disabled={loading} className="gap-1.5 flex-1">
                              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />} Gerar Imagem
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => saveToDatabase(item, idx)} className="gap-1.5 text-green-600">
                            <Save className="h-3 w-3" /> Salvar no Blog
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetFlow} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Novo Conteúdo
                </Button>
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
              <Eye className="h-5 w-5 text-primary" /> Preview do Conteúdo
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              {previewItem.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={previewItem.imageUrl} alt="" className="w-full" />
                </div>
              )}
              {previewItem.title && (
                <div><Label className="text-xs text-muted-foreground">Título</Label><p className="font-semibold">{previewItem.title}</p></div>
              )}
              {previewItem.text && (
                <div><Label className="text-xs text-muted-foreground">Texto</Label><div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.text}</div></div>
              )}
              {previewItem.script && (
                <div><Label className="text-xs text-muted-foreground">Roteiro</Label><div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.script}</div></div>
              )}
              {previewItem.captions && previewItem.captions.length > 0 && (
                <div><Label className="text-xs text-muted-foreground">Captions</Label><div className="space-y-2 max-h-40 overflow-y-auto">{previewItem.captions.map((cap, i) => <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm">{cap}</div>)}</div></div>
              )}
              {previewItem.hashtags && (
                <div><Label className="text-xs text-muted-foreground">Hashtags</Label><p className="text-sm">{previewItem.hashtags.map(t => `#${t}`).join(" ")}</p></div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
                {previewItem.text && (
                  <Button variant="default" onClick={() => { navigator.clipboard.writeText(previewItem.text || ""); sonnerToast({ title: "Copiado!" }); }} className="gap-1.5">
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