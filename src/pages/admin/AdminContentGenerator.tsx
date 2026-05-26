/**
 * AdminContentGenerator — Content Hub v2
 * AI Content Generation for Real Estate
 * Stack: OmniRoute (LLM) + MiniMax AI (images) + Canvas Templates + Browser TTS
 *
 * 4-Step Wizard:
 *  1. Selecionar Imóvel (com fotos)
 *  2. Tipos de Conteúdo + Template
 *  3. Config (tom, plataforma, voz)
 *  4. Resultados + Templates + Download
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
import { renderPropertyTemplate, type TemplateId } from "./templateRenderer";
import {
  Sparkles, ImageIcon, FileText, Video, Music, Loader2, Copy,
  Instagram, Youtube, Facebook, MessageCircle, Globe,
  RefreshCw, CheckCircle2, Home, PenLine, Eye, Save, Download,
  Clock, Wand2, Volume2, Film, Mic, Play, Pause, SkipForward,
  ChevronRight, ChevronLeft, AlertCircle, X, Star, Palette,
  LayoutTemplate, FileImage, Mic2, Upload, SlidersHorizontal, Wand
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { id: "blog_post",          label: "Post de Blog",      icon: FileText,     color: "from-blue-500 to-indigo-600",   desc: "Artigo SEO com título e tags",       media: "texto+imagem" },
  { id: "social_post",         label: "Post para Redes",  icon: Instagram,    color: "from-pink-500 to-rose-500",     desc: "Caption para Instagram/Facebook",     media: "texto+imagem" },
  { id: "story",               label: "Story / Carrossel",icon: Instagram,    color: "from-purple-500 to-pink-500",   desc: "Carrossel 1080×1920",              media: "texto+imagens" },
  { id: "video_script",         label: "Roteiro de Vídeo", icon: Film,         color: "from-orange-500 to-red-500",    desc: "Script + imagens para vídeo",        media: "texto+vídeo" },
  { id: "voiceover",            label: "Narração (TTS)",  icon: Volume2,      color: "from-cyan-500 to-blue-600",     desc: "Locução com voz sintética",          media: "áudio" },
  { id: "music",                label: "Música de Fundo",  icon: Music,        color: "from-violet-500 to-purple-600",  desc: "Trilha sonora para vídeos",          media: "áudio" },
  { id: "property_description",  label: "Descrição Imóvel",icon: Home,         color: "from-emerald-500 to-teal-600",   desc: "Descrição curta e persuasiva",        media: "texto+imagem" },
  { id: "ad_copy",              label: "Copy para Anúncio",icon: Star,         color: "from-amber-500 to-orange-500",   desc: "Headlines para Meta Ads",            media: "texto+imagem" },
] as const;

const TONES = [
  { id: "professional", label: "Profissional", emoji: "💼", desc: "Técnico e confiável" },
  { id: "luxury",       label: "Luxo",          emoji: "🏆", desc: "Sofisticado e exclusivo" },
  { id: "family",       label: "Familiar",       emoji: "👨‍👩‍👧", desc: "Acolhedor para família" },
  { id: "urgent",       label: "Urgente",         emoji: "⚡", desc: "Escassez e oportunidade" },
  { id: "modern",      label: "Moderno",         emoji: "✨", desc: "Clean e contemporâneo" },
] as const;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram,    bg: "bg-gradient-to-br from-pink-500 to-rose-500",  textColor: "text-white" },
  { id: "facebook",  label: "Facebook",  icon: Facebook,    bg: "bg-gradient-to-br from-blue-600 to-blue-700",  textColor: "text-white" },
  { id: "youtube",    label: "YouTube",    icon: Youtube,     bg: "bg-gradient-to-br from-red-600 to-red-700",   textColor: "text-white" },
  { id: "whatsapp",  label: "WhatsApp",   icon: MessageCircle, bg: "bg-gradient-to-br from-green-500 to-green-600", textColor: "text-white" },
  { id: "all",       label: "Todos",       icon: Globe,       bg: "bg-gradient-to-br from-purple-500 to-purple-600", textColor: "text-white" },
] as const;

// Template visual configs (for selector UI)
const TEMPLATES = [
  { id: "story" as TemplateId, label: "Story", dims: "1080×1920", ratio: "9/16", icon: Instagram,
    desc: "Instagram Stories e Reels", color: "#D4A843", bg: "#0A0F1A" },
  { id: "post" as TemplateId,  label: "Post",  dims: "1200×628", ratio: "1.91/1", icon: FileText,
    desc: "Feed Instagram e Facebook", color: "#D4A843", bg: "#1A2B4A" },
  { id: "thumb" as TemplateId, label: "Thumb", dims: "1280×720", ratio: "16/9", icon: Youtube,
    desc: "Thumbnail YouTube", color: "#FF0000", bg: "#0F0F0F" },
  { id: "card" as TemplateId,  label: "Card",  dims: "1080×1080", ratio: "1/1", icon: ImageIcon,
    desc: "Card quadrado para posts", color: "#D4A843", bg: "#2A3B5C" },
] as const;

const VOICES = [
  { id: "pt-BR", label: "Português (BR) — Feminino", voice: "pt-BR", desc: "Clara e profissional", flag: "🇧🇷" },
  { id: "pt-BR-M", label: "Português (BR) — Masculino", voice: "pt-BR", desc: "Locutor brasileiro", flag: "🇧🇷" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────

interface PropertyInfo {
  id: string; title: string; description: string; city: string; state: string;
  price: number; type: string; bedrooms?: number; bathrooms?: number;
  garages?: number; area?: number; images: string[]; amenities?: string[];
}

interface GeneratedItem {
  type: string; title?: string; text?: string; content?: string;
  imageUrl?: string; imageUrlWithLogo?: string; videoUrl?: string;
  audioUrl?: string; musicUrl?: string; script?: string;
  hashtags?: string[]; captions?: string[]; slides?: any[];
  prompt?: string; headline1?: string; headline2?: string;
  cta?: string; duration?: number; musicPrompt?: string;
  templateUrls?: Partial<Record<TemplateId, string>>;
}

interface TenantBrand {
  name: string; logoUrl?: string; primaryColor?: string;
}

// ─── TTS: Browser Web Speech API ──────────────────────────────────────

function useBrowserTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speak = useCallback((text: string, male = false) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Find best Portuguese BR voice
    const allVoices = window.speechSynthesis.getVoices();
    const brVoices = allVoices.filter(v => v.lang.startsWith("pt"));
    const preferred = brVoices.find(v => (male ? v.name.toLowerCase().includes("male") : v.name.toLowerCase().includes("female"))) ||
      brVoices.find(v => v.lang === "pt-BR") || brVoices[0];

    if (preferred) {
      utterance.voice = preferred;
      utterance.lang = preferred.lang;
    } else {
      utterance.lang = "pt-BR";
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, voices };
}

// ─── Audio Player Component ──────────────────────────────────────────

function AudioPlayer({ src, label, onGenerateAudio, script, male }: {
  src?: string; label: string;
  onGenerateAudio?: () => void; script?: string; male?: boolean;
}) {
  const { speak, stop, speaking } = useBrowserTTS();
  const [localSrc, setLocalSrc] = useState(src);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSpeak = () => {
    if (speaking) { stop(); return; }
    if (script) speak(script, male);
  };

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
      <Button
        size="sm" variant="ghost"
        onClick={handleSpeak}
        className="shrink-0 w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20"
      >
        {speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground">
          {speaking ? "🔊 Reproduzindo..." : script ? "🎤 Clique para ouvir" : (localSrc ? "Pronto" : "Gerar para ouvir")}
        </p>
      </div>
      {src && audioRef.current && (
        <audio ref={audioRef} src={localSrc} className="hidden" />
      )}
    </div>
  );
}

// ─── Template Selector Component ────────────────────────────────────

function TemplateSelector({ selected, onSelect }: { selected: TemplateId; onSelect: (id: TemplateId) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {TEMPLATES.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`relative rounded-xl border-2 transition-all overflow-hidden ${
            selected === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
          }`}
        >
          {/* Mini template preview */}
          <div className="aspect-[2/3] flex items-center justify-center relative" style={{ background: t.bg }}>
            <t.icon className="h-8 w-8" style={{ color: t.color }} />
            {/* Format badge */}
            <div className="absolute top-1.5 right-1.5">
              <span className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.5)", color: t.color }}>
                {t.dims.split("×")[0]}
              </span>
            </div>
          </div>
          <div className="p-2 text-center bg-background">
            <p className="text-xs font-semibold">{t.label}</p>
            <p className="text-[10px] text-muted-foreground">{t.dims}</p>
          </div>
          {selected === t.id && (
            <div className="absolute top-1 left-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Template Preview Gallery ─────────────────────────────────────────

function TemplateGallery({ imageUrl, propertyData, logoUrl, brandName }: {
  imageUrl: string; propertyData: any; logoUrl?: string | null; brandName?: string;
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
    } catch (e) { console.error("Template render error:", e); }
    finally { setRendering(false); }
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Templates Profissionais</Label>
        </div>
        {!rendered.story && (
          <Button size="sm" variant="outline" onClick={renderAll} disabled={rendering} className="gap-1.5 h-8">
            {rendering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            {rendering ? "Gerando..." : "Gerar 4 Templates"}
          </Button>
        )}
        {rendered.story && (
          <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />4 prontos</Badge>
        )}
      </div>

      {rendered.story && (
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateId)}>
            <TabsList className="grid w-full grid-cols-4 h-8">
              {TEMPLATES.map(t => (
                <TabsTrigger key={t.id} value={t.id} className="text-[10px] gap-1 h-7">
                  <t.icon className="h-3 w-3" />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TEMPLATES.map(t => (
              <TabsContent key={t.id} value={t.id} className="space-y-2">
                {rendered[t.id] ? (
                  <>
                    <div className="rounded-lg overflow-hidden border-2 border-primary/20 bg-muted">
                      <img src={rendered[t.id]} alt={t.label} className="w-full object-contain" style={{ maxHeight: "300px" }} />
                    </div>
                    <Button size="sm" className="gap-1.5 w-full" onClick={() => {
                      const slug = propertyData.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "content";
                      const a = document.createElement("a");
                      a.href = rendered[t.id]!; a.download = `arruda-imobi-${t.id}-${slug}.png`; a.click();
                      sonnerToast({ title: "Download iniciado!" });
                    }}>
                      <Download className="h-3 w-3" /> Baixar {t.label} {t.dims}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border h-40 flex items-center justify-center">
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

// ─── Step Progress Indicator ─────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: "Imóvel" },
    { n: 2, label: "Tipo" },
    { n: 3, label: "Config" },
    { n: 4, label: "Resultado" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 py-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className={`flex items-center gap-2 ${currentStep === s.n ? "opacity-100" : currentStep > s.n ? "opacity-80" : "opacity-40"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep > s.n ? "bg-green-600 text-white" : currentStep === s.n ? "bg-primary text-white ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
            }`}>
              {currentStep > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${currentStep === s.n ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ─── Property Card ───────────────────────────────────────────────────

function PropertyCard({ property, images, selected, onSelect }: {
  property: { id: string; title: string; city: string; price: number; type: string };
  images: string[]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40 bg-secondary/20"
      }`}
    >
      <div className="flex gap-3">
        {images[0] ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <img src={images[0]} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Home className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{property.title}</p>
          <p className="text-xs text-muted-foreground">{property.city} · {property.type}</p>
          <p className="text-sm font-bold text-primary mt-0.5">
            R$ {Number(property.price).toLocaleString("pt-BR")}
          </p>
          {images.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{images.length} foto(s)</p>
          )}
        </div>
        {selected && (
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function AdminContentGenerator() {
  const { tenantId, user } = useAuth();

  // ── State ──
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<"create" | "history">("create");

  // Step 1
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyData, setPropertyData] = useState<PropertyInfo | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);

  // Step 2
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["blog_post", "social_post"]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("story");

  // Step 3
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("instagram");
  const [voiceMale, setVoiceMale] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Results
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [genTime, setGenTime] = useState(0);

  // Logo/Brand
  const [brand, setBrand] = useState<TenantBrand>({ name: "Arruda Imobi" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState<Record<number, boolean>>({});

  // Img2Img state (FLUX via OmniRoute/Fal.ai)
  const [img2imgOpen, setImg2imgOpen] = useState(false);
  const [img2imgRefImage, setImg2imgRefImage] = useState<string | null>(null); // base64 data URL or property image URL
  const [img2imgPrompt, setImg2imgPrompt] = useState("");
  const [img2imgStrength, setImg2imgStrength] = useState(0.75);
  const [img2imgLoading, setImg2imgLoading] = useState(false);
  const [img2imgResult, setImg2imgResult] = useState<string | null>(null);
  const [img2imgError, setImg2imgError] = useState<string | null>(null);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<GeneratedItem | null>(null);

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Load properties ──
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("properties").select("id, title, city, price, type")
      .eq("tenant_id", tenantId).eq("status", "available")
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setProperties(data); });
  }, [tenantId]);

  // ── Load tenant brand ──
  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      supabase.from("visual_identity").select("logo_url").eq("tenant_id", tenantId).maybeSingle(),
    ]).then(([tenantRes, logoRes]) => {
      if (tenantRes.data?.name) setBrand(prev => ({ ...prev, name: tenantRes.data.name }));
      if (logoRes.data?.logo_url) setLogoUrl(logoRes.data.logo_url);
    });
  }, [tenantId]);

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    if (!tenantId) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_generations").select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setHistoryLoading(false); }
  }, [tenantId]);

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  // ── Load property full data ──
  useEffect(() => {
    if (!selectedPropertyId) { setPropertyData(null); setCustomPrompt(""); return; }
    setPropertyLoading(true);
    supabase.from("properties").select("*, property_images(url, display_order)")
      .eq("id", selectedPropertyId).single()
      .then(({ data, error }) => {
        setPropertyLoading(false);
        if (error || !data) return;
        const imgs = (data.property_images || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((i: any) => i.url).filter(Boolean);
        setPropertyData({ ...data, images: imgs });
        if (!customPrompt.trim()) {
          const parts: string[] = [];
          if (data.title) parts.push(`🏠 ${data.title}`);
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
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (!selectedTypes.length) {
      sonnerToast({ title: "Selecione ao menos um tipo", variant: "destructive" }); return;
    }
    if (!customPrompt.trim() && !propertyData?.description) {
      sonnerToast({ title: "Adicione uma descrição ou selecione um imóvel", variant: "destructive" }); return;
    }

    setLoading(true); setResults([]); setSavedIds(new Set());
    const session = (await supabase.auth.getSession()).data.session;

    try {
      const propPayload = propertyData ? {
        title: propertyData.title, description: propertyData.description,
        city: propertyData.city, state: propertyData.state, price: propertyData.price,
        type: propertyData.type, bedrooms: propertyData.bedrooms, bathrooms: propertyData.bathrooms,
        garages: propertyData.garages, area: propertyData.area, amenities: propertyData.amenities,
      } : undefined;

      const res = await fetch("https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/content-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({
          action: "generate",
          tenant_id: tenantId,
          author_id: user?.id,
          property_id: selectedPropertyId || null,
          property: propPayload,
          property_images: propertyData?.images || [],
          content_types: selectedTypes,
          tone,
          platform,
          custom_prompt: customPrompt.trim() || propertyData?.description || "",
          save_to_db: true,
        }),
      });

      const json = await res.json();
      if (!json.ok && json.error) {
        sonnerToast({ title: "Erro", description: json.error, variant: "destructive" });
        setLoading(false); return;
      }

      // Patch: use property image for posts if no AI image
      const patched = (json.data?.results || []).map((item: GeneratedItem) => {
        if ((item.type === "blog_post" || item.type === "social_post") && !item.imageUrl && propertyData?.images?.length) {
          return { ...item, imageUrl: propertyData.images[0] };
        }
        return item;
      });

      setResults(patched);
      setGenTime(json.data?.timeMs || 0);
      setStep(4);
      sonnerToast({ title: "Conteúdo gerado!", description: `${patched.length} resultado(s) em ${((json.data?.timeMs || 0) / 1000).toFixed(1)}s` });
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // ── Save to blog ──
  const handleSaveToBlog = async (item: GeneratedItem, idx: number) => {
    if (!tenantId || !user) return;
    try {
      const slug = ((item.title || customPrompt || "content").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)) + `-${Date.now()}`;
      let imgUrl: string | null = item.imageUrlWithLogo || item.imageUrl || null;
      if (imgUrl?.startsWith("data:")) {
        const buf = Uint8Array.from(atob(imgUrl.split(",")[1]), (c: number) => c.charCodeAt(0));
        const path = `blog-covers/${tenantId}/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from("blog-covers").upload(path, buf, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("blog-covers").getPublicUrl(path);
        imgUrl = urlData.publicUrl;
      }
      const { data, error } = await supabase.from("blog_posts").insert({
        tenant_id: tenantId, author_id: user.id,
        title: item.title || customPrompt.slice(0, 60),
        slug,
        excerpt: item.text?.slice(0, 200) || item.script?.slice(0, 200) || null,
        content: item.content || item.script || item.text || `<p>${item.title || ""}</p>`,
        cover_image_url: imgUrl, published: false,
      }).select("id").single();
      if (error) throw error;
      setSavedIds(prev => new Set([...prev, idx]));
      sonnerToast({ title: "Salvo no blog!", description: `ID: ${data.id.slice(0, 8)}...` });
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // ── Logo composite ──
  const compositeLogo = async (item: GeneratedItem, idx: number) => {
    if (!logoUrl || !item.imageUrl) return;
    setLogoLoading(prev => ({ ...prev, [idx]: true }));
    try {
      const [img, logo] = await Promise.all([
        new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image(); i.crossOrigin = "anonymous";
          i.onload = () => res(i); i.onerror = rej; i.src = item.imageUrl!;
        }),
        new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image(); i.crossOrigin = "anonymous";
          i.onload = () => res(i); i.onerror = rej; i.src = logoUrl;
        }),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const maxH = Math.round(img.height * 0.15), ratio = maxH / logo.height;
      const lw = Math.round(logo.width * ratio), lh = maxH;
      const pad = Math.round(img.width * 0.025);
      ctx.drawImage(logo, img.width - lw - pad, img.height - lh - pad, lw, lh);
      const dataUrl = canvas.toDataURL("image/png");
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, imageUrlWithLogo: dataUrl } : r));
      sonnerToast({ title: "Logo adicionado!" });
    } catch {
      sonnerToast({ title: "Erro ao adicionar logo", variant: "destructive" });
    } finally { setLogoLoading(prev => ({ ...prev, [idx]: false })); }
  };

  const typeInfo = (id: string) => CONTENT_TYPES.find(t => t.id === id);

  // ── Img2Img: generate with FLUX reference image via OmniRoute/Fal.ai ──
  const handleImg2Img = async () => {
    if (!img2imgRefImage) {
      sonnerToast({ title: "Selecione uma imagem de referência", variant: "destructive" }); return;
    }
    if (!img2imgPrompt.trim()) {
      sonnerToast({ title: "Digite um prompt descritivo", variant: "destructive" }); return;
    }
    setImg2imgLoading(true);
    setImg2imgResult(null);
    setImg2imgError(null);
    try {
      const res = await fetch(
        "https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=generate-img2img",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: img2imgRefImage,
            prompt: img2imgPrompt,
            strength: img2imgStrength,
          }),
        }
      );
      const json = await res.json();
      if (json.ok && json.data?.image_url) {
        setImg2imgResult(json.data.image_url);
        sonnerToast({ title: "Img2Img gerado!" });
      } else {
        setImg2imgError(json.data?.error || json.error || "Erro desconhecido");
        sonnerToast({ title: "Erro", description: json.data?.error || json.error, variant: "destructive" });
      }
    } catch (err: any) {
      setImg2imgError(err.message);
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setImg2imgLoading(false);
    }
  };

  const selectImg2ImgRef = (imgUrl: string) => {
    setImg2imgRefImage(imgUrl);
    setImg2imgResult(null);
    setImg2imgError(null);
  };

  const handleImg2ImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImg2imgRefImage(dataUrl);
      setImg2imgResult(null);
      setImg2imgError(null);
    };
    reader.readAsDataURL(file);
  };

  const resetAll = () => {
    setSelectedPropertyId(""); setPropertyData(null); setCustomPrompt("");
    setSelectedTypes(["blog_post", "social_post"]); setTone("professional");
    setPlatform("instagram"); setStep(1); setResults([]); setSavedIds(new Set());
  };

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Gerador de Conteúdo IA"
          subtitle={`${brand.name} — OmniRoute (texto) + MiniMax AI (imagens) + Templates Canvas + TTS`}
          action={
            <Tabs value={tab} onValueChange={(v) => { setTab(v as any); if (v === "history") loadHistory(); }}>
              <TabsList className="h-9">
                <TabsTrigger value="create" className="gap-1 text-xs h-8 px-3"><Wand2 className="h-3 w-3" /> Criar</TabsTrigger>
                <TabsTrigger value="history" className="gap-1 text-xs h-8 px-3"><Clock className="h-3 w-3" /> Histórico</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {tab === "create" && (
          <>
            <StepIndicator currentStep={step} />

            {/* ── STEP 1: Select Property ── */}
            {step === 1 && (
              <div className="space-y-4">
                <Card className="border-2 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <Home className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Selecionar Imóvel</CardTitle>
                        <CardDescription>Escolha um imóvel para usar como referência. Você pode pular esta etapa.</CardDescription>
                      </div>
                      {propertyData && (
                        <Badge className="ml-auto bg-green-600 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />{propertyData.images.length} foto(s)
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <select
                      value={selectedPropertyId}
                      onChange={e => { setSelectedPropertyId(e.target.value); }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <option value="">Nenhum imóvel — gerar sem referência</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} — {p.city} — R$ {Number(p.price).toLocaleString("pt-BR")}
                        </option>
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
                            <p className="font-bold text-green-800 dark:text-green-400">{propertyData.title}</p>
                            <p className="text-sm text-green-600/80">{propertyData.city}{propertyData.state ? `, ${propertyData.state}` : ""}</p>
                          </div>
                          <Badge className="bg-green-600 text-white text-xs">
                            R$ {Number(propertyData.price).toLocaleString("pt-BR")}
                          </Badge>
                        </div>
                        {propertyData.description && (
                          <p className="text-sm bg-white/50 dark:bg-black/20 rounded-lg p-2 max-h-20 overflow-y-auto">
                            {propertyData.description.slice(0, 200)}
                          </p>
                        )}
                        {propertyData.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {propertyData.images.slice(0, 6).map((url, i) => (
                              <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-green-300 shrink-0">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {propertyData.images.length > 6 && (
                              <div className="w-14 h-14 rounded-lg border border-green-300 bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                                <span className="text-xs text-green-700 dark:text-green-400">+{propertyData.images.length - 6}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Property quick-select cards */}
                {properties.length > 0 && (
                  <Card className="border-2 border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Selecione Rápido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {properties.slice(0, 8).map(p => {
                          const propImgs = propertyData?.id === p.id ? propertyData.images : [];
                          return (
                            <PropertyCard
                              key={p.id}
                              property={p}
                              images={propImgs}
                              selected={selectedPropertyId === p.id}
                              onSelect={() => setSelectedPropertyId(p.id === selectedPropertyId ? "" : p.id)}
                            />
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} size="lg" className="gap-2 px-8">
                    Próximo <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Content Types + Template ── */}
            {step === 2 && (
              <div className="space-y-4">
                <Card className="border-2 border-violet-200 dark:border-violet-800">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Tipos de Conteúdo</CardTitle>
                        <CardDescription>Selecione um ou mais tipos para gerar simultaneamente.</CardDescription>
                      </div>
                      <Badge className="ml-auto bg-violet-600 text-white">{selectedTypes.length} selecionado(s)</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CONTENT_TYPES.map(ct => {
                        const sel = selectedTypes.includes(ct.id);
                        return (
                          <button
                            key={ct.id}
                            onClick={() => toggleType(ct.id)}
                            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-center ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-secondary/30"}`}
                          >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ct.color} flex items-center justify-center`}>
                              <ct.icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <span className="text-xs font-semibold block">{ct.label}</span>
                              <span className="text-[10px] text-muted-foreground">{ct.media}</span>
                            </div>
                            {sel && (
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

                {/* Template Selector */}
                <Card className="border-2 border-amber-200 dark:border-amber-800">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <LayoutTemplate className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Template para Imagens</CardTitle>
                        <CardDescription>Escolha o modelo visual para as capas dos seus conteúdos.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Os templates são gerados em Canvas API com a identidade visual da {brand.name}.
                      Você pode baixar cada um em alta resolução PNG.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} size="lg" className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!selectedTypes.length} size="lg" className="gap-2 px-8">
                    Próximo <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Config ── */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Tone */}
                <Card className="border-2 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-lg">🎨</span> Tom / Estilo da Mensagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {TONES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTone(t.id)}
                          className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${tone === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        >
                          <span className="text-2xl">{t.emoji}</span>
                          <span className="text-xs font-semibold">{t.label}</span>
                          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Platform */}
                <Card className="border-2 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-lg">📱</span> Plataforma de Destino
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {PLATFORMS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPlatform(p.id)}
                          className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${platform === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        >
                          <div className={`w-10 h-10 rounded-full ${p.bg} flex items-center justify-center`}>
                            <p.icon className={`h-5 w-5 ${p.textColor}`} />
                          </div>
                          <span className="text-xs font-semibold">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Voice for TTS */}
                <Card className="border-2 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mic className="h-4 w-4" /> Voz da Narração (TTS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setVoiceMale(false)}
                        className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${!voiceMale ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20" : "border-border hover:border-cyan-400"}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center text-2xl shrink-0">👩</div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Feminino</p>
                          <p className="text-xs text-muted-foreground">Clara e envolvente</p>
                        </div>
                        {!voiceMale && <CheckCircle2 className="h-5 w-5 text-cyan-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => setVoiceMale(true)}
                        className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${voiceMale ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20" : "border-border hover:border-cyan-400"}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-2xl shrink-0">👨</div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Masculino</p>
                          <p className="text-xs text-muted-foreground">Locutor profissional BR</p>
                        </div>
                        {voiceMale && <CheckCircle2 className="h-5 w-5 text-cyan-500 ml-auto" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      🎤 A narração é gerada diretamente no seu navegador usando a API de síntese de voz do Chrome/Edge.
                    </p>
                  </CardContent>
                </Card>

                {/* Prompt */}
                <Card className="border-2 border-purple-200 dark:border-purple-900">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <PenLine className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Prompt / Descrição</CardTitle>
                        <CardDescription>
                          {propertyData?.description ? "Descrição do imóvel carregada." : "Descreva o conteúdo que deseja."}
                          <span className="text-primary ml-1">· {selectedTypes.map(t => typeInfo(t)?.label).filter(Boolean).join(", ")}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      placeholder="Ex: Apartamento de luxo em Belo Horizonte, 3 suítes, varanda gourmet com vista panorâmica..."
                      rows={5}
                      className="text-sm"
                    />
                    {propertyData && (
                      <Button variant="ghost" size="sm" onClick={() => setCustomPrompt("")}
                        className="text-xs text-muted-foreground">
                        <X className="h-3 w-3 mr-1" /> Limpar e recarregar do imóvel
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Brand info */}
                {logoUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    {logoUrl && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-border shrink-0">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">Logo e marca serão aplicados nos templates</p>
                    </div>
                    <Badge className="bg-green-600 text-white gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Logo OK
                    </Badge>
                  </div>
                )}

                {/* ── Img2Img: FLUX reference image → modified output ── */}
                <Card className={`border-2 ${img2imgOpen ? "border-fuchsia-400 dark:border-fuchsia-600" : "border-fuchsia-200 dark:border-fuchsia-900"}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
                          <Wand className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle>Img2Img — Modificar Foto com IA</CardTitle>
                          <CardDescription>Envie uma foto de referência e use FLUX via OmniRoute para criar variações e modificações.</CardDescription>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={img2imgOpen ? "default" : "outline"}
                        onClick={() => setImg2imgOpen(v => !v)}
                        className="gap-1.5"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        {img2imgOpen ? "Fechar" : "Abrir Img2Img"}
                      </Button>
                    </div>
                  </CardHeader>

                  {img2imgOpen && (
                    <CardContent className="space-y-4">
                      {/* Reference image selection */}
                      <div>
                        <Label className="text-xs font-medium mb-2 block">
                          Imagem de Referência {img2imgRefImage && <Badge className="ml-2 bg-fuchsia-600 text-white text-[10px]">Selecionada</Badge>}
                        </Label>

                        {/* Upload from device */}
                        <div className="flex items-center gap-2 mb-2">
                          <label className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-fuchsia-300 dark:border-fuchsia-700 hover:border-fuchsia-500 cursor-pointer py-4 transition-colors bg-fuchsia-50/50 dark:bg-fuchsia-950/20">
                            <Upload className="h-4 w-4 text-fuchsia-500" />
                            <span className="text-sm text-fuchsia-700 dark:text-fuchsia-400">Upload do dispositivo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImg2ImgUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Property photos as reference */}
                        {propertyData?.images?.length > 0 && (
                          <>
                            <p className="text-[10px] text-muted-foreground mb-1">— ou use foto do imóvel —</p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {propertyData.images.slice(0, 8).map((url, i) => (
                                <button
                                  key={i}
                                  onClick={() => selectImg2ImgRef(url)}
                                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${img2imgRefImage === url ? "border-fuchsia-500 ring-2 ring-fuchsia-400" : "border-border hover:border-fuchsia-400"}`}
                                >
                                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                  {img2imgRefImage === url && (
                                    <div className="absolute inset-0 bg-fuchsia-500/30 flex items-center justify-center">
                                      <CheckCircle2 className="h-5 w-5 text-white" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Preview of selected reference */}
                        {img2imgRefImage && (
                          <div className="mt-2 rounded-xl overflow-hidden border-2 border-fuchsia-300 dark:border-fuchsia-700">
                            <img src={img2imgRefImage} alt="Referência" className="w-full h-40 object-contain bg-fuchsia-950/10" />
                          </div>
                        )}
                      </div>

                      {/* Strength slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <SlidersHorizontal className="h-3 w-3" /> Força da Referência
                          </Label>
                          <Badge variant="outline" className="text-[10px]">
                            {img2imgStrength < 0.4 ? "Leve — apenas inspiração" :
                              img2imgStrength < 0.7 ? "Médio — equilíbrio" :
                                img2imgStrength < 0.9 ? "Forte — preserva estrutura" : "Máximo — quase idêntico"}
                          </Badge>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.95"
                          step="0.05"
                          value={img2imgStrength}
                          onChange={e => setImg2imgStrength(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                          <span>Leve (0.1)</span>
                          <span className="font-medium text-fuchsia-600">Atual: {img2imgStrength.toFixed(2)}</span>
                          <span>Forte (0.95)</span>
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          {[{ label: "Leve", val: 0.3 }, { label: "Médio", val: 0.6 }, { label: "Forte", val: 0.85 }].map(p => (
                            <button
                              key={p.label}
                              onClick={() => setImg2imgStrength(p.val)}
                              className={`flex-1 text-[10px] py-1 px-2 rounded-lg border transition-all ${Math.abs(img2imgStrength - p.val) < 0.05 ? "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 font-semibold" : "border-border hover:border-fuchsia-400 text-muted-foreground"}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Prompt */}
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Prompt de Modificação</Label>
                        <Textarea
                          value={img2imgPrompt}
                          onChange={e => setImg2imgPrompt(e.target.value)}
                          placeholder="Ex: Same house but at golden hour sunset, pool area with people enjoying, professional photography, warm colors..."
                          rows={3}
                          className="text-sm"
                        />
                      </div>

                      {/* Generate button */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleImg2Img}
                          disabled={img2imgLoading || !img2imgRefImage || !img2imgPrompt.trim()}
                          className="gap-2 flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700"
                          size="lg"
                        >
                          {img2imgLoading
                            ? <Loader2 className="h-8 w-8 animate-spin text-fuchsia-500 mx-auto" />
                            : <Wand className="h-8 w-8 text-fuchsia-500 mx-auto" />}
                          <p className="text-sm font-medium text-fuchsia-700 dark:text-fuchsia-400">Processando img2img...</p>
                          <p className="text-xs text-muted-foreground">Isso pode levar 10-30 segundos</p>
                        </div>
                      )}

                      {img2imgResult && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-white gap-1">
                              <CheckCircle2 className="h-3 w-3" />Img2Img Pronto
                            </Badge>
                            <span className="text-xs text-muted-foreground">Img2Img (FLUX/Fal.ai)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Side by side: Reference × Generated */}
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Referência</p>
                              <div className="rounded-lg overflow-hidden border border-border">
                                <img src={img2imgRefImage!} alt="Referência" className="w-full h-40 object-cover" />
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Gerado (strength={img2imgStrength.toFixed(2)})</p>
                              <div className="rounded-lg overflow-hidden border border-fuchsia-400">
                                <img src={img2imgResult} alt="Gerado" className="w-full h-40 object-cover" />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="gap-1.5 flex-1"
                              onClick={() => { navigator.clipboard.writeText(img2imgPrompt); sonnerToast({ title: "Prompt copiado!" }); }}>
                              <Copy className="h-3 w-3" /> Copiar Prompt
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 flex-1"
                              onClick={() => {
                                const a = document.createElement("a"); a.href = img2imgResult!;
                                a.download = `img2img-${Date.now()}.png`; a.click();
                                sonnerToast({ title: "Download iniciado!" });
                              }}>
                              <Download className="h-3 w-3" /> Baixar PNG
                            </Button>
                          </div>
                        </div>
                      )}

                      {img2imgError && (
                        <div className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium">Erro no Img2Img</p>
                          <p className="text-xs text-red-600 dark:text-red-500 mt-1">{img2imgError}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} size="lg" className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !selectedTypes.length}
                    size="lg"
                    className="gap-2 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? `Gerando ${selectedTypes.length} tipo(s)...` : `Gerar ${selectedTypes.length} Tipo(s) com IA`}
                  </Button>
                </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">Logo e marca будут aplicados nos templates</p>
                    </div>
                    <Badge className="bg-green-600 text-white gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Logo OK
                    </Badge>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} size="lg" className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !selectedTypes.length}
                    size="lg"
                    className="gap-2 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? `Gerando ${selectedTypes.length} tipo(s)...` : `Gerar ${selectedTypes.length} Tipo(s) com IA`}
                  </Button>
                </div>

                {/* Loading */}
                {loading && (
                  <Card className="border-2 border-primary/20">
                    <CardContent className="py-10 text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      </div>
                      <p className="font-semibold">Gerando conteúdo com IA...</p>
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
              </div>
            )}

            {/* ── STEP 4: Results ── */}
            {step === 4 && results.length > 0 && !loading && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800 flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-400">Conteúdo gerado com sucesso!</p>
                    <p className="text-sm text-green-600/80">{results.length} resultado(s)</p>
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
                              {item.imageUrl && <Badge className="text-xs bg-gradient-to-r from-violet-600 to-purple-600 gap-1"><Sparkles className="h-3 w-3" /> MiniMax</Badge>}
                              {item.imageUrl && <Badge className="text-xs bg-blue-600 gap-1"><ImageIcon className="h-3 w-3" /> Imagem</Badge>}
                              {item.videoUrl && <Badge className="text-xs bg-orange-600 gap-1"><Film className="h-3 w-3" /> Vídeo</Badge>}
                              {item.script && <Badge className="text-xs bg-cyan-600 gap-1"><Volume2 className="h-3 w-3" /> TTS</Badge>}
                              {item.musicPrompt && <Badge className="text-xs bg-violet-600 gap-1"><Music className="h-3 w-3" /> Música</Badge>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Title */}
                          {item.title && <p className="font-semibold text-sm line-clamp-2">{item.title}</p>}

                          {/* Image */}
                          {(item.imageUrlWithLogo || item.imageUrl) && (
                            <div className="rounded-lg overflow-hidden border border-border">
                              <div className="relative">
                                <img src={item.imageUrlWithLogo || item.imageUrl} alt="" className="w-full h-40 object-cover" />
                                <div className="absolute top-2 left-2">
                                  <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-violet-600/90 to-purple-600/90 text-white border-0 gap-1">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {item.imageUrlWithLogo ? "Com logo" : "MiniMax IA"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Generated image prompt */}
                          {item.prompt && (
                            <details className="mt-1">
                              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground select-none">
                                📝 Ver prompt da imagem
                              </summary>
                              <div className="mt-1 bg-muted/60 rounded-lg p-2 text-[10px] text-muted-foreground leading-relaxed border border-border/50">
                                {item.prompt}
                              </div>
                            </details>
                          )}

                          {/* TTS */}
                          {item.script && (
                            <AudioPlayer
                              label={`Narração: ${item.title || item.type}`}
                              script={item.script}
                              male={voiceMale}
                            />
                          )}

                          {/* Music info */}
                          {item.musicPrompt && (
                            <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Music className="h-4 w-4 text-violet-500" />
                                <span className="text-xs font-medium">Música de Fundo</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{item.musicPrompt}</p>
                            </div>
                          )}

                          {/* Script preview */}
                          {item.script && !item.imageUrl && (
                            <p className="text-xs bg-muted/50 rounded-lg p-2 line-clamp-4">{item.script}</p>
                          )}

                          {/* Text */}
                          {item.text && !item.script && (
                            <p className="text-xs text-muted-foreground line-clamp-4">{item.text}</p>
                          )}

                          {/* Ad copy */}
                          {(item.headline1 || item.headline2) && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 space-y-1">
                              {item.headline1 && <p className="text-xs font-semibold">H1: {item.headline1}</p>}
                              {item.headline2 && <p className="text-xs">H2: {item.headline2}</p>}
                              {item.cta && <Badge className="text-xs bg-amber-600 w-fit">{item.cta}</Badge>}
                            </div>
                          )}

                          {/* Hashtags */}
                          {item.hashtags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.hashtags.slice(0, 6).map((tag, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">#{tag}</span>
                              ))}
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
                              brandName={brand.name}
                            />
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t flex-wrap">
                            {item.prompt && (
                              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1.5 text-xs h-8">
                                <RefreshCw className="h-3 w-3" /> Regenerar
                              </Button>
                            )}
                            {logoUrl && (item.imageUrl || item.imageUrlWithLogo) && !item.imageUrlWithLogo && (
                              <Button
                                variant="secondary" size="sm"
                                onClick={() => compositeLogo(item, idx)}
                                disabled={!!logoLoading[idx]}
                                className="gap-1.5 text-xs h-8"
                              >
                                {logoLoading[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileImage className="h-3 w-3" />}
                                {logoLoading[idx] ? "Aplicando..." : "Add Logo"}
                              </Button>
                            )}
                            {item.imageUrlWithLogo && (
                              <Badge className="text-xs gap-1 bg-green-600 text-white"><CheckCircle2 className="h-3 w-3" /> Logo OK</Badge>
                            )}
                            {item.text && (
                              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(item.text || ""); sonnerToast({ title: "Copiado!" }); }} className="gap-1.5 text-xs h-8">
                                <Copy className="h-3 w-3" /> Copiar
                              </Button>
                            )}
                            <Button
                              variant="outline" size="sm"
                              onClick={() => handleSaveToBlog(item, idx)}
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
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={resetAll} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Novo Conteúdo
                  </Button>
                  <Button onClick={() => setStep(3)} className="gap-2">
                    <Sparkles className="h-4 w-4" /> Gerar Mais
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <Card className="border-2 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Gerações</CardTitle>
                  <CardDescription>Gerações salvas no banco de dados.</CardDescription>
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
                  <p className="font-medium">Nenhuma geração salva ainda</p>
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
                            {item.audio_url && <Volume2 className="h-3 w-3 text-cyan-500" />}
                            {item.music_url && <Music className="h-3 w-3 text-violet-500" />}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
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
        )}
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
                <div className="rounded-xl overflow-hidden border">
                  <img src={previewItem.imageUrlWithLogo || previewItem.imageUrl} alt="" className="w-full" />
                </div>
              )}
              {previewItem.title && <div><Label className="text-xs text-muted-foreground">Título</Label><p className="font-semibold">{previewItem.title}</p></div>}
              {previewItem.text && <div><Label className="text-xs text-muted-foreground">Texto</Label><div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.text}</div></div>}
              {previewItem.script && <div><Label className="text-xs text-muted-foreground">Roteiro</Label><div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.script}</div></div>}
              {previewItem.captions?.length && <div><Label className="text-xs text-muted-foreground">Captions</Label><div className="space-y-2">{previewItem.captions.map((c, i) => <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm">{c}</div>)}</div></div>}
              {previewItem.hashtags?.length && <div><Label className="text-xs text-muted-foreground">Hashtags</Label><p className="text-sm">{previewItem.hashtags.map((t: string) => `#${t}`).join(" ")}</p></div>}
              {previewItem.script && <AudioPlayer label="Narração" script={previewItem.script} male={voiceMale} />}
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
