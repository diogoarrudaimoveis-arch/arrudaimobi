import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sonnerToast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles, ImageIcon, FileText, Video, Download, Loader2, Copy, Check,
  Instagram, Youtube, FileImage, Layers, Wand2, RefreshCw, ChevronRight,
  CheckCircle2, Home, PenLine, Image, Eye, Save, ArrowRight, AlertCircle,
  LayoutTemplate, Smartphone, Monitor, Square, Clapperboard
} from "lucide-react";
import { renderPropertyTemplate, type TemplateId } from "./templateRenderer";

// Content types with their configurations
const CONTENT_TYPES = [
  {
    id: "post", label: "Post de Blog", icon: FileText,
    color: "from-blue-500 to-blue-600",
    steps: ["Prompt", "Geração IA", "Revisar", "Salvar"],
    aspect: "1:1",
    desc: "Artigo completo com título, conteúdo e tags para blog"
  },
  {
    id: "story", label: "Story Instagram", icon: Instagram,
    color: "from-purple-500 via-pink-500 to-orange-400",
    steps: ["Selecionar Imóvel", "Prompt", "Gerar Roteiro", "Gerar Imagem", "Revisar", "Salvar"],
    aspect: "9:16",
    desc: "Carrossel de imagens 1080x1920 para story"
  },
  {
    id: "reel", label: "Reel Instagram", icon: Video,
    color: "from-pink-500 via-red-400 to-yellow-400",
    steps: ["Selecionar Imóvel", "Prompt", "Gerar Roteiro", "Revisar", "Salvar"],
    aspect: "9:16",
    desc: "Roteiro para vídeo vertical 9:16"
  },
  {
    id: "youtube_thumb", label: "Thumbnail YouTube", icon: Youtube,
    color: "from-red-600 to-red-700",
    steps: ["Prompt", "Gerar Imagem", "Revisar", "Salvar"],
    aspect: "16:9",
    desc: "Imagem de capa 1280x720 para vídeo"
  },
  {
    id: "youtube_cover", label: "Capa YouTube", icon: Layers,
    color: "from-red-500 to-red-600",
    steps: ["Prompt", "Gerar Imagem", "Revisar", "Salvar"],
    aspect: "16:9",
    desc: "Banner de canal 2560x1440"
  },
  {
    id: "property_card", label: "Cartão de Imóvel", icon: ImageIcon,
    color: "from-green-600 to-green-700",
    steps: ["Selecionar Imóvel", "Prompt", "Gerar Imagem", "Revisar", "Salvar"],
    aspect: "1:1",
    desc: "Card promocional para imóvel"
  },
];

// Template options for social media image rendering
const TEMPLATE_OPTIONS = [
  {
    id: 'story' as TemplateId,
    label: 'Story Instagram',
    icon: Smartphone,
    desc: '1080×1920 — Formato vertical para stories',
    color: 'from-purple-500 to-pink-500',
    dims: '1080×1920',
  },
  {
    id: 'post' as TemplateId,
    label: 'Post Instagram',
    icon: Instagram,
    desc: '1200×628 — Split layout moderno',
    color: 'from-blue-500 to-cyan-500',
    dims: '1200×628',
  },
  {
    id: 'thumb' as TemplateId,
    label: 'YouTube Thumb',
    icon: Monitor,
    desc: '1280×720 — Capa impactante',
    color: 'from-red-600 to-orange-500',
    dims: '1280×720',
  },
  {
    id: 'card' as TemplateId,
    label: 'Cartão Imóvel',
    icon: Square,
    desc: '1080×1080 — Quadrado premium',
    color: 'from-green-600 to-emerald-500',
    dims: '1080×1080',
  },
];

interface PropertyOption {
  id: string;
  title: string;
  city: string;
  price: number;
  images: { url: string }[];
}

