import { useState, useEffect, useCallback } from "react";
import { Loader2, Eye, Smartphone, Monitor, Tablet, Palette, Layout, Type, Image, Globe, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sonnerToast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalTemplateSelector, PORTAL_TEMPLATES, type PortalTemplate } from "./PortalTemplateSelector";
import { BlogRichEditor } from "@/components/admin/BlogRichEditor";

interface PortalThemeConfigProps {
  tenantId: string;
}

type Viewport = "desktop" | "tablet" | "mobile";

export function PortalThemeConfig({ tenantId }: PortalThemeConfigProps) {
  const queryClient = useQueryClient();
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [activeTab, setActiveTab] = useState("templates");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("https://arrudaimobi.com.br/");

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

  // Handlers
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
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const selectedTemplate = PORTAL_TEMPLATES.find(t => t.id === portalTemplate);

  const viewportWidths = { desktop: 1280, tablet: 768, mobile: 390 };

  return (
    <div className="space-y-6">
      {/* Header with viewport preview controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Configurador do Portal Público</h2>
          <p className="text-sm text-muted-foreground">Personalize o visual e conteúdo do site público dos seus clientes</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Viewport toggles */}
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewport === v ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                title={v}
              >
                {v === "desktop" && <Monitor className="h-4 w-4" />}
                {v === "tablet" && <Tablet className="h-4 w-4" />}
                {v === "mobile" && <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <Button onClick={() => window.open(previewUrl, '_blank')} variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" /> Ver site
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Salvar Tudo
          </Button>
        </div>
      </div>

      {/* Main layout: config left, preview right */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Config Panel */}
        <div className="xl:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="templates" className="gap-1.5 text-xs">
                <Layout className="h-3.5 w-3.5" /> Templates
              </TabsTrigger>
              <TabsTrigger value="theme" className="gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" /> Tema
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-1.5 text-xs">
                <Type className="h-3.5 w-3.5" /> Conteúdo
              </TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-4 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Escolha um template de portal</Label>
                <PortalTemplateSelector value={portalTemplate} onChange={handleTemplateSelect} />
              </div>
              {selectedTemplate && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-sm font-medium text-primary">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
                </div>
              )}
            </TabsContent>

            {/* Theme Tab */}
            <TabsContent value="theme" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Paleta de Cores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Cor Primária</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="text-xs font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Cor de Destaque</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" /> Tipografia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Família da Fonte</Label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (moderna)</option>
                      <option value="Poppins">Poppins (clean)</option>
                      <option value="Inter">Inter (minimalista)</option>
                      <option value="Playfair Display">Playfair Display (luxo)</option>
                      <option value="Merriweather">Merriweather (clássica)</option>
                      <option value="Outfit">Outfit (tech)</option>
                      <option value="Space Grotesk">Space Grotesk (bold)</option>
                      <option value="Nunito">Nunito (aconchegante)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Estrutura do Site
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Estilo do Header</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "transparent", label: "Transparente" },
                        { id: "solid-dark", label: "Fundo Escuro" },
                        { id: "white", label: "Fundo Branco" },
                        { id: "gradient", label: "Gradiente" },
                        { id: "glass", label: "Glass" },
                        { id: "light-solid", label: "Fundo Claro" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setHeaderStyle(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-md border text-xs transition-colors",
                            headerStyle === opt.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Estilo do Footer</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "dark", label: "Escuro" },
                        { id: "light", label: "Claro" },
                        { id: "gradient", label: "Gradiente" },
                        { id: "warm", label: "Quente" },
                        { id: "colored", label: "Colorido" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFooterStyle(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-md border text-xs transition-colors",
                            footerStyle === opt.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="h-4 w-4" /> Elementos Visuais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Botão WhatsApp Flutuante</Label>
                      <button
                        onClick={() => setShowWhatsapp(!showWhatsapp)}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors",
                          showWhatsapp ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm", showWhatsapp && "translate-x-5")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Newsletter no Footer</Label>
                      <button
                        onClick={() => setShowNewsletter(!showNewsletter)}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors",
                          showNewsletter ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm", showNewsletter && "translate-x-5")} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-4 space-y-4">
              {/* Hero */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Hero da Página Principal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Título Principal</Label>
                    <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Encontre o imóvel ideal" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Subtítulo</Label>
                    <Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Os melhores imóveis do Brasil estão aqui" />
                  </div>
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">SEO e Compartilhamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Título SEO</Label>
                      <span className={cn("text-[10px]", seoTitle.length > 60 || seoTitle.length < 50 ? "text-amber-500" : "text-green-600")}>
                        {seoTitle.length}/50-60
                      </span>
                    </div>
                    <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Descrição SEO</Label>
                      <span className={cn("text-[10px]", seoDescription.length > 160 || seoDescription.length < 120 ? "text-amber-500" : "text-green-600")}>
                        {seoDescription.length}/120-160
                      </span>
                    </div>
                    <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Imagem OG (1200x630)</Label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild disabled={uploadingSeo}>
                          <span>{uploadingSeo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />} Upload</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleSeoImageUpload} disabled={uploadingSeo} />
                      </label>
                      {seoImageUrl && <Button variant="ghost" size="sm" onClick={() => setSeoImageUrl("")}>Remover</Button>}
                    </div>
                    {seoImageUrl && <img src={seoImageUrl} alt="OG Preview" className="w-full h-24 object-cover rounded-lg border" />}
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
                    <Label className="text-xs">Favicon do Site</Label>
                    <div className="flex items-center gap-3">
                      {faviconUrl && (
                        <div className="w-10 h-10 rounded border bg-card flex items-center justify-center overflow-hidden">
                          <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild disabled={uploadingFavicon}>
                          <span>{uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />} Upload Favicon</span>
                        </Button>
                        <input type="file" accept=".ico,.png,.jpg" className="hidden" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                      </label>
                      {faviconUrl && <Button variant="ghost" size="sm" onClick={() => setFaviconUrl("")}>Remover</Button>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">PNG ou ICO 32x32px, fundo transparente</p>
                  </div>
                </CardContent>
              </Card>

              {/* Legal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Documentos Legais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Termos de Serviço</Label>
                    <BlogRichEditor content={termsContent} onChange={setTermsContent} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Política de Privacidade</Label>
                    <BlogRichEditor content={privacyContent} onChange={setPrivacyContent} />
                  </div>
                </CardContent>
              </Card>

              {/* Cookies */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Banner de Cookies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Mensagem do Banner</Label>
                    <Textarea value={cookieMsg} onChange={(e) => setCookieMsg(e.target.value)} rows={2} placeholder="Utilizamos cookies para melhorar sua experiência..." />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="xl:col-span-3">
          <div className="sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Prévia ao Vivo</span>
              <span className="text-xs text-muted-foreground">{viewportWidths[viewport]}px</span>
            </div>
            <div
              className="bg-muted rounded-2xl border border-border overflow-hidden shadow-xl transition-all duration-300"
              style={{ width: Math.min(viewportWidths[viewport], "100%") }}
            >
              {/* Browser chrome */}
              <div className="h-9 bg-slate-100 dark:bg-slate-800 border-b border-border flex items-center px-3 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="h-5 bg-white dark:bg-slate-700 rounded-md px-3 flex items-center text-[10px] text-muted-foreground/60">
                    {previewUrl}
                  </div>
                </div>
              </div>
              {/* Page content mock */}
              <div className="relative" style={{ height: Math.min(600, (600 * viewportWidths[viewport]) / 1280) }}>
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Portal Preview"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Quick color preview */}
            <div className="mt-4 p-4 rounded-xl border border-border bg-card">
              <p className="text-xs font-medium text-muted-foreground mb-3">Paleta Ativa</p>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg border shadow-sm" style={{ backgroundColor: primaryColor }} />
                  <p className="text-[10px] mt-1 text-muted-foreground">Primary</p>
                  <p className="text-[9px] font-mono">{primaryColor}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg border shadow-sm" style={{ backgroundColor: accentColor }} />
                  <p className="text-[10px] mt-1 text-muted-foreground">Accent</p>
                  <p className="text-[9px] font-mono">{accentColor}</p>
                </div>
                <div className="flex-1 ml-4">
                  <p className="text-xs font-medium">{selectedTemplate?.name || "Custom"}</p>
                  <p className="text-[10px] text-muted-foreground font-sans" style={{ fontFamily }}>Font: {fontFamily}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}