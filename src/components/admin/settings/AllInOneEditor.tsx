import { useState, useEffect, useCallback } from "react";
import {
  Building2, Palette as PaletteIcon, Image, Phone, Globe, MapPin,
  Rss, BarChart3, Target, MessageCircle, Sparkles, FileText, Cookie,
  Smartphone, Settings, ChevronLeft, ChevronRight, Save, Monitor,
  Tablet, Smartphone as MobileIcon, Check, Upload, X, Eye, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sonnerToast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeRole } from "@/lib/adminPermissions";

type Viewport = "desktop" | "tablet" | "mobile";

type Section = "identidade" | "aparencia" | "logos" | "contatos" | "redes" |
  "endereco" | "portal" | "seo" | "analytics" | "pixel" | "whatsapp" |
  "ia" | "legais" | "cookies" | "pwa" | "avancado";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "identidade", label: "Identidade", icon: <Building2 className="w-4 h-4" /> },
  { id: "aparencia", label: "Aparência", icon: <PaletteIcon className="w-4 h-4" /> },
  { id: "logos", label: "Logos", icon: <Image className="w-4 h-4" /> },
  { id: "contatos", label: "Contatos", icon: <Phone className="w-4 h-4" /> },
  { id: "redes", label: "Redes Sociais", icon: <Globe className="w-4 h-4" /> },
  { id: "endereco", label: "Endereço", icon: <MapPin className="w-4 h-4" /> },
  { id: "portal", label: "Portal Público", icon: <Globe className="w-4 h-4" /> },
  { id: "seo", label: "SEO", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "pixel", label: "Meta Pixel", icon: <Target className="w-4 h-4" /> },
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" /> },
  { id: "ia", label: "IA", icon: <Sparkles className="w-4 h-4" /> },
  { id: "legais", label: "Páginas Legais", icon: <FileText className="w-4 h-4" /> },
  { id: "cookies", label: "Cookies", icon: <Cookie className="w-4 h-4" /> },
  { id: "pwa", label: "PWA", icon: <Smartphone className="w-4 h-4" /> },
  { id: "avancado", label: "Avançado", icon: <Settings className="w-4 h-4" /> },
];

const PALETTES = [
  { id: "luxo", name: "Luxo", primary: "#1a1a2e", accent: "#e94560" },
  { id: "premium", name: "Premium", primary: "#0f3460", accent: "#e94560" },
  { id: "moderno", name: "Moderno", primary: "#3b82f6", accent: "#06b6d4" },
  { id: "escuro", name: "Escuro", primary: "#0f172a", accent: "#6366f1" },
  { id: "corporativo", name: "Corporativo", primary: "#1e3a5f", accent: "#2dd4bf" },
  { id: "minimalista", name: "Minimalista", primary: "#71717a", accent: "#3b82f6" },
  { id: "imobiliaria", name: "Imobiliária", primary: "#003366", accent: "#0066cc" },
];

const FONTS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Poppins", label: "Poppins" },
  { value: "Inter", label: "Inter" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Outfit", label: "Outfit" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Nunito", label: "Nunito" },
];

const HEADER_STYLES = [
  { id: "transparent", label: "Transparente" },
  { id: "solid-dark", label: "Fundo Escuro" },
  { id: "white", label: "Fundo Branco" },
  { id: "gradient", label: "Gradiente" },
  { id: "glass", label: "Glass" },
  { id: "light-solid", label: "Fundo Claro" },
];

const FOOTER_STYLES = [
  { id: "dark", label: "Escuro" },
  { id: "light", label: "Claro" },
  { id: "gradient", label: "Gradiente" },
  { id: "warm", label: "Quente" },
  { id: "colored", label: "Colorido" },
];