interface GeneratedItem {
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

type Step = "property" | "content_type" | "prompt" | "generating" | "preview" | "saved";

export default function AdminContentGenerator() {
  const { tenantId, user } = useAuth();

  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>("property");
  const [selectedType, setSelectedType] = useState<any>(null);
  const [propertyId, setPropertyId] = useState("");
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");

  // Results
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<GeneratedItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Properties list
  const [properties, setProperties] = useState<PropertyOption[]>([]);

  // Template rendering
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [renderedTemplates, setRenderedTemplates] = useState<Record<number, Record<TemplateId, string>>>({});
  const [renderingTemplates, setRenderingTemplates] = useState<Set<number>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('story');
  const templateRendererRef = useRef<HTMLCanvasElement | null>(null);

  // Load properties
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("properties")
      .select("id, title, city, price, property_images(url, display_order)")
      .eq("tenant_id", tenantId)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.log("Erro ao carregar imóveis:", error);
          sonnerToast({ title: "Erro ao carregar imóveis", description: error.message, variant: "destructive" });
        } else {
          setProperties(data || []);
        }
      });
    // Load logo from visual identity
    supabase
      .from("visual_identity")
      .select("logo_url")
      .eq("tenant_id", tenantId)
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, [tenantId]);

  // When property changes, load its images
  useEffect(() => {
    if (!propertyId) {
      setPropertyImages([]);
      return;
    }
    const prop = properties.find(p => p.id === propertyId);
    if (prop?.property_images) {
      const sorted = [...prop.property_images].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      setPropertyImages(sorted.map((i: any) => i.url).filter(Boolean));
    } else {
      // Fallback: fetch directly
      supabase
        .from("property_images")
        .select("url")
        .eq("property_id", propertyId)
        .order("display_order")
        .limit(10)
        .then(({ data }) => {
          if (data) setPropertyImages(data.map((d: any) => d.url));
        });
    }
  }, [propertyId, properties]);

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const generateAll = async () => {
    if (!prompt.trim()) {
      sonnerToast({ title: "Informe o tema do conteúdo", variant: "destructive" }); return;
    }
    if (!selectedType) {
      sonnerToast({ title: "Selecione o tipo de conteúdo", variant: "destructive" }); return;
    }
    if (!tenantId) {
      sonnerToast({ title: "Tenant não encontrado", variant: "destructive" }); return;
    }

    setLoading(true);
    setCurrentStep("generating");
    setResults([]);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=generate-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            content_types: [selectedType.id],
            tenant_id: tenantId,
            author_id: user?.id || "",
            property_id: propertyId || null,
            property_images: propertyImages,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Erro na geração");

      const newResults = json.data.results || [];
      setResults(newResults);
      setCurrentStep("preview");
      sonnerToast({ title: "Conteúdo gerado!", description: `${newResults.length} resultado(s)` });
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
      setCurrentStep("prompt");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (item: GeneratedItem, index: number) => {
    if (!item.prompt) {
      sonnerToast({ title: "Prompt não disponível", variant: "destructive" }); return;
    }
    setLoadingImage(true);

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
        sonnerToast({ title: "Erro ao gerar imagem", description: json.data?.error || json.error || "Quota esgotada - tente mais tarde", variant: "destructive" });
      }
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingImage(false);
    }
  };

  const saveToDatabase = async (item: GeneratedItem, index: number) => {
    if (!tenantId || !user) return;

    try {
      const slugBase = (item.title || prompt || "content").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
      const slug = `${slugBase}-${Date.now()}`;

      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          tenant_id: tenantId,
          author_id: user.id,
          title: item.title || prompt.slice(0, 60),
          slug: slug,
          excerpt: item.text?.slice(0, 200) || item.script?.slice(0, 200) || null,
          content: item.content || item.script || item.text || `<p>${item.title || ""}</p>`,
          cover_image_url: item.imageUrl || null,
          published: false,
        })
        .select("id")
        .single();

      if (error) throw error;
      setSavedIds(prev => new Set([...prev, index]));
      sonnerToast({ title: "Salvo no banco!", description: `Post criado com ID: ${data.id.slice(0, 8)}...` });
    } catch (err: any) {
      sonnerToast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const resetFlow = () => {
    setCurrentStep("property");
    setSelectedType(null);
    setPropertyId("");
    setPropertyImages([]);
    setPrompt("");
    setResults([]);
    setSavedIds(new Set());
    setRenderedTemplates({});
  };

  // Get property details for template rendering
  const getPropertyData = (propId: string) => {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return { title: prompt.slice(0, 60), price: '', city: '', area: '' };
    return {
      title: prop.title,
      price: prop.price,
      city: prop.city,
      area: '',
      code: propId.slice(0, 8).toUpperCase(),
    };
  };

  // Render all templates for a result item
  const renderTemplatesForItem = async (item: GeneratedItem, index: number, imgUrl: string) => {
    if (!imgUrl) return;
    setRenderingTemplates(prev => new Set([...prev, index]));

    try {
      const propData = getPropertyData(propertyId);
      const templates: Record<TemplateId, string> = {} as any;

      // Render all 4 templates in parallel
      const ids: TemplateId[] = ['story', 'post', 'thumb', 'card'];
      await Promise.all(ids.map(async (tid) => {
        try {
          const result = await renderPropertyTemplate({
            templateId: tid,
            propertyImageUrl: imgUrl,
            propertyData: propData,
            logoUrl: logoUrl,
          });
          templates[tid] = result.dataUrl;
        } catch (e) {
          console.error(`Template ${tid} failed:`, e);
        }
      }));

      setRenderedTemplates(prev => ({ ...prev, [index]: templates }));
    } finally {
      setRenderingTemplates(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  // Download a template image
  const downloadTemplate = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
    sonnerToast({ title: "Download iniciado!", description: filename });
  };

  const getTypeInfo = (type: string) => CONTENT_TYPES.find(t => t.id === type);

  // Step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: "property", label: "Imóvel", icon: Home },
      { key: "content_type", label: "Tipo", icon: FileText },
      { key: "prompt", label: "Prompt", icon: PenLine },
      { key: "generating", label: "Gerando", icon: Sparkles },
      { key: "preview", label: "Resultado", icon: Eye },
    ];
    const stepOrder = ["property", "content_type", "prompt", "generating", "preview"] as const;
    const currentIdx = stepOrder.indexOf(currentStep as any);

    return (
      <div className="flex items-center justify-center gap-2 py-4">
        {steps.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isDone ? "bg-green-600 text-white" : isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {idx < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>
    );
  };

  // Property selection card
  const renderPropertyCard = () => (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Selecionar Imóvel (Opcional)</CardTitle>
            <CardDescription>Escolha um imóvel para usar suas fotos como referência na geração</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="">Nenhum — gerar sem referência de imóvel</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>
              {p.title} — {p.city} — R$ {Number(p.price).toLocaleString("pt-BR")}
            </option>
          ))}
        </select>

        {/* Show selected property images */}
        {propertyImages.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> {propertyImages.length} foto(s) do imóvel carregada(s)
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {propertyImages.slice(0, 5).map((url, i) => (
                <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {propertyImages.length > 5 && (
                <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs text-muted-foreground">+{propertyImages.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => setCurrentStep("content_type")} className="gap-2" disabled={properties.length === 0 && !propertyId}>
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Content type selection card
  const renderContentTypeCard = () => (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Tipo de Conteúdo</CardTitle>
            <CardDescription>Escolha o formato do conteúdo que deseja gerar</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CONTENT_TYPES.map(type => (
            <button
              key={type.id}
              type="button"
              onClick={() => { setSelectedType(type); setCurrentStep("prompt"); }}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-center ${
                selectedType?.id === type.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-secondary/30"
              }`}
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
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Prompt input card
  const renderPromptCard = () => (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <PenLine className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Descrever o Conteúdo</CardTitle>
            <CardDescription>
              {selectedType?.desc}
              {propertyImages.length > 0 && (
                <span className="text-green-600 ml-1">• Usando {propertyImages.length} foto(s) do imóvel como referência</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: Apartamento de 3 quartos no Centro de Belo Horizonte, varanda gourmet, próximo ao parque. Gerar conteúdo para story Instagram com dicas de decoração..."
          rows={5}
          className="text-sm"
        />

        {/* Show referenced property preview */}
        {propertyImages.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Fotos do imóvel selecionadas
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {propertyImages.slice(0, 4).map((url, i) => (
                <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-green-200 shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentStep("content_type")} className="gap-1">
            ← Voltar
          </Button>
          <Button
            onClick={generateAll}
            disabled={!prompt.trim() || loading}
            className="gap-2 px-6"
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Gerando..." : "Gerar Conteúdo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Generating card
  const renderGeneratingCard = () => (
    <Card className="border-2 border-primary/20">
      <CardContent className="py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div>
          <p className="font-semibold text-lg">Gerando conteúdo...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Criando {selectedType?.label} com IA usando {selectedType?.steps.length} etapas
          </p>
        </div>
        {selectedType && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {selectedType.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                </div>
                <span>{step}</span>
                {i < selectedType.steps.length - 1 && <ChevronRight className="h-3 w-3" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Results card
  const renderResultsCard = () => (
    <div className="space-y-4">
      {/* Success banner */}
      <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800 flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800 dark:text-green-400">Conteúdo gerado com sucesso!</p>
          <p className="text-sm text-green-600/80">{results.length} resultado(s) com template pronto para download</p>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {results.map((item, idx) => {
          const typeInfo = getTypeInfo(item.type);
          const isSaved = savedIds.has(idx);
          const itemTemplates = renderedTemplates[idx] || {};
          const isRendering = renderingTemplates.has(idx);

          return (
            <Card key={idx} className="overflow-hidden border-2 border-green-200 dark:border-green-900">
              <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {typeInfo && (
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${typeInfo.color} flex items-center justify-center`}>
                        <typeInfo.icon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">{typeInfo?.label || item.type}</Badge>
                    {isSaved && <Badge className="text-xs bg-green-600">Salvo ✓</Badge>}
                    {isRendering && (
                      <Badge className="text-xs bg-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" /> Templates
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                {/* Title */}
                {item.title && <p className="font-semibold text-sm">{item.title}</p>}

                {/* Image preview */}
                {item.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border bg-secondary">
                    <img src={item.imageUrl} alt="" className="w-full h-40 object-cover" />
                  </div>
                )}

                {/* Template rendering trigger */}
                {item.imageUrl && !itemTemplates['story'] && !isRendering && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => renderTemplatesForItem(item, idx, item.imageUrl!)}
                    className="gap-2 w-full"
                  >
                    <LayoutTemplate className="h-4 w-4" />
                    Aplicar Templates Profissionais
                  </Button>
                )}

                {/* Template previews */}
                {itemTemplates['story'] && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Templates Prontos</span>
                    </div>

                    {/* Template tabs */}
                    <Tabs defaultValue="story" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 h-8">
                        {TEMPLATE_OPTIONS.map(t => (
                          <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="text-[10px] gap-1 h-7 px-1"
                            onClick={() => setSelectedTemplate(t.id)}
                          >
                            <t.icon className="h-3 w-3" />
                            {t.label.split(' ')[0]}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {TEMPLATE_OPTIONS.map(t => (
                        <TabsContent key={t.id} value={t.id} className="space-y-2">
                          {itemTemplates[t.id] ? (
                            <>
                              {/* Template preview */}
                              <div className="rounded-lg overflow-hidden border-2 border-primary/30 bg-muted">
                                <img
                                  src={itemTemplates[t.id]}
                                  alt={`Template ${t.label}`}
                                  className="w-full object-contain"
                                  style={{ maxHeight: '320px' }}
                                />
                              </div>
                              {/* Download button */}
                              <Button
                                variant="default"
                                size="sm"
                                className="gap-2 w-full"
                                onClick={() => {
                                  const titleSlug = (item.title || 'content').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
                                  downloadTemplate(itemTemplates[t.id], `arruda-imobi-${t.id}-${titleSlug}.png`);
                                }}
                              >
                                <Download className="h-4 w-4" />
                                Baixar {t.label} ({t.dims})
                              </Button>
                            </>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border h-32 bg-secondary/50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}

                {/* Hashtags */}
                {item.hashtags && item.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.hashtags.slice(0, 6).map((tag, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1 border-t">
                  {!item.imageUrl && item.prompt && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => generateImage(item, idx)}
                      disabled={loadingImage}
                      className="gap-1.5 flex-1"
                    >
                      {loadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                      Gerar Imagem
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveToDatabase(item, idx)}
                    className="gap-1.5 text-green-600"
                  >
                    <Save className="h-3 w-3" /> Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center pt-4">
        <Button variant="outline" onClick={resetFlow} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Novo Conteúdo
        </Button>
        <Button onClick={() => { setCurrentStep("prompt"); }} className="gap-2">
          <PenLine className="h-4 w-4" /> Alterar Prompt
        </Button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Gerador de Conteúdo IA"
          subtitle="Gere conteúdo profissional para blog, Instagram e YouTube usando IA. Selecione um imóvel para usar suas fotos como referência."
        />

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Flow cards */}
        <div className="space-y-4">
          {currentStep === "property" && renderPropertyCard()}
          {currentStep === "content_type" && renderContentTypeCard()}
          {currentStep === "prompt" && renderPromptCard()}
          {currentStep === "generating" && renderGeneratingCard()}
          {currentStep === "preview" && renderResultsCard()}
        </div>
      </AdminPageShell>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview do Conteúdo
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
                <div>
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <p className="font-display font-semibold">{previewItem.title}</p>
                </div>
              )}
              {previewItem.text && (
                <div>
                  <Label className="text-xs text-muted-foreground">Texto</Label>
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.text}</div>
                </div>
              )}
              {previewItem.script && (
                <div>
                  <Label className="text-xs text-muted-foreground">Roteiro</Label>
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.script}</div>
                </div>
              )}
              {previewItem.captions && previewItem.captions.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Captions</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {previewItem.captions.map((cap, i) => (
                      <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm">{cap}</div>
                    ))}
                  </div>
                </div>
              )}
              {previewItem.hashtags && (
                <div>
                  <Label className="text-xs text-muted-foreground">Hashtags</Label>
                  <p className="text-sm">{previewItem.hashtags.map(t => `#${t}`).join(" ")}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
                {previewItem.text && (
                  <Button variant="default" onClick={() => { copyText(previewItem.text); sonnerToast({ title: "Copiado!" }); }} className="gap-1.5">
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