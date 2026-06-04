import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sliders, Layout, Palette, Type, Image, Globe, Check, Save, ExternalLink,
  Monitor, Tablet, Smartphone, Eye, ChevronRight, ChevronLeft,
  PaletteIcon, Sparkles, Zap, Shield, Upload, X, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sonnerToast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PORTAL_TEMPLATES, type PortalTemplate } from "./PortalTemplateSelector";

type Viewport = "desktop" | "tablet" | "mobile";

const FONTS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans — Moderna" },
  { value: "Poppins", label: "Poppins — Clean" },
  { value: "Inter", label: "Inter — Minimalista" },
  { value: "Playfair Display", label: "Playfair Display — Luxo" },
  { value: "Merriweather", label: "Merriweather — Clássica" },
  { value: "Outfit", label: "Outfit — Tech" },
  { value: "Space Grotesk", label: "Space Grotesk — Bold" },
  { value: "Nunito", label: "Nunito — Aconchegante" },
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

type Section = "templates" | "theme" | "hero" | "seo" | "branding";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <Layout className="w-4 h-4" /> },
  { id: "theme", label: "Tema & Cores", icon: <PaletteIcon className="w-4 h-4" /> },
  { id: "hero", label: "Hero", icon: <Sparkles className="w-4 h-4" /> },
  { id: "seo", label: "SEO", icon: <Zap className="w-4 h-4" /> },
  { id: "branding", label: "Branding", icon: <Image className="w-4 h-4" /> },
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  "SEO Avançado": <Zap className="w-2.5 h-2.5" />,
  "Design Premium": <Sparkles className="w-2.5 h-2.5" />,
  "Alta Conversão": <Shield className="w-2.5 h-2.5" />,
  "Performance Top": <Zap className="w-2.5 h-2.5" />,
  "Design 2026": <Sparkles className="w-2.5 h-2.5" />,
  "Editor Visual": <Globe className="w-2.5 h-2.5" />,
  "Corretora Premium": <Sparkles className="w-2.5 h-2.5" />,
  "CRM Integrado": <Shield className="w-2.5 h-2.5" />,
};