// ── Site Preview ──────────────────────────────────────────────────────────────
function SitePreview({ primaryColor, accentColor, fontFamily, headerStyle, footerStyle, heroTitle, heroSubtitle, showWhatsapp, viewport }: {
  primaryColor: string; accentColor: string; fontFamily: string; headerStyle: string; footerStyle: string;
  heroTitle: string; heroSubtitle: string; showWhatsapp: boolean; viewport: Viewport;
}) {
  const widths = { desktop: 520, tablet: 380, mobile: 240 };
  const heights = { desktop: 380, tablet: 350, mobile: 480 };
  const w = widths[viewport];
  const headerBg: Record<string, string> = {
    transparent: "bg-transparent",
    "solid-dark": "bg-slate-900",
    white: "bg-white border-b",
    gradient: "bg-gradient-to-r from-slate-900 to-slate-700",
    glass: "bg-white/10 backdrop-blur-md",
    "light-solid": "bg-slate-50 border-b",
  };
  const footerBg: Record<string, string> = {
    dark: "bg-slate-900",
    light: "bg-white border-t",
    gradient: "bg-gradient-to-r from-slate-800 to-slate-900",
    warm: "bg-amber-900",
    colored: "",
  };
  const isColoredFooter = footerStyle === "colored";

  return (
    <div className="rounded-2xl border border-border overflow-hidden shadow-xl bg-white mx-auto transition-all duration-300" style={{ width: w, fontFamily }}>
      {/* Browser chrome */}
      <div className="h-6 bg-slate-100 dark:bg-slate-800 border-b border-border flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/70" />
          <div className="w-2 h-2 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 mx-3">
          <div className="h-3.5 bg-white/80 dark:bg-slate-700/80 rounded-md px-2 flex items-center text-[8px] text-muted-foreground/60 font-mono">arrudaimobi.com.br</div>
        </div>
      </div>
      <div style={{ height: heights[viewport], overflowY: "auto" }}>
        {/* Header */}
        <div className={cn("px-4 py-2 flex items-center justify-between text-white", headerBg[headerStyle] || "bg-slate-900")}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>AI</div>
            <span className="font-bold text-xs">Arruda Imobi</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[9px]">
            {["Imóveis", "Blog", "Agentes"].map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
        {/* Hero */}
        <div className="relative px-4 py-8 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}>
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10">
            <h1 className="text-sm font-bold text-white mb-1">{heroTitle || "Encontre o imóvel ideal"}</h1>
            <p className="text-[9px] text-white/80 mb-4 max-w-[90%] mx-auto">{heroSubtitle || "Os melhores imóveis do Brasil"}</p>
            <div className="flex max-w-[85%] mx-auto gap-1.5">
              <div className="flex-1 bg-white rounded-lg px-2 py-1.5 text-[9px] text-muted-foreground">Bairro...</div>
              <div className="bg-white rounded-lg px-2 py-1.5 text-[9px] text-muted-foreground">Buscar</div>
            </div>
          </div>
        </div>
        {/* Cards */}
        <div className="px-4 py-5">
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-lg overflow-hidden border">
                <div className="h-10 bg-slate-200" />
                <div className="p-1">
                  <div className="w-3/4 h-1.5 rounded bg-slate-200 mb-0.5" />
                  <div className="w-1/2 h-1 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className={cn("px-4 py-3", isColoredFooter ? "" : footerBg[footerStyle], !isColoredFooter ? "text-white" : "")}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {["Links", "Imóveis", "Contato"].map(col => (
              <div key={col}>
                <div className="w-8 h-1.5 rounded mb-1" style={{ backgroundColor: isColoredFooter ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)" }} />
                {[1, 2].map(p => <div key={p} className="w-full h-1 rounded mb-0.5" style={{ backgroundColor: isColoredFooter ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)" }} />)}
              </div>
            ))}
          </div>
          <div className="h-px rounded" style={{ backgroundColor: isColoredFooter ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)" }} />
        </div>
        {/* WhatsApp float */}
        {showWhatsapp && (
          <div className="fixed bottom-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-[10px]">W</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section Panels ─────────────────────────────────────────────────────────────

function IdentidadePanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Nome da Imobiliária</Label>
        <Input value={form.nome} onChange={e => set("nome", e.target.value)} className="text-sm" placeholder="Arruda Imobi" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Slogan</Label>
        <Input value={form.slogan} onChange={e => set("slogan", e.target.value)} className="text-sm" placeholder="Sua frase de impacto" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">CNPJ</Label>
          <Input value={form.cnpj} onChange={e => set("cnpj", e.target.value)} className="text-sm" placeholder="00.000.000/0001-00" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">CRECI</Label>
          <Input value={form.creci} onChange={e => set("creci", e.target.value)} className="text-sm" placeholder="XXXXX" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Razão Social</Label>
        <Input value={form.razao_social} onChange={e => set("razao_social", e.target.value)} className="text-sm" />
      </div>
    </div>
  );
}

function AparenciaPanel({ form, set }: any) {
  return (
    <div className="space-y-6">
      {/* Palettes */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Paletas Prontas</Label>
        <div className="grid grid-cols-4 gap-2">
          {PALETTES.map(p => (
            <button
              key={p.id}
              onClick={() => { set("primary_color", p.primary); set("accent_color", p.accent); }}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs",
                form.primary_color === p.primary && form.accent_color === p.accent
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex gap-1">
                <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: p.primary }} />
                <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: p.accent }} />
              </div>
              <span className="text-[10px] font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Cor Primária</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border-2 border-border" />
            <Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="text-xs font-mono h-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Cor de Destaque</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.accent_color} onChange={e => set("accent_color", e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border-2 border-border" />
            <Input value={form.accent_color} onChange={e => set("accent_color", e.target.value)} className="text-xs font-mono h-9" />
          </div>
        </div>
      </div>

      {/* Gradient preview */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Pré-visualização do Gradiente</Label>
        <div className="h-16 rounded-xl border border-border" style={{ background: `linear-gradient(135deg, ${form.primary_color} 0%, ${form.accent_color} 100%)` }} />
      </div>

      {/* Font */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Fonte</Label>
        <select value={form.font_family} onChange={e => set("font_family", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm">
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
          <p className="text-lg font-bold" style={{ fontFamily: form.font_family }}>Arruda Imobiliária</p>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Estilo do Header</Label>
        <div className="grid grid-cols-3 gap-2">
          {HEADER_STYLES.map(h => (
            <button key={h.id} onClick={() => set("header_style", h.id)}
              className={cn("h-9 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center",
                form.header_style === h.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 bg-card")}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Estilo do Footer</Label>
        <div className="grid grid-cols-3 gap-2">
          {FOOTER_STYLES.map(f => (
            <button key={f.id} onClick={() => set("footer_style", f.id)}
              className={cn("h-9 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center",
                form.footer_style === f.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 bg-card")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogosPanel({ form, set, tenantId }: any) {
  const [uploading, setUploading] = useState<string | null>(null);
  const upload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(key);
    try {
      const ext = file.name.split(".").pop();
      const filename = `${key}-${tenantId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("property-images").upload(`branding/${filename}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(`branding/${filename}`);
      set(key, data.publicUrl);
      sonnerToast({ title: "Upload OK!", icon: <Check className="w-4 h-4 text-green-500" /> });
    } catch (err: any) { sonnerToast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setUploading(null); }
  };
  return (
    <div className="space-y-6">
      {["logo_url", "footer_logo_url", "favicon_url"].map(key => (
        <div key={key} className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            {key === "logo_url" ? "Logo do Header" : key === "footer_logo_url" ? "Logo do Footer" : "Favicon (32x32)"}
          </Label>
          <div className="flex items-center gap-3">
            {form[key] ? (
              <div className="w-14 h-14 rounded-lg border bg-card flex items-center justify-center overflow-hidden">
                {key === "favicon_url" ? <img src={form[key]} alt="favicon" className="w-full h-full object-contain" /> : <img src={form[key]} alt="logo" className="w-full h-full object-contain" />}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-lg text-muted-foreground/30">?</span>
              </div>
            )}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs" disabled={!!uploading}>
                <span>{uploading === key ? "Enviando..." : <><Upload className="w-3 h-3" /> Upload</>}</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={upload.bind(null, key)} disabled={!!uploading} />
            </label>
            {form[key] && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => set(key, "")}>
                <X className="w-3 h-3 mr-1" /> Remover
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContatosPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      {[
        { key: "telefone", label: "Telefone", placeholder: "(31) 99999-9999" },
        { key: "whatsapp", label: "WhatsApp", placeholder: "5531999999999" },
        { key: "email", label: "Email", placeholder: "contato@arrudaimobi.com.br" },
        { key: "horarios", label: "Horários de Funcionamento", placeholder: "Seg-Sex: 9h-18h" },
      ].map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
          <Input value={form[key] || ""} onChange={e => set(key, e.target.value)} className="text-sm" placeholder={placeholder} />
        </div>
      ))}
    </div>
  );
}

function RedesPanel({ form, set }: any) {
  const redes = [
    { key: "instagram", label: "Instagram", placeholder: "@arrudaimobi" },
    { key: "facebook", label: "Facebook", placeholder: "facebook.com/arrudaimobi" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/arrudaimobi" },
    { key: "youtube", label: "YouTube", placeholder: "youtube.com/@arrudaimobi" },
    { key: "tiktok", label: "TikTok", placeholder: "@arrudaimobi" },
  ];
  return (
    <div className="space-y-4">
      {redes.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
          <Input value={form[key] || ""} onChange={e => set(key, e.target.value)} className="text-sm" placeholder={placeholder} />
        </div>
      ))}
    </div>
  );
}

function EnderecoPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Rua / Av.</Label>
          <Input value={form.endereco} onChange={e => set("endereco", e.target.value)} className="text-sm" placeholder="Av. Brasil" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Número</Label>
          <Input value={form.numero} onChange={e => set("numero", e.target.value)} className="text-sm" placeholder="123" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Complemento</Label>
          <Input value={form.complemento} onChange={e => set("complemento", e.target.value)} className="text-sm" placeholder="Sala 1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Bairro</Label>
          <Input value={form.bairro} onChange={e => set("bairro", e.target.value)} className="text-sm" placeholder="Centro" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Cidade</Label>
          <Input value={form.cidade} onChange={e => set("cidade", e.target.value)} className="text-sm" placeholder="Betim" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
          <Input value={form.estado} onChange={e => set("estado", e.target.value)} className="text-sm" placeholder="MG" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">CEP</Label>
          <Input value={form.cep} onChange={e => set("cep", e.target.value)} className="text-sm" placeholder="32600-000" />
        </div>
      </div>
    </div>
  );
}

function PortalPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Título do Hero</Label>
        <Input value={form.hero_headline} onChange={e => set("hero_headline", e.target.value)} className="text-sm" placeholder="Encontre o imóvel ideal" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Subtítulo</Label>
        <Textarea value={form.hero_subheadline} onChange={e => set("hero_subheadline", e.target.value)} rows={2} className="text-sm" placeholder="Os melhores imóveis do Brasil..." />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Stats - Total Imóveis</Label>
          <Input value={form.stats_imoveis} onChange={e => set("stats_imoveis", e.target.value)} className="text-sm" placeholder="150+" />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Stats - Clientes</Label>
          <Input value={form.stats_clientes} onChange={e => set("stats_clientes", e.target.value)} className="text-sm" placeholder="2.3K+" />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Stats - Agentes</Label>
          <Input value={form.stats_agentes} onChange={e => set("stats_agentes", e.target.value)} className="text-sm" placeholder="12" />
        </div>
      </div>
    </div>
  );
}

function SeoPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Título SEO</Label>
          <span className={cn("text-[10px]", form.seo_title?.length > 60 ? "text-amber-500" : "text-green-600")}>{form.seo_title?.length || 0}/60</span>
        </div>
        <Input value={form.seo_title || ""} onChange={e => set("seo_title", e.target.value)} className="text-sm" placeholder="Arruda Imobi | Imobiliária em Betim, MG" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Descrição SEO</Label>
          <span className={cn("text-[10px]", (form.seo_description?.length || 0) > 160 ? "text-amber-500" : "text-green-600")}>{form.seo_description?.length || 0}/160</span>
        </div>
        <Textarea value={form.seo_description || ""} onChange={e => set("seo_description", e.target.value)} rows={3} className="text-sm" placeholder="Descrição para Google..." />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Imagem de Compartilhamento (OG)</Label>
        <div className="w-full h-28 rounded-xl border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
          {form.seo_image_url ? <img src={form.seo_image_url} alt="OG" className="w-full h-full object-cover" /> : <span className="text-muted-foreground text-xs">1200x630px - upload abaixo</span>}
        </div>
      </div>
      {/* WhatsApp preview */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">Simulação (WhatsApp)</Label>
        <div className="bg-[#E5DDD5] p-3 rounded-xl border border-border shadow-inner">
          <div className="w-[85%] ml-auto bg-[#DCF8C6] rounded-xl shadow-sm overflow-hidden flex flex-col">
            {form.seo_image_url ? (
              <div className="w-full h-[80px] bg-white border-b border-[#0000001a] overflow-hidden"><img src={form.seo_image_url} alt="preview" className="w-full h-full object-cover" /></div>
            ) : (
              <div className="w-full h-[80px] bg-[#0000001a] border-b flex items-center justify-center"><span className="text-black/20 text-sm">📷</span></div>
            )}
            <div className="px-2 pt-1.5 pb-2 bg-[#0000000d]">
              <h3 className="font-bold text-xs truncate text-[#111]">{form.seo_title || "Título do Site"}</h3>
              <p className="text-[10px] line-clamp-2 mt-0.5 text-[#444]">{form.seo_description || "Descrição do site..."}</p>
              <p className="text-[9px] mt-1 truncate text-[#00000066]">arrudaimobi.com.br</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPanel({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">{icon}</div>
      <h3 className="font-semibold text-sm mb-1">{label}</h3>
      <p className="text-xs text-muted-foreground">Configuração em desenvolvimento</p>
    </div>
  );
}

function WhatsAppPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Número WhatsApp</Label>
        <Input value={form.whatsapp_numero} onChange={e => set("whatsapp_numero", e.target.value)} className="text-sm" placeholder="5531999999999" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Mensagem Padrão</Label>
        <Textarea value={form.whatsapp_mensagem} onChange={e => set("whatsapp_mensagem", e.target.value)} rows={2} className="text-sm" placeholder="Olá! Vim pelo site Arruda Imobi..." />
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
        <div>
          <p className="text-sm font-medium">Botão Flutuante</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Exibir botão WhatsApp no canto inferior</p>
        </div>
        <button onClick={() => set("show_whatsapp", !form.show_whatsapp)}
          className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", form.show_whatsapp ? "bg-primary" : "bg-muted")}>
          <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center", form.show_whatsapp && "translate-x-5")}>
            {form.show_whatsapp && <Check className="w-3 h-3 text-primary" />}
          </span>
        </button>
      </div>
    </div>
  );
}

function LegaisPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Termos de Serviço</Label>
        <Textarea value={form.termos} onChange={e => set("termos", e.target.value)} rows={5} className="text-sm" placeholder="Texto dos termos de uso..." />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Política de Privacidade</Label>
        <Textarea value={form.politica} onChange={e => set("politica", e.target.value)} rows={5} className="text-sm" placeholder="Texto da política de privacidade..." />
      </div>
    </div>
  );
}

function CookiesPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Mensagem do Banner de Cookies</Label>
        <Textarea value={form.cookies_mensagem} onChange={e => set("cookies_mensagem", e.target.value)} rows={3} className="text-sm" placeholder="Usamos cookies para melhorar sua experiência..." />
      </div>
    </div>
  );
}

function PwaPanel({ form, set }: any) {
  const [uploading, setUploading] = useState<string | null>(null);
  const upload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(key);
    try {
      const ext = file.name.split(".").pop();
      const filename = `${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("property-images").upload(`pwa/${filename}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(`pwa/${filename}`);
      set(key, data.publicUrl);
      sonnerToast({ title: "Upload OK!", icon: <Check className="w-4 h-4 text-green-500" /> });
    } catch (err: any) { sonnerToast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setUploading(null); }
  };
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Nome do App PWA</Label>
        <Input value={form.pwa_nome} onChange={e => set("pwa_nome", e.target.value)} className="text-sm" placeholder="Arruda Imobi" />
      </div>
      {["pwa_icon_192", "pwa_icon_512"].map(key => (
        <div key={key} className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Ícone {key === "pwa_icon_192" ? "192x192" : "512x512"}</Label>
          <div className="flex items-center gap-3">
            {form[key] && (
              <div className="w-14 h-14 rounded-lg border bg-card flex items-center justify-center overflow-hidden">
                <img src={form[key]} alt={key} className="w-full h-full object-contain" />
              </div>
            )}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs" disabled={!!uploading}>
                <span>{uploading === key ? "Enviando..." : <><Upload className="w-3 h-3" /> Upload</>}</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={upload.bind(null, key)} disabled={!!uploading} />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function AvancadoPanel({ form, set }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
        <div>
          <p className="text-sm font-medium">Permitir Registro de Usuários</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Novos usuários podem se cadastrar no portal</p>
        </div>
        <button onClick={() => set("allow_registration", !form.allow_registration)}
          className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", form.allow_registration ? "bg-primary" : "bg-muted")}>
          <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center", form.allow_registration && "translate-x-5")}>
            {form.allow_registration && <Check className="w-3 h-3 text-primary" />}
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface AllInOneEditorProps {
  tenantId: string;
}

export function AllInOneEditor({ tenantId }: AllInOneEditorProps) {
  const { normalizedRole } = useAuth();
  const isDev = normalizedRole === "developer";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("identidade");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [saving, setSaving] = useState(false);

  // All form fields in one state
  const [form, setForm] = useState<Record<string, any>>({});

  const set = useCallback((key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Load from TENANTS table (settings JSONB) — site_settings is for SEO/docs only
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("settings").eq("id", tenantId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    const s = tenant?.settings || {};
    setForm({
      // Identity
      nome: s.name || "",
      slogan: s.slogan || "",
      cnpj: s.cnpj || "",
      creci: s.creci || "",
      razao_social: s.razao_social || "",
      // Theme
      primary_color: s.primary_color || "#003366",
      accent_color: s.accent_color || "#0066CC",
      font_family: s.font_family || "Plus Jakarta Sans",
      header_style: s.header_style || "solid-dark",
      footer_style: s.footer_style || "dark",
      gradient_from: s.gradient_from || "#003366",
      gradient_to: s.gradient_to || "#0066CC",
      logo_url: s.logo_url || "",
      logo_mode: s.logo_mode || "text",
      // Hero
      hero_headline: s.hero_headline || "Encontre o imóvel ideal",
      hero_subheadline: s.hero_subheadline || "Os melhores imóveis do Brasil",
      hero_headline_visible: s.hero_headline_visible ?? true,
      hero_subheadline_visible: s.hero_subheadline_visible ?? true,
      hero_search_visible: s.hero_search_visible ?? true,
      hero_bg_image_url: s.hero_bg_image_url || "",
      hero_bg_overlay_opacity: s.hero_bg_overlay_opacity ?? 45,
      hero_bg_position: s.hero_bg_position || "center",
      hero_bg_mode: s.hero_bg_mode || "gradient",
      // Stats
      stats_imoveis: s.stats_counters?.properties_count || "150+",
      stats_clientes: s.stats_counters?.clients_served || "2.3K+",
      stats_agentes: s.stats_counters?.active_agents || "12",
      stats_cidades: s.stats_counters?.cities_served || "5",
      // Branding
      favicon_url: s.favicon_url || "",
      footer_logo_url: s.footer_logo_url || "",
      pwa_nome: s.pwa_nome || "",
      pwa_icon_192: s.pwa_icon_192 || "",
      pwa_icon_512: s.pwa_icon_512 || "",
      // Contact
      telefone: s.contact_phone || "",
      whatsapp: s.contact_whatsapp || "",
      email: s.contact_email || "",
      horarios: s.business_hours || "",
      // Address
      endereco: s.contact_address || "",
      instagram: s.social_instagram || "",
      facebook: s.social_facebook || "",
      linkedin: s.social_linkedin || "",
      youtube: s.social_youtube || "",
      tiktok: s.social_tiktok || "",
      // SEO
      seo_title: s.seo_title || "",
      seo_description: s.seo_description || "",
      seo_image_url: s.seo_image_url || "",
      // WhatsApp
      whatsapp_numero: s.contact_whatsapp || "",
      whatsapp_mensagem: s.whatsapp_template || "",
      show_whatsapp: s.whatsapp_float_visible ?? true,
      // Legals
      termos: s.terms_content || "",
      politica: s.privacy_policy_content || "",
      cookies_mensagem: s.cookie_banner_message || "",
      // Advanced
      allow_registration: s.allow_registration ?? false,
      footer_description: s.footer_description || "",
      footer_quick_links_visible: s.footer_quick_links_visible ?? false,
      footer_property_types_visible: s.footer_property_types_visible ?? true,
    });
  }, [tenant]);

  // Save to TENANTS settings JSONB (MERGE, not replace)
  const saveMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      // Build settings object from form data, matching real schema keys
      const newSettings: Record<string, any> = {
        name: formData.nome,
        slogan: formData.slogan,
        cnpj: formData.cnpj,
        creci: formData.creci,
        razao_social: formData.razao_social,
        primary_color: formData.primary_color,
        accent_color: formData.accent_color,
        font_family: formData.font_family,
        header_style: formData.header_style,
        footer_style: formData.footer_style,
        gradient_from: formData.gradient_from,
        gradient_to: formData.gradient_to,
        logo_url: formData.logo_url,
        logo_mode: formData.logo_mode || "text",
        hero_headline: formData.hero_headline,
        hero_subheadline: formData.hero_subheadline,
        hero_headline_visible: formData.hero_headline_visible,
        hero_subheadline_visible: formData.hero_subheadline_visible,
        hero_search_visible: formData.hero_search_visible,
        hero_bg_image_url: formData.hero_bg_image_url,
        hero_bg_overlay_opacity: formData.hero_bg_overlay_opacity,
        hero_bg_position: formData.hero_bg_position,
        hero_bg_mode: formData.hero_bg_mode,
        stats_counters: {
          properties_count: formData.stats_imoveis,
          clients_served: formData.stats_clientes,
          active_agents: formData.stats_agentes,
          cities_served: formData.stats_cidades,
        },
        favicon_url: formData.favicon_url,
        footer_logo_url: formData.footer_logo_url,
        pwa_nome: formData.pwa_nome,
        pwa_icon_192: formData.pwa_icon_192,
        pwa_icon_512: formData.pwa_icon_512,
        contact_phone: formData.telefone,
        contact_whatsapp: formData.whatsapp,
        contact_email: formData.email,
        business_hours: formData.horarios,
        contact_address: formData.endereco,
        social_instagram: formData.instagram,
        social_facebook: formData.facebook,
        social_linkedin: formData.linkedin,
        social_youtube: formData.youtube,
        social_tiktok: formData.tiktok,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_image_url: formData.seo_image_url,
        whatsapp_template: formData.whatsapp_mensagem,
        whatsapp_float_visible: formData.show_whatsapp,
        terms_content: formData.termos,
        privacy_policy_content: formData.politica,
        cookie_banner_message: formData.cookies_mensagem,
        allow_registration: formData.allow_registration,
        footer_description: formData.footer_description || "",
        footer_quick_links_visible: formData.footer_quick_links_visible ?? false,
        footer_property_types_visible: formData.footer_property_types_visible ?? true,
      };

      // CRITICAL FIX: PostgREST .update({ settings: {...} }) REPLACES the entire JSONB.
      // The direct call also gets BLOCKED by RLS for developer role.
      // Solution: Use the save-tenant-settings Edge Function which uses service_role
      // and MERGES settings (newSettings overrides existing).
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Não autenticado — faça login novamente");

      const res = await fetch(
        "https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/save-tenant-settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ tenantId, settings: newSettings }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
      const result = await res.json();
      if (!result?.ok) throw new Error(result?.error || "Falha ao salvar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      sonnerToast({ title: "Salvo!", description: "Configurações atualizadas." });
    },
    onError: (err: any) => {
      const msg = (err?.message) || String(err || "Erro desconhecido");
      sonnerToast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    }
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync(form);
    } finally {
      setSaving(false);
    }
  }, [form, saveMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  const sectionTitles: Record<Section, { title: string; desc: string }> = {
    identidade: { title: "Identidade", desc: "Nome, CNPJ, CRECI e dados da imobiliária" },
    apariencia: { title: "Aparência", desc: "Paletas, cores, fontes, header e footer" },
    logos: { title: "Logos", desc: "Logo do header, footer e favicon" },
    contatos: { title: "Contatos", desc: "Telefone, WhatsApp, email e horários" },
    redes: { title: "Redes Sociais", desc: "Instagram, Facebook, LinkedIn, YouTube, TikTok" },
    endereco: { title: "Endereço", desc: "Rua, número, bairro, cidade, estado, CEP" },
    portal: { title: "Portal Público", desc: "Hero, título, subtítulo e contadores" },
    seo: { title: "SEO", desc: "Meta tags, título, descrição e compartilhamento" },
    analytics: { title: "Analytics", desc: "Configurações de análise de tráfego" },
    pixel: { title: "Meta Pixel", desc: "Pixel do Meta para conversão" },
    whatsapp: { title: "WhatsApp", desc: "Número, mensagem e botão flutuante" },
    ia: { title: "IA", desc: "Configurações de inteligência artificial" },
    legais: { title: "Páginas Legais", desc: "Termos de uso e política de privacidade" },
    cookies: { title: "Cookies", desc: "Mensagem do banner de cookies" },
    pwa: { title: "PWA", desc: "Ícones e nome do app instalável" },
    avancado: { title: "Avançado", desc: "Configurações técnicas do sistema" },
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden border bg-card">

      {/* ── COLUNA ESQUERDA: Sidebar ───────────────────────────────────── */}
      <div className={cn(
        "flex flex-col border-r border-border transition-all duration-300 bg-card",
        sidebarOpen ? "w-52" : "w-12"
      )}>
        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center p-2 border-b border-border hover:bg-muted/50 transition-colors text-muted-foreground">
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.filter(s => s.id !== "avancado" || isDev).map(section => (
            <button key={section.id} onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150",
                sidebarOpen ? "justify-start" : "justify-center",
                activeSection === section.id
                  ? "bg-primary/10 text-primary border-r-2 border-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}>
              {section.icon}
              {sidebarOpen && <span className="text-xs">{section.label}</span>}
            </button>
          ))}
        </nav>

        {/* Save button */}
        <div className="p-3 border-t border-border">
          <Button onClick={handleSave} disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-xs h-9">
            {saving ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Save className="w-3.5 h-3.5" /> Salvar</>
            )}
          </Button>
        </div>
      </div>

      {/* ── COLUNA CENTRAL: Painel de Edição ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          {/* Header da seção */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {SECTIONS.find(s => s.id === activeSection)?.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{sectionTitles[activeSection]?.title}</h2>
              <p className="text-xs text-muted-foreground">{sectionTitles[activeSection]?.desc}</p>
            </div>
          </div>

          {/* Section panels */}
          {activeSection === "identidade" && <IdentidadePanel form={form} set={set} />}
          {activeSection === "aparencia" && <AparenciaPanel form={form} set={set} />}
          {activeSection === "logos" && <LogosPanel form={form} set={set} tenantId={tenantId} />}
          {activeSection === "contatos" && <ContatosPanel form={form} set={set} />}
          {activeSection === "redes" && <RedesPanel form={form} set={set} />}
          {activeSection === "endereco" && <EnderecoPanel form={form} set={set} />}
          {activeSection === "portal" && <PortalPanel form={form} set={set} />}
          {activeSection === "seo" && <SeoPanel form={form} set={set} />}
          {activeSection === "analytics" && <PlaceholderPanel label="Analytics" icon={<BarChart3 className="w-5 h-5" />} />}
          {activeSection === "pixel" && <PlaceholderPanel label="Meta Pixel" icon={<Target className="w-5 h-5" />} />}
          {activeSection === "whatsapp" && <WhatsAppPanel form={form} set={set} />}
          {activeSection === "ia" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Sparkles className="w-10 h-10 text-primary mb-3" />
              <h3 className="font-semibold text-sm mb-1">Configurações de IA</h3>
              <p className="text-xs text-muted-foreground mb-3">Gerencie agentes, automações e modelos</p>
              <Button variant="outline" size="sm" onClick={() => window.location.hash = "#/admin/configuracoes-ia"} className="text-xs gap-1.5">
                <ExternalLink className="w-3 h-3" /> Ir para Configurações de IA
              </Button>
            </div>
          )}
          {activeSection === "legais" && <LegaisPanel form={form} set={set} />}
          {activeSection === "cookies" && <CookiesPanel form={form} set={set} />}
          {activeSection === "pwa" && <PwaPanel form={form} set={set} />}
          {activeSection === "avancado" && isDev && <AvancadoPanel form={form} set={set} />}
        </div>
      </div>

      {/* ── COLUNA DIREITA: Preview ─────────────────────────────────────── */}
      <div className="w-72 border-l border-border bg-muted/10 p-4 flex flex-col gap-3 overflow-y-auto hidden xl:flex">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Prévia ao Vivo</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">{viewport === "desktop" ? "900px" : viewport === "tablet" ? "640px" : "375px"}</Badge>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex justify-center pb-4 pt-2">
            <SitePreview
              primaryColor={form.primary_color || "#003366"}
              accentColor={form.accent_color || "#0066CC"}
              fontFamily={form.font_family || "Plus Jakarta Sans"}
              headerStyle={form.header_style || "solid-dark"}
              footerStyle={form.footer_style || "dark"}
              heroTitle={form.hero_headline || "Encontre o imóvel ideal"}
              heroSubtitle={form.hero_subheadline || "Os melhores imóveis do Brasil"}
              showWhatsapp={form.show_whatsapp !== false}
              viewport={viewport}
            />
          </div>
        </div>

        {/* Viewport switcher */}
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map(v => {
            const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : MobileIcon;
            return (
              <button key={v} onClick={() => setViewport(v)}
                className={cn("flex-1 p-2 rounded-md transition-all text-xs flex items-center justify-center gap-1",
                  viewport === v ? "bg-background shadow-sm text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Color info */}
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
          <div className="w-8 h-8 rounded-lg border shadow-sm" style={{ backgroundColor: form.primary_color }} />
          <div className="w-8 h-8 rounded-lg border shadow-sm" style={{ backgroundColor: form.accent_color }} />
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{PALETTES.find(p => p.primary === form.primary_color && p.accent === form.accent_color)?.name || "Personalizado"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{form.font_family}</p>
          </div>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.open("https://arrudaimobi.com.br/", "_blank")}>
          <ExternalLink className="w-3 h-3" /> Abrir site
        </Button>
      </div>
    </div>
  );
}