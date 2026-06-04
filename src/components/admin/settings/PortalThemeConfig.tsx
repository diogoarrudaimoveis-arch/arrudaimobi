import { useState, useEffect, useCallback } from "react";
import { Loader2, Eye, Smartphone, Monitor, Tablet, Palette, Layout, Type, Image, Globe, Check, Save, ExternalLink, Sliders, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sonnerToast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalTemplateSelector, PORTAL_TEMPLATES, type PortalTemplate } from "./PortalTemplateSelector";

interface PortalThemeConfigProps {
  tenantId: string;
}

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
  { id: "transparent", label: "Transparente", bg: "bg-transparent border-b border-white/20" },
  { id: "solid-dark", label: "Fundo Escuro", bg: "bg-slate-900" },
  { id: "white", label: "Fundo Branco", bg: "bg-white" },
  { id: "gradient", label: "Gradiente", bg: "bg-gradient-to-r from-slate-900 to-slate-700" },
  { id: "glass", label: "Glass", bg: "bg-white/10 backdrop-blur-md border border-white/20" },
  { id: "light-solid", label: "Fundo Claro", bg: "bg-slate-50" },
];

const FOOTER_STYLES = [
  { id: "dark", label: "Escuro", bg: "bg-slate-900 text-white" },
  { id: "light", label: "Claro", bg: "bg-white text-slate-900" },
  { id: "gradient", label: "Gradiente", bg: "bg-gradient-to-r from-slate-800 to-slate-900 text-white" },
  { id: "warm", label: "Quente", bg: "bg-amber-900 text-amber-50" },
  { id: "colored", label: "Colorido", bg: "bg-primary text-white" },
];