// Mini site preview component
function SitePreview({
  primaryColor, accentColor, fontFamily, headerStyle, footerStyle,
  heroTitle, heroSubtitle, showWhatsapp, viewport
}: {
  primaryColor: string; accentColor: string; fontFamily: string;
  headerStyle: string; footerStyle: string;
  heroTitle: string; heroSubtitle: string; showWhatsapp: boolean;
  viewport: Viewport;
}) {
  const widths = { desktop: 600, tablet: 440, mobile: 280 };
  const heights = { desktop: 420, tablet: 380, mobile: 520 };
  const w = widths[viewport];

  const headerBg = {
    transparent: "bg-transparent",
    "solid-dark": "bg-slate-900",
    white: "bg-white border-b",
    gradient: "bg-gradient-to-r from-slate-900 to-slate-700",
    glass: "bg-white/10 backdrop-blur-md",
    "light-solid": "bg-slate-50 border-b",
  }[headerStyle] || "bg-slate-900";

  const footerBg = {
    dark: "bg-slate-900",
    light: "bg-white border-t",
    gradient: "bg-gradient-to-r from-slate-800 to-slate-900",
    warm: "bg-amber-900",
    colored: "",
  }[footerStyle] || "bg-slate-900";

  const isColoredFooter = footerStyle === "colored";

  return (
    <div
      className="rounded-2xl border border-border overflow-hidden shadow-xl bg-white mx-auto transition-all duration-300"
      style={{ width: w, fontFamily }}
    >
      {/* Browser chrome */}
      <div className="h-7 bg-slate-100 dark:bg-slate-800 border-b border-border flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 mx-3">
          <div className="h-4 bg-white/80 dark:bg-slate-700/80 rounded-md px-2 flex items-center text-[9px] text-muted-foreground/60 font-mono">
            arrudaimobi.com.br
          </div>
        </div>
      </div>

      {/* Site content */}
      <div style={{ height: heights[viewport], overflowY: "auto" }}>
        {/* Header */}
        <div className={cn("px-5 py-2.5 flex items-center justify-between text-white", headerBg)}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              AI
            </div>
            <span className="font-bold text-sm">Arruda Imobi</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            {["Imóveis", "Blog", "Agentes", "Contato"].map(item => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-[10px]">?</div>
        </div>

        {/* Hero */}
        <div className="relative px-5 py-10 text-center"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}>
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10">
            <h1 className="text-base sm:text-lg font-bold text-white mb-1.5">{heroTitle}</h1>
            <p className="text-[10px] sm:text-xs text-white/80 mb-5 max-w-xs mx-auto">{heroSubtitle}</p>
            <div className="flex max-w-xs mx-auto gap-2">
              <div className="flex-1 bg-white rounded-lg px-3 py-2 text-[10px] text-muted-foreground text-left">Bairro, cidade...</div>
              <div className="bg-white rounded-lg px-3 py-2 text-[10px] text-muted-foreground">Buscar</div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="px-5 py-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="w-16 h-3 rounded bg-slate-200 mb-1" />
              <div className="w-24 h-2 rounded bg-slate-100" />
            </div>
            <div className="w-12 h-5 rounded-full" style={{ backgroundColor: primaryColor + "20" }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-lg overflow-hidden border">
                <div className="h-12 bg-slate-200" />
                <div className="p-1.5">
                  <div className="w-3/4 h-1.5 rounded bg-slate-200 mb-1" />
                  <div className="w-1/2 h-1.5 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-4 bg-slate-50">
          <div className="grid grid-cols-4 gap-2">
            {[{ n: "150+", l: "Imóveis" }, { n: "2.3K", l: "Clientes" }, { n: "12", l: "Agentes" }, { n: "5", l: "Cidades" }].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-full h-4 rounded bg-white border mb-1" style={{ borderColor: i === 0 ? accentColor : undefined }} />
                <div className="w-1/2 h-1 rounded bg-slate-200 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={cn("px-5 py-4", isColoredFooter ? "" : footerBg, isColoredFooter ? "" : isColoredFooter ? "" : "text-white")}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {["Links", "Imóveis", "Contato"].map(col => (
              <div key={col}>
                <div className="w-10 h-1.5 rounded mb-1.5" style={{
                  backgroundColor: isColoredFooter ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"
                }} />
                {[1, 2, 3].map(p => (
                  <div key={p} className="w-full h-1 rounded mb-1" style={{
                    backgroundColor: isColoredFooter ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)"
                  }} />
                ))}
              </div>
            ))}
          </div>
          <div className="h-px rounded" style={{
            backgroundColor: isColoredFooter ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"
          }} />
        </div>

        {/* WhatsApp float */}
        {showWhatsapp && (
          <div className="fixed bottom-4 right-4 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-xs">?</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PortalEditorProps {
  tenantId: string;
}

export function PortalEditor({ tenantId }: PortalEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("templates");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [saving, setSaving] = useState(false);

  // Theme state
  const [portalTemplate, setPortalTemplate] = useState("modern-blue");
  const [primaryColor, setPrimaryColor] = useState("#003366");
  const [accentColor, setAccentColor] = useState("#0066CC");
  const [fontFamily, setFontFamily] = useState("Plus Jakarta Sans");
  const [headerStyle, setHeaderStyle] = useState("transparent");
  const [footerStyle, setFooterStyle] = useState("dark");
  const [heroTitle, setHeroTitle] = useState("Encontre o imóvel ideal");
  const [heroSubtitle, setHeroSubtitle] = useState("Os melhores imóveis do Brasil estão aqui");
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [seoImageUrl, setSeoImageUrl] = useState("");
  const [uploadingSeo, setUploadingSeo] = useState(false);

  // Load settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (settings) {
      setPortalTemplate(settings.portal_template || "modern-blue");
      setPrimaryColor(settings.theme_primary_color || "#003366");
      setAccentColor(settings.theme_accent_color || "#0066CC");
      setFontFamily(settings.theme_font_family || "Plus Jakarta Sans");
      setHeaderStyle(settings.theme_header_style || "transparent");
      setFooterStyle(settings.theme_footer_style || "dark");
      setHeroTitle(settings.theme_hero_title || "Encontre o imóvel ideal");
      setHeroSubtitle(settings.theme_hero_subtitle || "Os melhores imóveis do Brasil estão aqui");
      setShowWhatsapp(settings.theme_show_whatsapp_float ?? true);
      setSeoTitle(settings.seo_title || "");
      setSeoDescription(settings.seo_description || "");
      setFaviconUrl(settings.favicon_url || "");
      setSeoImageUrl(settings.seo_image_url || "");
    }
  }, [settings]);

  const upsertMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ ...updates, tenant_id: tenantId }, { onConflict: 'tenant_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (err: any) => {
      sonnerToast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  });

  const handleTemplateSelect = (templateId: string) => {
    setPortalTemplate(templateId);
    const template = PORTAL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setPrimaryColor(template.colors.primary);
      setAccentColor(template.colors.accent);
      setFontFamily(template.colors.font);
      setHeaderStyle(template.colors.header);
      setFooterStyle(template.colors.footer);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFavicon(true);
    try {
      const filename = `favicon-${tenantId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("property-images").upload(`branding/${filename}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(`branding/${filename}`);
      setFaviconUrl(data.publicUrl);
      sonnerToast({ title: "Favicon enviado!", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> });
    } catch (err: any) {
      sonnerToast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSeoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSeo(true);
    try {
      const filename = `seo-${tenantId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("property-images").upload(`branding/${filename}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(`branding/${filename}`);
      setSeoImageUrl(data.publicUrl);
      sonnerToast({ title: "Imagem de compartilhamento enviada!", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> });
    } catch (err: any) {
      sonnerToast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploadingSeo(false);
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await upsertMutation.mutateAsync({
        portal_template: portalTemplate,
        theme_primary_color: primaryColor,
        theme_accent_color: accentColor,
        theme_font_family: fontFamily,
        theme_header_style: headerStyle,
        theme_footer_style: footerStyle,
        theme_hero_layout: "search-centered",
        theme_card_style: "rounded-shadow",
        theme_show_whatsapp_float: showWhatsapp,
        theme_hero_title: heroTitle,
        theme_hero_subtitle: heroSubtitle,
        favicon_url: faviconUrl,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_image_url: seoImageUrl,
      });
      sonnerToast({ title: "Salvo!", description: "Configurações do portal atualizadas.", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> });
    } catch (err: any) {
      sonnerToast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [portalTemplate, primaryColor, accentColor, fontFamily, headerStyle, footerStyle, heroTitle, heroSubtitle, showWhatsapp, faviconUrl, seoTitle, seoDescription, seoImageUrl]);

  const selectedTemplate = PORTAL_TEMPLATES.find(t => t.id === portalTemplate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando editor...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden border bg-card">
      {/* === LEFT SIDEBAR === */}
      <div className={cn(
        "w-56 border-r border-border flex flex-col transition-all duration-300 bg-card",
        !sidebarOpen && "w-12"
      )}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center p-2 border-b border-border hover:bg-muted/50 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Section nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150",
                sidebarOpen ? "justify-start" : "justify-center",
                activeSection === section.id
                  ? "bg-primary/10 text-primary border-r-2 border-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {section.icon}
              {sidebarOpen && <span>{section.label}</span>}
            </button>
          ))}
        </nav>

        {/* Save button */}
        {sidebarOpen && (
          <div className="p-3 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-primary hover:bg-primary/90">
              {saving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          </div>
        )}
      </div>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Header bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Editor do Portal</h1>
                <p className="text-xs text-muted-foreground">Personalize o visual do site público</p>
              </div>
              {selectedTemplate && (
                <div className="ml-4 px-3 py-1 rounded-full bg-primary/5 border border-primary/20 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: primaryColor }} />
                  <div className="w-4 h-4 rounded-full border border-white shadow-sm -ml-1.5" style={{ backgroundColor: accentColor }} />
                  <span className="text-xs font-medium text-primary">{selectedTemplate.namePt}</span>
                </div>
              )}
            </div>

            {/* Viewport toggles */}
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
                  const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
                  return (
                    <button
                      key={v}
                      onClick={() => setViewport(v)}
                      className={cn(
                        "p-2 rounded-md transition-all duration-150",
                        viewport === v
                          ? "bg-background shadow-sm text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title={v}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => window.open("https://arrudaimobi.com.br/", "_blank")}
              >
                <ExternalLink className="w-3 h-3" />
                Ver site
              </Button>
            </div>
          </div>

          {/* === SECTION CONTENT === */}
          {activeSection === "templates" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">Escolha um template</h2>
                <p className="text-xs text-muted-foreground">Selecione o visual base do seu portal público</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PORTAL_TEMPLATES.map((template) => {
                  const isSelected = portalTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={cn(
                        "relative w-full text-left rounded-xl overflow-hidden border-2 transition-all duration-200",
                        "hover:shadow-lg hover:scale-[1.01]",
                        isSelected
                          ? "border-primary shadow-md ring-2 ring-primary/30"
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
                        <img
                          src={template.image}
                          alt={template.namePt}
                          className="w-full h-full object-cover"
                        />
                        <div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(to bottom, transparent 40%, ${template.colors.primary}aa 100%)` }}
                        />
                        {template.feature && (
                          <div
                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold shadow-md text-white"
                            style={{ backgroundColor: template.colors.accent }}
                          >
                            {FEATURE_ICONS[template.feature]}
                            {template.feature}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold text-foreground leading-tight">{template.namePt}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: template.colors.primary }} />
                            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm -ml-1" style={{ backgroundColor: template.colors.accent }} />
                          </div>
                          <div className="flex gap-0.5">
                            {template.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[8px] px-1 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "theme" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">Tema & Cores</h2>
                <p className="text-xs text-muted-foreground">Personalize a paleta de cores do portal</p>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Cor Primária</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border hover:border-primary transition-colors"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="text-xs font-mono h-9"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {[{ label: "Azul", color: "#3b82f6" }, { label: "Verde", color: "#22c55e" }, { label: "Roxo", color: "#8b5cf6" }, { label: "Laranja", color: "#f97316" }, { label: "Rosa", color: "#ec4899" }].map(c => (
                      <button
                        key={c.color}
                        onClick={() => setPrimaryColor(c.color)}
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Cor de Destaque</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border hover:border-primary transition-colors"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="text-xs font-mono h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient preview */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Pré-visualização do Gradiente</Label>
                <div
                  className="h-20 rounded-xl border border-border"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
                />
              </div>

              {/* Font */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Família da Fonte</Label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  {FONTS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
                  <p className="text-lg font-bold" style={{ fontFamily }}>Arruda Imobiliária</p>
                  <p className="text-sm" style={{ fontFamily }}>Encontre seu imóvel ideal</p>
                </div>
              </div>

              {/* Header style */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Estilo do Header</Label>
                <div className="grid grid-cols-3 gap-2">
                  {HEADER_STYLES.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setHeaderStyle(h.id)}
                      className={cn(
                        "h-10 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center",
                        headerStyle === h.id
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 bg-card"
                      )}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer style */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Estilo do Footer</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FOOTER_STYLES.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFooterStyle(f.id)}
                      className={cn(
                        "h-10 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center",
                        footerStyle === f.id
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 bg-card"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "hero" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">Hero da Página Principal</h2>
                <p className="text-xs text-muted-foreground">Texto que aparece na capa do site</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Título Principal (Headline)</Label>
                    <span className={cn("text-[10px]", heroTitle.length > 60 ? "text-amber-500" : "text-muted-foreground")}>
                      {heroTitle.length}/60
                    </span>
                  </div>
                  <Input
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Subtítulo (Subheadline)</Label>
                    <span className={cn("text-[10px]", heroSubtitle.length > 100 ? "text-amber-500" : "text-muted-foreground")}>
                      {heroSubtitle.length}/100
                    </span>
                  </div>
                  <Textarea
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* WhatsApp toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <p className="text-sm font-medium">Botão WhatsApp Flutuante</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Exibe botão verde no canto inferior direito</p>
                  </div>
                  <button
                    onClick={() => setShowWhatsapp(!showWhatsapp)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors shrink-0",
                      showWhatsapp ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center",
                      showWhatsapp && "translate-x-5"
                    )}>
                      {showWhatsapp ? <Check className="w-3 h-3 text-primary" /> : null}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "seo" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">SEO e Redes Sociais</h2>
                <p className="text-xs text-muted-foreground">Como o site aparece no Google e compartilhamento</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Título SEO</Label>
                    <span className={cn("text-[10px]", seoTitle.length > 60 || seoTitle.length < 50 ? "text-amber-500" : "text-green-600")}>
                      {seoTitle.length}/50-60
                    </span>
                  </div>
                  <Input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Arruda Imobi | Sua Plataforma de Gestão Imobiliária"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Descrição SEO</Label>
                    <span className={cn("text-[10px]", seoDescription.length > 160 || seoDescription.length < 120 ? "text-amber-500" : "text-green-600")}>
                      {seoDescription.length}/120-160
                    </span>
                  </div>
                  <Textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Sua plataforma completa para encontrar o imóvel ideal..."
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Imagem de Compartilhamento (OG)</Label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs" disabled={uploadingSeo}>
                        <span>{uploadingSeo ? "Enviando..." : <><Upload className="w-3 h-3" /> Upload Imagem</>}</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSeoImageUpload} disabled={uploadingSeo} />
                    </label>
                    {seoImageUrl && (
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSeoImageUrl("")}>
                        <X className="w-3 h-3 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                  {seoImageUrl && (
                    <div className="relative rounded-lg overflow-hidden border w-full h-36">
                      <img src={seoImageUrl} alt="OG Preview" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 text-[9px] bg-black/70 text-white px-2 py-0.5 rounded">1200x630px</div>
                    </div>
                  )}
                </div>

                {/* WhatsApp preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Simulação (WhatsApp)</Label>
                  <div className="bg-[#E5DDD5] p-4 rounded-xl border border-border shadow-inner">
                    <div className="w-[85%] ml-auto bg-[#DCF8C6] rounded-xl shadow-sm overflow-hidden flex flex-col">
                      {seoImageUrl ? (
                        <div className="w-full h-[100px] bg-white border-b border-[#0000001a] overflow-hidden">
                          <img src={seoImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full h-[100px] bg-[#0000001a] border-b border-[#0000001a] flex items-center justify-center">
                          <span className="text-black/20 text-lg">📷</span>
                        </div>
                      )}
                      <div className="px-3 pt-2 pb-3 bg-[#0000000d]">
                        <h3 className="font-bold text-sm truncate text-[#111111]">{seoTitle || "Título do Site"}</h3>
                        <p className="text-[11px] line-clamp-2 mt-0.5 leading-snug text-[#444444]">{seoDescription || "Descrição do site aparecerá aqui..."}</p>
                        <p className="text-[10px] mt-1.5 truncate text-[#00000066]">arrudaimobi.com.br</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "branding" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">Branding</h2>
                <p className="text-xs text-muted-foreground">Logo, favicon e identidade visual</p>
              </div>

              <div className="space-y-4">
                {/* Favicon */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Favicon (ícone da aba)</Label>
                  <div className="flex items-center gap-3">
                    {faviconUrl ? (
                      <div className="w-12 h-12 rounded-lg border bg-card flex items-center justify-center overflow-hidden">
                        <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <span className="text-xl text-muted-foreground/30">?</span>
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs" disabled={uploadingFavicon}>
                        <span>{uploadingFavicon ? "Enviando..." : <><Upload className="w-3 h-3" /> Trocar</>}</span>
                      </Button>
                      <input type="file" accept=".ico,.png,.jpg" className="hidden" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                    </label>
                    {faviconUrl && (
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setFaviconUrl("")}>
                        <X className="w-3 h-3 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">PNG ou ICO 32x32px, fundo transparente</p>
                </div>

                {/* Logo preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Logo do Header</Label>
                  <div
                    className="h-16 rounded-xl border border-border flex items-center px-4 gap-3"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                      AI
                    </div>
                    <span className="text-white font-bold text-lg" style={{ fontFamily }}>Arruda Imobi</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === RIGHT PREVIEW PANEL === */}
      <div className="w-80 border-l border-border bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Prévia ao Vivo</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {viewport === "desktop" ? "900px" : viewport === "tablet" ? "640px" : "375px"}
          </Badge>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex justify-center pb-4">
            <SitePreview
              primaryColor={primaryColor}
              accentColor={accentColor}
              fontFamily={fontFamily}
              headerStyle={headerStyle}
              footerStyle={footerStyle}
              heroTitle={heroTitle}
              heroSubtitle={heroSubtitle}
              showWhatsapp={showWhatsapp}
              viewport={viewport}
            />
          </div>
        </div>

        {/* Color info */}
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
          <div className="flex gap-3">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl border shadow-sm" style={{ backgroundColor: primaryColor }} />
              <p className="text-[9px] mt-1 text-muted-foreground">Primary</p>
              <p className="text-[8px] font-mono text-muted-foreground/60">{primaryColor}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl border shadow-sm" style={{ backgroundColor: accentColor }} />
              <p className="text-[9px] mt-1 text-muted-foreground">Accent</p>
              <p className="text-[8px] font-mono text-muted-foreground/60">{accentColor}</p>
            </div>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{(selectedTemplate?.namePt) || "Personalizado"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{fontFamily}</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0" onClick={() => window.open("https://arrudaimobi.com.br/", "_blank")}>
            <ExternalLink className="w-3 h-3" /> Abrir
          </Button>
        </div>
      </div>
    </div>
  );
}