/**
 * AdminContentGenerator — Content Hub
 * Complete AI content generation for real estate.
 * Uses: MiniMax (image/video/audio/music) + OmniRoute (LLM) + Canvas Templates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sonnerToast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { renderPropertyTemplate, type TemplateId, type TemplateResult } from "./templateRenderer";
import {
  Sparkles, ImageIcon, FileText, Video, Music, Mic,   Mic, Loader2, Copy,
  Instagram, Youtube, Facebook, MessageCircle, Globe, LayoutTemplate,
  RefreshCw, CheckCircle2, Home, PenLine, Eye, Save, Download,
  Trash2, Clock, BarChart3, Wand2, Volume2, Film, Image, ChevronRight,
  AlertCircle, Play, Pause, SkipForward, FileImage
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { id: "blog_post",          label: "Post de Blog",         icon: FileText,     color: "from-blue-500 to-indigo-600",   desc: "Artigo SEO com título, corpo e tags",       media: "texto+imagem" },
  { id: "social_post",         label: "Post Redes",            icon: Instagram,    color: "from-pink-500 via-rose-500",     desc: "Caption para Instagram/Facebook/WhatsApp",  media: "texto+imagem" },
  { id: "story",               label: "Story / Carrossel",    icon: Instagram,    color: "from-purple-500 to-pink-500",   desc: "Carrossel 1080×1920 para Instagram",        media: "texto+imagens" },
  { id: "video_script",         label: "Roteiro de Vídeo",     icon: Film,         color: "from-orange-500 to-red-500",    desc: "Script + vídeo gerado com IA",              media: "texto+vídeo" },
  { id: "voiceover",            label: "Narração (TTS)",       icon: Volume2,      color: "from-cyan-500 to-blue-600",      desc: "Locução profissional MiniMax TTS",          media: "áudio" },
  { id: "music",                label: "Música de Fundo",       icon: Music,        color: "from-violet-500 to-purple-600",  desc: "Música original para vídeos",              media: "áudio" },
  { id: "property_description",  label: "Descrição Imóvel",     icon: Home,         color: "from-emerald-500 to-teal-600",  desc: "Descrição curta e persuasiva",              media: "texto+imagem" },
  { id: "ad_copy",              label: "Copy para Anúncio",    icon: BarChart3,    color: "from-amber-500 to-orange-500",  desc: "Headlines e CTA para Meta Ads",            media: "texto+imagem" },
] as const;

const TONES = [
  { id: "professional", label: "Profissional", emoji: "💼", desc: "Descrição técnica clara e dados objetivos" },
  { id: "luxury",       label: "Luxo",        emoji: "🏆", desc: "Exclusivo, sofisticado, privilegiados" },
  { id: "family",        label: "Familiar",     emoji: "👨‍👩‍👧", desc: "Espaçoso, seguro, comunidade" },
  { id: "urgent",       label: "Urgente",       emoji: "⚡", desc: "Escassez, oportunidade única, última chance" },
  { id: "modern",       label: "Moderno",       emoji: "✨", desc: "Minimalista, clean, contemporâneo" },
] as const;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "facebook",  label: "Facebook",  icon: Facebook,  color: "text-blue-600" },
  { id: "youtube",    label: "YouTube",   icon: Youtube,   color: "text-red-600" },
  { id: "whatsapp",  label: "WhatsApp",  icon: MessageCircle, color: "text-green-500" },
  { id: "blog",      label: "Blog",       icon: Globe,     color: "text-gray-600" },
  { id: "all",       label: "Todos",      icon: Globe,     color: "text-purple-500" },
] as const;

const VOICES = [
  { id: "female_br", label: "Natalia (BR Feminino)", desc: "Clara e envolvente" },
  { id: "male_br",   label: "Jair (BR Masculino)",  desc: "Confiável e profissional" },
  { id: "male_qn",   label: "Qingse (Masculino)",   desc: "Jovem e dinâmico" },
  { id: "female_qn", label: "Jingxing (Feminino)",  desc: "Suave e elegante" },
] as const;

const TEMPLATE_OPTIONS: { id: TemplateId; label: string; dims: string; icon: any }[] = [
  { id: "story",  label: "Story",   dims: "1080×1920", icon: Instagram },
  { id: "post",   label: "Post",    dims: "1200×628",  icon: FileText  },
  { id: "thumb",  label: "Thumb",   dims: "1280×720",  icon: Youtube   },
  { id: "card",   label: "Card",    dims: "1080×1080", icon: ImageIcon },
];

// ─── Types ────────────────────────────────────────────────────────────

interface PropertyInfo {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  price: number;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  area?: number;
  images: string[];
  amenities?: string[];
}

interface GeneratedItem {
  type: string;
  title?: string;
  text?: string;
  content?: string;
  imageUrl?: string;
  imageUrlWithLogo?: string;
  videoUrl?: string;
  audioUrl?: string;
  musicUrl?: string;
  script?: string;
  hashtags?: string[];
  captions?: string[];
  slides?: { heading: string; body: string; imagePrompt?: string }[];
  slideImages?: string[];
  prompt?: string;
  headline1?: string;
  headline2?: string;
  description?: string;
  cta?: string;
  duration?: number;
  // Template rendering
  templateUrls?: Partial<Record<TemplateId, string>>;
  templatesRendering?: boolean;
}

interface HistoryItem {
  id: string;
  content_type: string;
  tone: string;
  target_platform: string;
  title: string;
  body_text: string;
  image_url: string;
  video_url: string;
  audio_url: string;
  music_url: string;
  provider: string;
  status: string;
  created_at: string;
}

// ─── Utility functions ──────────────────────────────────────────────

async function compositeImageWithLogo(imageUrl: string, logoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new window.Image(); const logo = new window.Image();
    let done = 0;
    const check = () => { if (++done === 2) {
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const maxH = Math.round(img.height * 0.15), ratio = maxH / logo.height;
      const lw = Math.round(logo.width * ratio), lh = maxH;
      const pad = Math.round(img.width * 0.025);
      ctx.drawImage(logo, img.width - lw - pad, img.height - lh - pad, lw, lh);
      resolve(canvas.toDataURL("image/png"));
    }};
    img.crossOrigin = "anonymous"; logo.crossOrigin = "anonymous";
    img.onload = check; logo.onload = check;
    img.onerror = () => { done++; check(); }; logo.onerror = () => { done++; check(); };
    img.src = imageUrl; logo.src = logoUrl;
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename; a.click();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Audio Player Component ──────────────────────────────────────────

function AudioPlayer({ src, label }: { src: string; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  return (
    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
      <Button size="sm" variant="ghost" onClick={() => { ref.current?.play(); setPlaying(true); }} className="shrink-0 w-9 h-9 rounded-full">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label || "Áudio"}</p>
        <audio ref={ref} src={src} onEnded={() => setPlaying(false)} />
      </div>
    </div>
  );
}

// ─── Template Gallery Component ──────────────────────────────────────

function TemplateGallery({
  imageUrl,
  propertyData,
  logoUrl,
  onTemplatesReady,
}: {
  imageUrl: string;
  propertyData: PropertyData;
  logoUrl: string | null;
  onTemplatesReady: (urls: Partial<Record<TemplateId, string>>) => void;
}) {
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState<Partial<Record<TemplateId, string>>>({});
  const [activeTab, setActiveTab] = useState<TemplateId>("story");

  const renderAll = async () => {
    if (!imageUrl) return;
    setRendering(true);
    const pd = { title: propertyData.title, price: propertyData.price, city: propertyData.city,
      area: propertyData.area, bedrooms: propertyData.bedrooms };
    const results: Partial<Record<TemplateId, string>> = {};
    try {
      for (const tid of ["story", "post", "thumb", "card"] as TemplateId[]) {
        const res = await renderPropertyTemplate({ templateId: tid, propertyImageUrl: imageUrl, propertyData: pd, logoUrl });
        results[tid] = res.dataUrl;
        setRendered(prev => ({ ...prev, [tid]: res.dataUrl }));
      }
      onTemplatesReady(results);
    } finally {
      setRendering(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <LayoutTemplate className="h-3 w-3" /> Templates Profissionais (Canvas API)
        </Label>
        {!rendered.story && (
          <Button size="sm" variant="outline" onClick={renderAll} disabled={rendering} className="gap-1.5 h-7 text-xs">
            {rendering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            {rendering ? "Gerando..." : "Gerar Templates"}
          </Button>
        )}
        {rendered.story && (
          <Badge className="bg-green-600 text-white text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" /> 4 templates prontos
          </Badge>
        )}
      </div>

      {rendered.story && (
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateId)}>
            <TabsList className="grid grid-cols-4 h-8">
              {TEMPLATE_OPTIONS.map(t => (
                <TabsTrigger key={t.id} value={t.id} className="text-[10px] gap-1 h-7">
                  <t.icon className="h-3 w-3" />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TEMPLATE_OPTIONS.map(t => (
              <TabsContent key={t.id} value={t.id} className="space-y-2">
                {rendered[t.id] ? (
                  <>
                    <div className="rounded-lg overflow-hidden border-2 border-primary/20 bg-muted">
                      <img src={rendered[t.id]} alt={t.label} className="w-full object-contain" style={{ maxHeight: "320px" }} />
                    </div>
                    <Button size="sm" variant="default" onClick={() => {
                      const slug = propertyData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
                      downloadDataUrl(rendered[t.id]!, `arruda-imobi-${t.id}-${slug}.png`);
                      sonnerToast({ title: "Download iniciado!" });
                    }} className="gap-1.5 w-full">
                      <Download className="h-3 w-3" /> Baixar {t.label} ({t.dims})
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border h-32 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function AdminContentGenerator() {
  const { tenantId, user } = useAuth();

  // ── State ──
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [properties, setProperties] = useState<{ id: string; title: string; city: string; price: number }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyData, setPropertyData] = useState<PropertyInfo | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);

  // Config
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["blog_post", "social_post"]);
  const [tone, setTone] = useState<string>("professional");
  const [platform, setPlatform] = useState<string>("instagram");
  const [voiceId, setVoiceId] = useState<string>("female_br");
  const [customPrompt, setCustomPrompt] = useState("");

  // Generation
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<GeneratedItem | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState<Record<number, boolean>>({});
  const [genTime, setGenTime] = useState<number>(0);
  const [provider, setProvider] = useState<string>("");

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Load properties ──
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("properties").select("id, title, city, price")
      .eq("tenant_id", tenantId).eq("status", "available")
      .order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => { if (data) setProperties(data); });
  }, [tenantId]);

  // ── Load tenant logo ──
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("visual_identity").select("logo_url").eq("tenant_id", tenantId).maybeSingle()
      .then(({ data }) => { if (data?.logo_url) setLogoUrl(data.logo_url); });
  }, [tenantId]);

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    if (!tenantId) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_generations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setHistory((data || []) as HistoryItem[]);
    } catch (err: any) {
      sonnerToast({ title: "Erro ao carregar histórico", description: err.message, variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, loadHistory]);

  // ── Property selection ──
  useEffect(() => {
    if (!selectedPropertyId) { setPropertyData(null); return; }
    setPropertyLoading(true);
    supabase.from("properties").select("*, property_images(url, display_order)")
      .eq("id", selectedPropertyId).single()
      .then(({ data, error }) => {
        setPropertyLoading(false);
        if (error || !data) return;
        const sortedImages = (data.property_images || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((i: any) => i.url).filter(Boolean);
        setPropertyData({
          id: data.id, title: data.title || "", description: data.description || "",
          city: data.city || "", state: data.state || "", price: data.price || 0,
          type: data.type || "", bedrooms: data.bedrooms, bathrooms: data.bathrooms,
          garages: data.garages, area: data.area || data.area_usable,
          images: sortedImages, amenities: data.amenities || [],
        });
        if (!customPrompt.trim()) {
          const parts: string[] = [];
          if (data.title) parts.push(data.title);
          if (data.description) parts.push(data.description);
          if (data.city || data.state) parts.push(`📍 ${[data.city, data.state].filter(Boolean).join(", ")}`);
          if (data.price) parts.push(`💰 R$ ${Number(data.price).toLocaleString("pt-BR")}`);
          if (data.bedrooms) parts.push(`🛏 ${data.bedrooms} quarto(s)`);
          if (data.bathrooms) parts.push(`🛁 ${data.bathrooms} banheiro(s)`);
          if (data.area) parts.push(`📐 ${data.area}m²`);
          setCustomPrompt(parts.join("\n"));
        }
      });
  }, [selectedPropertyId]);

  // ── Toggle content type ──
  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // ── Main generation ──
  const triggerGenerate = async () => {
    if (!selectedTypes.length) {
      sonnerToast({ title: "Selecione ao menos um tipo de conteúdo", variant: "destructive" }); return;
    }
    if (!customPrompt.trim() && !propertyData?.description) {
      sonnerToast({ title: "Informe um prompt ou selecione um imóvel com descrição", variant: "destructive" }); return;
    }

    setLoading(true); setResults([]); setSavedIds(new Set());

    const session = (await supabase.auth.getSession()).data.session;

    try {
      const finalPrompt = customPrompt.trim() || propertyData?.description || "";
      const propertyPayload = propertyData ? {
        title: propertyData.title,
        description: propertyData.description,
        city: propertyData.city,
        state: propertyData.state,
        price: propertyData.price,
        type: propertyData.type,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        garages: propertyData.garages,
        area: propertyData.area,
        amenities: propertyData.amenities,
      } : undefined;

      const res = await fetch("https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/content-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({
          action: "generate",
          tenant_id: tenantId,
          author_id: user?.id,
          property_id: selectedPropertyId || null,
          property: propertyPayload,
          property_images: propertyData?.images || [],
          content_types: selectedTypes,
          tone,
          platform,
          voice_id: voiceId,
          custom_prompt: finalPrompt,
          save_to_db: true,
        }),
      });

      const json = await res.json();
      if (!json.ok && json.error) {
        sonnerToast({ title: "Erro na geração", description: json.error, variant: "destructive" });
        setLoading(false); return;
      }

      // Patch: for blog_post with no image, use property image
      const patched = (json.data?.results || []).map((item: GeneratedItem, i: number) => {
        if ((item.type === "blog_post" || item.type === "social_post") && !item.imageUrl && propertyData?.images?.length) {
          return { ...item, imageUrl: propertyData.images[0] };
        }
        return item;
      });

      setResults(patched);
      setGenTime(json.data?.timeMs || 0);
      setProvider(json.data?.provider || "minimax+omniroute");
      sonnerToast({ title: "Conteúdo gerado!", description: `${patched.length} resultado(s) em ${((json.data?.timeMs || 0) / 1000).toFixed(1)}s` });
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Save to blog ──
  const saveToBlog = async (item: GeneratedItem, idx: number) => {
    if (!tenantId || !user) return;
    try {
      const slugBase = (item.title || customPrompt || "content").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
      const slug = `${slugBase}-${Date.now()}`;
      let finalImageUrl: string | null = item.imageUrlWithLogo || item.imageUrl || null;
      if (finalImageUrl?.startsWith("data:")) {
        const buf = Uint8Array.from(atob(finalImageUrl.split(",")[1]), (c: number) => c.charCodeAt(0));
        const path = `blog-covers/${tenantId}/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from("blog-covers").upload(path, buf, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("blog-covers").getPublicUrl(path);
        finalImageUrl = urlData.publicUrl;
      }
      const { data, error } = await supabase.from("blog_posts").insert({
        tenant_id: tenantId, author_id: user.id,
        title: item.title || customPrompt.slice(0, 60),
        slug,
        excerpt: item.text?.slice(0, 200) || item.script?.slice(0, 200) || null,
        content: item.content || item.script || item.text || `<p>${item.title || ""}</p>`,
        cover_image_url: finalImageUrl, published: false,
      }).select("id").single();
      if (error) throw error;
      setSavedIds(prev => new Set([...prev, idx]));
      sonnerToast({ title: "Salvo no blog!", description: `ID: ${data.id.slice(0, 8)}...` });
    } catch (err: any) {
      sonnerToast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  // ── Reset ──
  const resetFlow = () => {
    setSelectedPropertyId(""); setPropertyData(null); setCustomPrompt("");
    setSelectedTypes(["blog_post", "social_post"]); setTone("professional");
    setPlatform("instagram"); setResults([]); setSavedIds(new Set());
  };

  const typeInfo = (id: string) => CONTENT_TYPES.find(t => t.id === id);

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Gerador de Conteúdo IA"
          subtitle={`MiniMax + OmniRoute — texto, imagem, vídeo, áudio e música para imobiliária`}
          action={
            <div className="flex items-center gap-2">
              {genTime > 0 && !loading && results.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" /> {(genTime / 1000).toFixed(1)}s • {provider}
                </Badge>
              )}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="inline-flex">
                <TabsList className="h-9">
                  <TabsTrigger value="create" className="gap-1 text-xs h-8 px-3"><Wand2 className="h-3 w-3" /> Criar</TabsTrigger>
                  <TabsTrigger value="history" className="gap-1 text-xs h-8 px-3"><Clock className="h-3 w-3" /> Histórico</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          }
        />

        {/* ── CREATE TAB ── */}
        <TabsContent value="create" className="space-y-5 mt-0">
          {/* Step 1: Property Selection */}
          <Card className={`border-2 transition-colors ${propertyData ? "border-green-300 dark:border-green-700" : "border-border"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Selecionar Imóvel (Opcional)</CardTitle>
                  <CardDescription>Escolha um imóvel para usar sua descrição e fotos como referência.</CardDescription>
                </div>
                {propertyData && (
                  <Badge className="ml-auto bg-green-600 text-white shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> {propertyData.images.length} foto(s)
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedPropertyId}
                onChange={e => { setSelectedPropertyId(e.target.value); if (!e.target.value) setPropertyData(null); }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Nenhum — gerar sem referência de imóvel</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} — {p.city} — R$ {Number(p.price).toLocaleString("pt-BR")}</option>
                ))}
              </select>

              {propertyLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando imóvel...
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
                    <p className="text-sm bg-white/50 dark:bg-black/20 rounded-lg p-2 max-h-24 overflow-y-auto">
                      {propertyData.description.slice(0, 300)}{propertyData.description.length > 300 ? "..." : ""}
                    </p>
                  )}
                  {propertyData.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {propertyData.images.slice(0, 8).map((url, i) => (
                        <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-green-300 shrink-0">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {propertyData.images.length > 8 && (
                        <div className="w-14 h-14 rounded-lg border border-green-300 bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                          <span className="text-xs text-green-700 dark:text-green-400">+{propertyData.images.length - 8}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Content Types */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Tipos de Conteúdo</CardTitle>
                  <CardDescription>Selecione um ou mais tipos para gerar simultaneamente.</CardDescription>
                </div>
                <Badge className="ml-auto shrink-0 bg-violet-600 text-white">{selectedTypes.length} selecionado(s)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONTENT_TYPES.map(ct => {
                  const selected = selectedTypes.includes(ct.id);
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => toggleType(ct.id)}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-center ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-secondary/30"}`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ct.color} flex items-center justify-center`}>
                        <ct.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold leading-tight">{ct.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{ct.media}</span>
                      {selected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Tone + Platform + Voice */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tone */}
            <Card className="border-2 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-xl">🎨</span> Tom / Estilo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${tone === t.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                    {tone === t.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Platform */}
            <Card className="border-2 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-xl">📱</span> Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${platform === p.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                  >
                    <p.icon className={`h-4 w-4 ${p.color} shrink-0`} />
                    <span className="text-sm font-medium">{p.label}</span>
                    {platform === p.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Voice */}
            <Card className="border-2 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mic className="h-4 w-4" /> Voz TTS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {VOICES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${voiceId === v.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                  >
                    <Mic2 className="h-4 w-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{v.label}</p>
                      <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                    </div>
                    {voiceId === v.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Step 4: Prompt */}
          <Card className="border-2 border-purple-200 dark:border-purple-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                  <PenLine className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Prompt / Descrição</CardTitle>
                  <CardDescription>
                    {propertyData?.description ? "Descrição do imóvel carregada automaticamente." : "Descreva o conteúdo que deseja gerar."}
                    {selectedTypes.length > 0 && <span className="text-primary ml-1">• {selectedTypes.map(t => typeInfo(t)?.label).filter(Boolean).join(", ")}</span>}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Ex: Apartamento de luxo no Centro de Belo Horizonte, 3 suítes, varanda gourmet com vista panorâmica. Tom sofisticado..."
                rows={5}
                className="text-sm"
              />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Button variant="outline" onClick={resetFlow} className="gap-1.5" size="sm">
                  <RefreshCw className="h-3 w-3" /> Limpar Tudo
                </Button>
                <Button
                  onClick={triggerGenerate}
                  disabled={loading || !selectedTypes.length}
                  size="lg"
                  className="gap-2 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? `Gerando ${selectedTypes.length} tipo(s)...` : `Gerar ${selectedTypes.length} Tipo(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <Card className="border-2 border-primary/20">
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Gerando conteúdo com IA...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    MiniMax (imagem/vídeo/áudio/música) + OmniRoute (texto) — {selectedTypes.length} tipo(s)
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {selectedTypes.map(t => {
                    const info = typeInfo(t);
                    return (
                      <Badge key={t} variant="outline" className="gap-1">
                        {info && <info.icon className="h-3 w-3" />}
                        {info?.label || t}
                      </Badge>
                    );
                  })}
                </div>
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
                  <p className="text-sm text-green-600/80">{results.length} resultado(s) pronto(s)</p>
                </div>
                {genTime > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    <Clock className="h-3 w-3 mr-1" />{(genTime / 1000).toFixed(1)}s
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {results.map((item, idx) => {
                  const info = typeInfo(item.type);
                  const isSaved = savedIds.has(idx);
                  return (
                    <Card key={idx} className="overflow-hidden border-2 border-green-200 dark:border-green-900">
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {info && (
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center`}>
                                <info.icon className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">{info?.label || item.type}</Badge>
                            {isSaved && <Badge className="text-xs bg-green-600">Salvo ✓</Badge>}
                            {item.imageUrl && <Badge className="text-xs bg-blue-600 gap-1"><ImageIcon className="h-3 w-3" /> Imagem</Badge>}
                            {item.videoUrl && <Badge className="text-xs bg-orange-600 gap-1"><Film className="h-3 w-3" /> Vídeo</Badge>}
                            {item.audioUrl && <Badge className="text-xs bg-cyan-600 gap-1"><Volume2 className="h-3 w-3" /> TTS</Badge>}
                            {item.musicUrl && <Badge className="text-xs bg-violet-600 gap-1"><Music className="h-3 w-3" /> Música</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Title */}
                        {item.title && (
                          <p className="font-semibold text-sm line-clamp-2">{item.title}</p>
                        )}

                        {/* Image Preview */}
                        {(item.imageUrlWithLogo || item.imageUrl) && (
                          <div className="rounded-lg overflow-hidden border border-border">
                            <div className="relative">
                              <img src={item.imageUrlWithLogo || item.imageUrl} alt="" className="w-full h-40 object-cover" />
                              <div className="absolute top-2 left-2">
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0 gap-1">
                                  <ImageIcon className="h-2.5 w-2.5" />
                                  {item.imageUrlWithLogo ? "Com logo" : "IA"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Video Preview */}
                        {item.videoUrl && !item.imageUrl && (
                          <div className="rounded-lg overflow-hidden border border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                            <video src={item.videoUrl} controls className="w-full h-40 object-cover" />
                          </div>
                        )}

                        {/* TTS Audio Player */}
                        {item.audioUrl && (
                          <AudioPlayer src={item.audioUrl} label={`Narração: ${item.title || item.type}`} />
                        )}

                        {/* Music */}
                        {item.musicUrl && (
                          <AudioPlayer src={item.musicUrl} label={`Música: ${item.title || "Track"}`} />
                        )}

                        {/* Script */}
                        {item.script && (
                          <div>
                            <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                              <Film className="h-3 w-3" /> Roteiro
                            </Label>
                            <p className="text-xs bg-muted/50 rounded-lg p-2 max-h-28 overflow-y-auto line-clamp-5">{item.script}</p>
                          </div>
                        )}

                        {/* Text */}
                        {item.text && !item.script && (
                          <p className="text-xs text-muted-foreground line-clamp-4">{item.text}</p>
                        )}

                        {/* Hashtags */}
                        {item.hashtags && item.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.hashtags.slice(0, 6).map((tag, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">#{tag}</span>
                            ))}
                          </div>
                        )}

                        {/* Ad Copy */}
                        {(item.headline1 || item.headline2) && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 space-y-1">
                            {item.headline1 && <p className="text-xs font-semibold">H1: {item.headline1}</p>}
                            {item.headline2 && <p className="text-xs">H2: {item.headline2}</p>}
                            {item.cta && <Badge className="text-xs bg-amber-600">{item.cta}</Badge>}
                          </div>
                        )}

                        {/* Templates Gallery */}
                        {(item.imageUrl || item.imageUrlWithLogo) && propertyData && (
                          <TemplateGallery
                            imageUrl={item.imageUrlWithLogo || item.imageUrl!}
                            propertyData={{
                              title: propertyData.title,
                              price: propertyData.price,
                              city: propertyData.city,
                              area: propertyData.area,
                              bedrooms: propertyData.bedrooms,
                            }}
                            logoUrl={logoUrl}
                            onTemplatesReady={(urls) => {
                              setResults(prev => prev.map((r, i) => i === idx ? { ...r, ...urls } as GeneratedItem : r));
                            }}
                          />
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t flex-wrap">
                          {/* Regenerate image */}
                          {item.prompt && (
                            <Button variant="outline" size="sm" onClick={async () => {
                              setResults(prev => prev.map((r, i) => i === idx ? { ...r, imageUrl: undefined, imageUrlWithLogo: undefined } as GeneratedItem : r));
                              setTimeout(() => triggerGenerate(), 50);
                            }} className="gap-1.5 text-xs h-8">
                              <RefreshCw className="h-3 w-3" /> Regenerar
                            </Button>
                          )}
                          {/* Add logo */}
                          {logoUrl && (item.imageUrl || item.imageUrlWithLogo) && !item.imageUrlWithLogo && (
                            <Button
                              variant="secondary" size="sm"
                              onClick={async () => {
                                setLogoLoading(prev => ({ ...prev, [idx]: true }));
                                try {
                                  const src = item.imageUrl!;
                                  const composited = await compositeImageWithLogo(src, logoUrl);
                                  setResults(prev => prev.map((r, i) => i === idx ? { ...r, imageUrlWithLogo: composited } as GeneratedItem : r));
                                  sonnerToast({ title: "Logo adicionado!" });
                                } catch { sonnerToast({ title: "Erro ao adicionar logo", variant: "destructive" }); }
                                finally { setLogoLoading(prev => ({ ...prev, [idx]: false })); }
                              }}
                              disabled={!!logoLoading[idx]}
                              className="gap-1.5 text-xs h-8"
                            >
                              {logoLoading[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileImage className="h-3 w-3" />}
                              {logoLoading[idx] ? "Aplicando..." : "Add Logo"}
                            </Button>
                          )}
                          {/* Logo applied */}
                          {item.imageUrlWithLogo && (
                            <Badge className="text-xs gap-1 bg-green-600 text-white">
                              <CheckCircle2 className="h-3 w-3" /> Logo OK
                            </Badge>
                          )}
                          {/* Copy text */}
                          {item.text && (
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(item.text || ""); sonnerToast({ title: "Copiado!" }); }} className="gap-1.5 text-xs h-8">
                              <Copy className="h-3 w-3" /> Copiar
                            </Button>
                          )}
                          {/* Save to blog */}
                          <Button
                            variant="outline" size="sm"
                            onClick={() => saveToBlog(item, idx)}
                            className="gap-1.5 text-xs h-8 text-green-600 ml-auto"
                          >
                            <Save className="h-3 w-3" /> Salvar Blog
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* New generation */}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetFlow} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Novo Conteúdo
                </Button>
                <Button onClick={triggerGenerate} disabled={loading} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Gerar Novamente
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="mt-0">
          <Card className="border-2 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Gerações</CardTitle>
                  <CardDescription>Todas as gerações salvas no banco de dados.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadHistory} className="gap-1.5">
                  <RefreshCw className="h-3 w-3" /> Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> Carregando...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma geração ainda</p>
                  <p className="text-sm">Gere conteúdo na aba "Criar" para começar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(item => {
                    const info = typeInfo(item.content_type);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        {info && (
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0`}>
                            <info.icon className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title || item.content_type}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{item.content_type}</Badge>
                            <span>{item.tone}</span>
                            {item.image_url && <ImageIcon className="h-3 w-3 text-blue-500" />}
                            {item.video_url && <Film className="h-3 w-3 text-orange-500" />}
                            {item.audio_url && <Volume2 className="h-3 w-3 text-cyan-500" />}
                            {item.music_url && <Music className="h-3 w-3 text-violet-500" />}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                          <Badge className={`text-[10px] mt-1 ${item.status === "success" ? "bg-green-600" : "bg-red-600"}`}>
                            {item.status}
                          </Badge>
                        </div>
                        {item.image_url && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
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
                  <img src={previewItem.imageUrlWithLogo || previewItem.imageUrl} alt="" className="w-full" />
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
              {previewItem.captions?.length ? (
                <div><Label className="text-xs text-muted-foreground">Captions</Label><div className="space-y-2 max-h-40 overflow-y-auto">{previewItem.captions.map((c, i) => <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm">{c}</div>)}</div></div>
              ) : null}
              {previewItem.hashtags?.length ? (
                <div><Label className="text-xs text-muted-foreground">Hashtags</Label><p className="text-sm">{previewItem.hashtags.map(t => `#${t}`).join(" ")}</p></div>
              ) : null}
              {previewItem.audioUrl && <AudioPlayer src={previewItem.audioUrl} label="Narração" />}
              {previewItem.videoUrl && <video src={previewItem.videoUrl} controls className="w-full rounded-lg" />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
                {previewItem.text && (
                  <Button onClick={() => { navigator.clipboard.writeText(previewItem.text || ""); sonnerToast({ title: "Copiado!" }); }} className="gap-1.5">
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