export function PortalThemeConfig({ tenantId }: PortalThemeConfigProps) {
  const queryClient = useQueryClient();
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [activeTab, setActiveTab] = useState("templates");
  const [saving, setSaving] = useState(false);
  const [previewUrl] = useState("https://arrudaimobi.com.br/");

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
  const [showNewsletter, setShowNewsletter] = useState(true);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImageUrl, setSeoImageUrl] = useState("");
  const [uploadingSeo, setUploadingSeo] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [cookieMsg, setCookieMsg] = useState("");

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
      setShowNewsletter(settings.theme_show_newsletter ?? true);
      setFaviconUrl(settings.favicon_url || "");
      setSeoTitle(settings.seo_title || "");
      setSeoDescription(settings.seo_description || "");
      setSeoImageUrl(settings.seo_image_url || "");
      setTermsContent(settings.terms_content || "");
      setPrivacyContent(settings.privacy_policy_content || "");
      try {
        const parsed = typeof settings.cookie_banner_json === 'string'
          ? JSON.parse(settings.cookie_banner_json)
          : settings.cookie_banner_json;
        if (parsed?.message) setCookieMsg(parsed.message);
      } catch (e) { /* ignore */ }
    }
  }, [settings]);

  const upsertMutation = useMutation({
    mutationFn: async (updates: any) => {
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
        theme_show_newsletter: showNewsletter,
        theme_hero_title: heroTitle,
        theme_hero_subtitle: heroSubtitle,
        favicon_url: faviconUrl,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_image_url: seoImageUrl,
        terms_content: termsContent,
        privacy_policy_content: privacyContent,
        cookie_banner_json: { message: cookieMsg },
      });
      sonnerToast({ title: "Configurações salvas!", description: "Portal público atualizado com sucesso." });
    } finally {
      setSaving(false);
    }
  }, [portalTemplate, primaryColor, accentColor, fontFamily, headerStyle, footerStyle, heroTitle, heroSubtitle, showWhatsapp, showNewsletter, faviconUrl, seoTitle, seoDescription, seoImageUrl, termsContent, privacyContent, cookieMsg]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando configurador...</span>
      </div>
    );
  }

  const selectedTemplate = PORTAL_TEMPLATES.find(t => t.id === portalTemplate);
  const viewportWidths = { desktop: 900, tablet: 640, mobile: 375 };
  const viewportHeights = { desktop: 520, tablet: 480, mobile: 640 };

  // Generate CSS vars for the preview
  const previewVars = {
    "--preview-primary": primaryColor,
    "--preview-accent": accentColor,
    "--preview-font": fontFamily,
  };

  return (
    <div className="space-y-6">
      {/* === HEADER BAR === */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sliders className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Configurador do Portal</h2>
            <p className="text-xs text-muted-foreground">Personalize o visual do site público</p>
          </div>
          {selectedTemplate && (
            <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20">
              <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: primaryColor }} />
              <div className="w-4 h-4 rounded-full border border-white shadow-sm -ml-2" style={{ backgroundColor: accentColor }} />
              <span className="text-xs font-medium text-primary ml-1">{selectedTemplate.namePt}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Viewport toggles */}
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5 shrink-0">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={cn(
                  "p-2 rounded-md transition-all duration-150",
                  viewport === v ? "bg-background shadow-sm text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground"
                )}
                title={`Visualizar em ${v}`}
              >
                {v === "desktop" && <Monitor className="h-4 w-4" />}
                {v === "tablet" && <Tablet className="h-4 w-4" />}
                {v === "mobile" && <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0 text-xs"
            onClick={() => window.open(previewUrl, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver site
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-primary hover:bg-primary/90 shrink-0 text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar Tudo
          </Button>
        </div>
      </div>

      {/* === MAIN LAYOUT === */}
      <div
        className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start"
        style={previewVars as any}
      >
        {/* LEFT: Config Panel */}
        <div className="xl:col-span-5 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-10 bg-muted/50 rounded-lg p-1">
              <TabsTrigger
                value="templates"
                className={cn(
                  "gap-2 text-xs font-medium rounded-md transition-all",
                  activeTab === "templates" && "bg-background shadow-sm text-primary"
                )}
              >
                <Layout className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Templates</span>
                <span className="sm:hidden">Templates</span>
              </TabsTrigger>
              <TabsTrigger
                value="theme"
                className={cn(
                  "gap-2 text-xs font-medium rounded-md transition-all",
                  activeTab === "theme" && "bg-background shadow-sm text-primary"
                )}
              >
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tema</span>
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className={cn(
                  "gap-2 text-xs font-medium rounded-md transition-all",
                  activeTab === "content" && "bg-background shadow-sm text-primary"
                )}
              >
                <Type className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Conteúdo</span>
              </TabsTrigger>
            </TabsList>

            {/* ========== TEMPLATES TAB ========== */}
            <TabsContent value="templates" className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Escolha um template</Label>
                  <Badge variant="secondary" className="text-[10px]">{PORTAL_TEMPLATES.length} disponíveis</Badge>
                </div>
                <PortalTemplateSelector value={portalTemplate} onChange={handleTemplateSelect} />
              </div>

              {/* Active palette summary */}
              {selectedTemplate && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-primary">{selectedTemplate.namePt}</p>
                    <button
                      onClick={() => setActiveTab("theme")}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Personalizar <Sliders className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-1 h-8 rounded-lg border-2 border-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
                    />
                    <div className="flex gap-2">
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-lg border shadow-sm" style={{ backgroundColor: primaryColor }} />
                        <p className="text-[9px] text-muted-foreground mt-0.5">Primary</p>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-lg border shadow-sm" style={{ backgroundColor: accentColor }} />
                        <p className="text-[9px] text-muted-foreground mt-0.5">Accent</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                    Fonte: {fontFamily}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ========== THEME TAB ========== */}
            <TabsContent value="theme" className="mt-4 space-y-4">
              {/* Colors */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Paleta de Cores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  {/* Quick color presets */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Atalho:</span>
                    <div className="flex gap-1.5">
                      {[
                        { label: "Azul", color: "#3b82f6" },
                        { label: "Verde", color: "#22c55e" },
                        { label: "Roxo", color: "#8b5cf6" },
                        { label: "Laranja", color: "#f97316" },
                        { label: "Rosa", color: "#ec4899" },
                      ].map(c => (
                        <button
                          key={c.label}
                          onClick={() => setPrimaryColor(c.color)}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    Tipografia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Preview</p>
                    <p className="text-lg font-bold" style={{ fontFamily }}>Arruda Imobiliária</p>
                    <p className="text-sm" style={{ fontFamily }}>Encontre seu imóvel ideal hoje</p>
                  </div>
                </CardContent>
              </Card>

              {/* Structure */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Estrutura do Site
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground">Estilo do Header</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {HEADER_STYLES.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setHeaderStyle(opt.id)}
                          className={cn(
                            "h-10 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center",
                            headerStyle === opt.id
                              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/40 bg-card"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Visual header preview */}
                    <div className={cn("h-8 rounded-md px-3 flex items-center text-[10px] text-white/80 font-medium", HEADER_STYLES.find(h => h.id === headerStyle)?.bg || "bg-gray-200")}>
                      Logo • Menu • Contato
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground">Estilo do Footer</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {FOOTER_STYLES.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFooterStyle(opt.id)}
                          className={cn(
                            "h-10 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center",
                            footerStyle === opt.id
                              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/40 bg-card"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Visual footer preview */}
                    <div className={cn("h-8 rounded-md px-3 flex items-center text-[10px] font-medium", FOOTER_STYLES.find(f => f.id === footerStyle)?.bg || "bg-gray-800 text-white")}>
                      © 2026 Arruda Imobi • Links • Redes Sociais
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visual elements */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    Elementos do Portal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
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
                      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center text-[6px]", showWhatsapp && "translate-x-5")}>
                        {showWhatsapp ? <Check className="h-3 w-3 text-primary" /> : <X className="h-3 w-3 text-muted" />}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Newsletter no Footer</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Campo de email para capture de leads</p>
                    </div>
                    <button
                      onClick={() => setShowNewsletter(!showNewsletter)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors shrink-0",
                        showNewsletter ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center text-[6px]", showNewsletter && "translate-x-5")}>
                        {showNewsletter ? <Check className="h-3 w-3 text-primary" /> : <X className="h-3 w-3 text-muted" />}
                      </span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========== CONTENT TAB ========== */}
            <TabsContent value="content" className="mt-4 space-y-4">
              {/* Hero */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Hero da Página Principal</CardTitle>
                  <CardDescription className="text-xs">Texto que aparece na capa do site</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Título Principal (Headline)</Label>
                    <div className="flex items-center gap-2">
                      <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
                      <span className={cn("text-[10px] shrink-0", heroTitle.length > 60 ? "text-amber-500" : "text-muted-foreground")}>
                        {heroTitle.length}/60
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Subtítulo (Subheadline)</Label>
                    <div className="flex items-center gap-2">
                      <Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
                      <span className={cn("text-[10px] shrink-0", heroSubtitle.length > 100 ? "text-amber-500" : "text-muted-foreground")}>
                        {heroSubtitle.length}/100
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">SEO e Redes Sociais</CardTitle>
                  <CardDescription className="text-xs">Como o site aparece no Google e WhatsApp</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Título SEO</Label>
                      <span className={cn("text-[10px]", seoTitle.length > 60 || seoTitle.length < 50 ? "text-amber-500" : "text-green-600")}>
                        {seoTitle.length}/50-60
                      </span>
                    </div>
                    <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Descrição SEO</Label>
                      <span className={cn("text-[10px]", seoDescription.length > 160 || seoDescription.length < 120 ? "text-amber-500" : "text-green-600")}>
                        {seoDescription.length}/120-160
                      </span>
                    </div>
                    <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Imagem de Compartilhamento (OG)</Label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild disabled={uploadingSeo} className="gap-1.5 text-xs">
                          <span>{uploadingSeo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3 w-3" />} Upload Imagem</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleSeoImageUpload} disabled={uploadingSeo} />
                      </label>
                      {seoImageUrl && (
                        <Button variant="ghost" size="sm" onClick={() => setSeoImageUrl("")} className="text-xs">
                          <X className="h-3 w-3 mr-1" /> Remover
                        </Button>
                      )}
                    </div>
                    {seoImageUrl && (
                      <div className="relative rounded-lg overflow-hidden border">
                        <img src={seoImageUrl} alt="OG Preview" className="w-full h-36 object-cover" />
                        <div className="absolute bottom-2 left-2 text-[9px] bg-black/70 text-white px-2 py-1 rounded">1200x630px</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Identity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Identidade Visual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Favicon (ícone da aba)</Label>
                    <div className="flex items-center gap-3">
                      {faviconUrl ? (
                        <div className="w-12 h-12 rounded-lg border bg-card flex items-center justify-center overflow-hidden">
                          <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-xl">🏠</span>
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild disabled={uploadingFavicon} className="gap-1.5 text-xs">
                          <span>{uploadingFavicon ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3 w-3" />} Trocar</span>
                        </Button>
                        <input type="file" accept=".ico,.png,.jpg" className="hidden" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                      </label>
                      {faviconUrl && (
                        <Button variant="ghost" size="sm" onClick={() => setFaviconUrl("")} className="text-xs text-muted-foreground">
                          <X className="h-3 w-3 mr-1" /> Remover
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">PNG ou ICO 32x32px, fundo transparente</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cookies */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Banner de Cookies</CardTitle>
                  <CardDescription className="text-xs">Aviso exibido aos visitantes sobre coleta de dados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Mensagem do Banner</Label>
                    <Textarea
                      value={cookieMsg}
                      onChange={(e) => setCookieMsg(e.target.value)}
                      rows={2}
                      placeholder="Utilizamos cookies para melhorar sua experiência. Ao continuar navegando você concorda com nossas políticas."
                      className="text-sm"
                    />
                  </div>
                  {/* Cookie banner preview */}
                  <div className="rounded-lg border bg-slate-50 p-3 flex items-center gap-3">
                    <span className="text-sm">🍪</span>
                    <p className="text-[11px] text-muted-foreground flex-1">{cookieMsg || "Utilizamos cookies para melhorar sua experiência..."}</p>
                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 text-[10px] rounded bg-muted text-muted-foreground font-medium">Recusar</button>
                      <button className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground font-medium">Aceitar</button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="xl:col-span-7">
          <div className="sticky top-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">Prévia ao Vivo</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{viewportWidths[viewport]}px</Badge>
                {selectedTemplate && (
                  <Badge variant="outline" className="text-[10px] bg-primary/5">{selectedTemplate.namePt}</Badge>
                )}
              </div>
            </div>

            {/* Browser frame */}
            <div
              className="bg-muted rounded-2xl border border-border overflow-hidden shadow-xl transition-all duration-300 mx-auto"
              style={{ width: viewportWidths[viewport] }}
            >
              {/* Browser chrome */}
              <div className="h-9 bg-slate-100 dark:bg-slate-800 border-b border-border flex items-center px-3 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="h-5 bg-white/80 dark:bg-slate-700/80 rounded-md px-3 flex items-center text-[10px] text-muted-foreground/60 font-mono">
                    arrudaimobi.com.br
                  </div>
                </div>
              </div>

              {/* Mock site preview using actual theme colors */}
              <div style={{ height: viewportHeights[viewport], overflowY: "auto", fontFamily }}>
                <MockSitePreview
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  fontFamily={fontFamily}
                  headerStyle={headerStyle}
                  footerStyle={footerStyle}
                  heroTitle={heroTitle}
                  heroSubtitle={heroSubtitle}
                  showWhatsapp={showWhatsapp}
                  showNewsletter={showNewsletter}
                />
              </div>
            </div>

            {/* Palette + quick actions */}
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
              <div className="h-12 w-px bg-border mx-1" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{selectedTemplate?.namePt || "Personalizado"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{fontFamily}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.open(previewUrl, '_blank')} className="gap-1.5 text-xs shrink-0">
                <ExternalLink className="h-3 w-3" /> Abrir site
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MOCK SITE PREVIEW COMPONENT ============
function MockSitePreview({
  primaryColor, accentColor, fontFamily, headerStyle, footerStyle,
  heroTitle, heroSubtitle, showWhatsapp, showNewsletter
}: {
  primaryColor: string; accentColor: string; fontFamily: string;
  headerStyle: string; footerStyle: string;
  heroTitle: string; heroSubtitle: string;
  showWhatsapp: boolean; showNewsletter: boolean;
}) {
  const headerBg = {
    "transparent": "bg-transparent",
    "solid-dark": "bg-slate-900",
    "white": "bg-white border-b",
    "gradient": "bg-gradient-to-r from-slate-900 to-slate-700",
    "glass": "bg-white/10 backdrop-blur-md border-b border-white/20",
    "light-solid": "bg-slate-50 border-b",
  }[headerStyle] || "bg-slate-900";

  const footerBg = {
    "dark": "bg-slate-900",
    "light": "bg-white border-t",
    "gradient": "bg-gradient-to-r from-slate-800 to-slate-900",
    "warm": "bg-amber-900",
    "colored": "",
  }[footerStyle] || "bg-slate-900";

  const isFooterColored = footerStyle === "colored";

  return (
    <div className="w-full" style={{ fontFamily }}>
      {/* HEADER */}
      <div className={cn("px-6 py-3 flex items-center justify-between", headerBg, headerStyle === "transparent" ? "text-white" : headerStyle === "glass" ? "text-white" : "text-white")}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <span className="font-bold text-sm">Arruda Imobi</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span>Imóveis</span>
          <span>Blog</span>
          <span>Agentes</span>
          <span>Contato</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-xs">👤</div>
        </div>
      </div>

      {/* HERO */}
      <div
        className="relative px-6 py-12 text-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{heroTitle}</h1>
          <p className="text-xs sm:text-sm text-white/80 mb-6 max-w-md mx-auto">{heroSubtitle}</p>
          {/* Search bar mock */}
          <div className="flex max-w-sm mx-auto gap-2">
            <div className="flex-1 bg-white rounded-lg px-4 py-2.5 text-xs text-muted-foreground text-left">Bairro, cidade ou tipo...</div>
            <div className="bg-white rounded-lg px-4 py-2.5 text-xs text-muted-foreground">Buscar</div>
          </div>
        </div>
      </div>

      {/* FEATURED PROPERTIES */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="w-20 h-4 rounded bg-slate-200 mb-1" />
            <div className="w-32 h-2 rounded bg-slate-100" />
          </div>
          <div className="w-16 h-6 rounded-full" style={{ backgroundColor: primaryColor + "20" }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg overflow-hidden border">
              <div className="h-16 bg-slate-200" />
              <div className="p-2">
                <div className="w-3/4 h-2 rounded bg-slate-200 mb-1" />
                <div className="w-1/2 h-2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="px-6 py-6 bg-slate-50">
        <div className="grid grid-cols-4 gap-3">
          {[{ n: "150+", l: "Imóveis" }, { n: "2.3K", l: "Clientes" }, { n: "12", l: "Agentes" }, { n: "5", l: "Cidades" }].map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-full h-6 rounded bg-white border mb-1" style={{ borderColor: i === 0 ? accentColor : undefined }} />
              <div className="w-1/2 h-1.5 rounded bg-slate-200 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className={cn("px-6 py-6", isFooterColored ? "" : footerBg, isFooterColored ? `text-white` : "")}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {["Links", "Imóveis", "Contato"].map((col) => (
            <div key={col}>
              <div className="w-12 h-2 rounded mb-2" style={{ backgroundColor: isFooterColored ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)" }} />
              {[1, 2, 3].map((l) => (
                <div key={l} className="w-full h-1.5 rounded mb-1" style={{ backgroundColor: isFooterColored ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          ))}
        </div>
        {showNewsletter && (
          <div className="w-full h-8 rounded-lg mb-3" style={{ backgroundColor: isFooterColored ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)" }} />
        )}
        <div className="h-px rounded" style={{ backgroundColor: isFooterColored ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)" }} />
      </div>

      {/* WhatsApp float */}
      {showWhatsapp && (
        <div className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
          <span className="text-white text-sm">💬</span>
        </div>
      )}
    </div>
  );
}