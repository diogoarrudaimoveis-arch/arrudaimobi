import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogoCropper } from "./LogoCropper";
import { HeroBgCropper } from "./HeroBgCropper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Palette, ImageIcon, Type, Trash2, Eye, RotateCcw, Monitor } from "lucide-react";
import { updateCachedTenantSettings, type TenantSettings } from "@/hooks/use-tenant-settings";

interface BrandCustomizationProps {
  tenantId: string;
  settings: TenantSettings;
  allSettings: TenantSettings;
}

const COLOR_PRESETS = [
  { label: "Azul", value: "#2563EB" },
  { label: "Verde", value: "#16A34A" },
  { label: "Roxo", value: "#7C3AED" },
  { label: "Vermelho", value: "#DC2626" },
  { label: "Laranja", value: "#EA580C" },
  { label: "Rosa", value: "#DB2777" },
  { label: "Índigo", value: "#4F46E5" },
  { label: "Teal", value: "#0D9488" },
];

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandCustomization({ tenantId, settings, allSettings }: BrandCustomizationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || "#2563EB");
  const [gradientFrom, setGradientFrom] = useState(settings.gradient_from || "#2563EB");
  const [gradientTo, setGradientTo] = useState(settings.gradient_to || "#0EA5E9");
  const [logoMode, setLogoMode] = useState<"text" | "image">(settings.logo_mode || "text");
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || "");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Hero background state
  const [heroBgMode, setHeroBgMode] = useState<"gradient" | "image">(settings.hero_bg_mode || "gradient");
  const [heroBgImageUrl, setHeroBgImageUrl] = useState(settings.hero_bg_image_url || "");
  const [heroBgOverlayOpacity, setHeroBgOverlayOpacity] = useState(settings.hero_bg_overlay_opacity ?? 50);
  const [heroBgPosition, setHeroBgPosition] = useState<"center" | "top" | "bottom">(settings.hero_bg_position || "center");
  const [heroCropperOpen, setHeroCropperOpen] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    setPrimaryColor(settings.primary_color || "#2563EB");
    setGradientFrom(settings.gradient_from || "#2563EB");
    setGradientTo(settings.gradient_to || "#0EA5E9");
    setLogoMode(settings.logo_mode || "text");
    setLogoUrl(settings.logo_url || "");
    setHeroBgMode(settings.hero_bg_mode || "gradient");
    setHeroBgImageUrl(settings.hero_bg_image_url || "");
    setHeroBgOverlayOpacity(settings.hero_bg_overlay_opacity ?? 50);
    setHeroBgPosition(settings.hero_bg_position || "center");
  }, [settings]);

  const syncTenantSettingsCache = (updatedSettings: TenantSettings) => {
    queryClient.setQueryData(["admin-tenant", tenantId], (current: any) =>
      current ? { ...current, settings: updatedSettings } : current
    );

    queryClient.setQueryData(["tenant-settings"], (current: any) =>
      current ? { ...current, settings: updatedSettings } : current
    );
  };

  const handleLogoCropped = async (blob: Blob) => {
    setUploading(true);
    try {
      const filename = `logo-${tenantId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(`logos/${filename}`, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(`logos/${filename}`);
      setLogoUrl(urlData.publicUrl);
      setCropperOpen(false);
      toast({ title: "Logo enviada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleHeroBgCropped = async (blob: Blob) => {
    setUploadingHero(true);
    try {
      const filename = `hero-bg-${tenantId}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(`hero/${filename}`, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(`hero/${filename}`);
      setHeroBgImageUrl(urlData.publicUrl);
      setHeroCropperOpen(false);
      toast({ title: "Imagem do hero enviada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings: TenantSettings = {
        ...settings,
        ...allSettings,
        primary_color: primaryColor,
        gradient_from: gradientFrom,
        gradient_to: gradientTo,
        logo_mode: logoMode,
        logo_url: logoUrl,
        hero_bg_mode: heroBgMode,
        hero_bg_image_url: heroBgImageUrl,
        hero_bg_overlay_opacity: heroBgOverlayOpacity,
        hero_bg_position: heroBgPosition,
      };
      const { error } = await supabase
        .from("tenants")
        .update({ settings: updatedSettings as any })
        .eq("id", tenantId);
      if (error) throw error;

      updateCachedTenantSettings((current) =>
        current
          ? {
              ...current,
              settings: updatedSettings,
            }
          : current
      );
      syncTenantSettingsCache(updatedSettings);

      applyBrandColors(primaryColor, gradientFrom, gradientTo);

      queryClient.invalidateQueries({ queryKey: ["admin-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Personalização visual salva!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl("");
    setLogoMode("text");
  };

  const removeHeroBg = () => {
    setHeroBgImageUrl("");
    setHeroBgMode("gradient");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" /> Identidade Visual
          </CardTitle>
          <CardDescription>Personalize cores, degradê, logomarca e fundo do hero</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Cor Principal</Label>
            <p className="text-xs text-muted-foreground">Define botões, links e elementos de destaque</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                />
              </div>
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPrimaryColor(p.value)}
                  className="group flex flex-col items-center gap-1"
                  title={p.label}
                >
                  <div
                    className={`h-8 w-8 rounded-full border-2 transition-all ${primaryColor === p.value ? "border-foreground scale-110 shadow-lg" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: p.value }}
                  />
                  <span className="text-[10px] text-muted-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gradient Colors */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-sm font-semibold">Degradê do Hero e CTA</Label>
            <p className="text-xs text-muted-foreground">Cores que formam o degradê da seção principal e chamada para ação</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Cor Inicial</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={gradientFrom}
                    onChange={(e) => setGradientFrom(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                  />
                  <Input
                    value={gradientFrom}
                    onChange={(e) => setGradientFrom(e.target.value)}
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cor Final</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={gradientTo}
                    onChange={(e) => setGradientTo(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                  />
                  <Input
                    value={gradientTo}
                    onChange={(e) => setGradientTo(e.target.value)}
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            {/* Gradient Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Eye className="h-3 w-3" /> Pré-visualização</Label>
              <div
                className="h-16 w-full rounded-xl shadow-inner"
                style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
              />
            </div>
          </div>

          {/* Hero Background Mode */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" /> Fundo do Hero
            </Label>
            <p className="text-xs text-muted-foreground">Escolha entre usar o degradê configurado acima ou uma imagem de fundo personalizada</p>

            <RadioGroup value={heroBgMode} onValueChange={(v) => setHeroBgMode(v as "gradient" | "image")} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="gradient" id="hero-gradient" />
                <Label htmlFor="hero-gradient" className="flex items-center gap-1.5 cursor-pointer">
                  <Palette className="h-4 w-4 text-muted-foreground" /> Degradê (padrão)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="image" id="hero-image" />
                <Label htmlFor="hero-image" className="flex items-center gap-1.5 cursor-pointer">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" /> Imagem de fundo
                </Label>
              </div>
            </RadioGroup>

            {heroBgMode === "image" && (
              <div className="space-y-4 rounded-lg border border-border p-4 bg-secondary/20">
                {heroBgImageUrl ? (
                  <div className="space-y-4">
                    {/* Preview with overlay and position */}
                    <div className="relative overflow-hidden rounded-xl border border-border h-40">
                      <img
                        src={heroBgImageUrl}
                        alt="Hero background"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: heroBgPosition }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: `rgba(0, 0, 0, ${heroBgOverlayOpacity / 100})` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-sm font-medium drop-shadow-lg">Pré-visualização do Hero</span>
                      </div>
                    </div>

                    {/* Overlay opacity */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Opacidade do Overlay Escuro: {heroBgOverlayOpacity}%</Label>
                      <p className="text-[11px] text-muted-foreground">Controla a escuridão sobre a imagem para garantir legibilidade do texto</p>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        step={5}
                        value={heroBgOverlayOpacity}
                        onChange={(e) => setHeroBgOverlayOpacity(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0% (sem overlay)</span>
                        <span>90% (muito escuro)</span>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Posição Focal da Imagem</Label>
                      <p className="text-[11px] text-muted-foreground">Define qual parte da imagem fica visível no hero</p>
                      <RadioGroup value={heroBgPosition} onValueChange={(v) => setHeroBgPosition(v as "center" | "top" | "bottom")} className="flex gap-3">
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="top" id="pos-top" />
                          <Label htmlFor="pos-top" className="text-xs cursor-pointer">Topo</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="center" id="pos-center" />
                          <Label htmlFor="pos-center" className="text-xs cursor-pointer">Centro</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="bottom" id="pos-bottom" />
                          <Label htmlFor="pos-bottom" className="text-xs cursor-pointer">Base</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setHeroCropperOpen(true)} className="gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Trocar / Recortar
                      </Button>
                      <Button variant="outline" size="sm" onClick={removeHeroBg} className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setHeroCropperOpen(true)} className="gap-2" disabled={uploadingHero}>
                    {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    Enviar Imagem do Hero
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Logo Mode */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-sm font-semibold">Logomarca</Label>
            <p className="text-xs text-muted-foreground">Escolha entre o texto padrão ou usar uma imagem personalizada</p>

            <RadioGroup value={logoMode} onValueChange={(v) => setLogoMode(v as "text" | "image")} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="text" id="logo-text" />
                <Label htmlFor="logo-text" className="flex items-center gap-1.5 cursor-pointer">
                  <Type className="h-4 w-4 text-muted-foreground" /> Texto + Ícone (padrão)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="image" id="logo-image" />
                <Label htmlFor="logo-image" className="flex items-center gap-1.5 cursor-pointer">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" /> Imagem personalizada
                </Label>
              </div>
            </RadioGroup>

            {logoMode === "image" && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-secondary/20">
                {logoUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-card p-2">
                      <img src={logoUrl} alt="Logo" className="max-h-12 max-w-[200px] object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCropperOpen(true)} className="gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Trocar
                      </Button>
                      <Button variant="outline" size="sm" onClick={removeLogo} className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setCropperOpen(true)} className="gap-2" disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    Enviar Logo
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Identidade Visual
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPrimaryColor("#2563EB");
                setGradientFrom("#2563EB");
                setGradientTo("#0EA5E9");
                setLogoMode("text");
                setLogoUrl("");
                setHeroBgMode("gradient");
                setHeroBgImageUrl("");
                setHeroBgOverlayOpacity(50);
                setHeroBgPosition("center");
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <LogoCropper open={cropperOpen} onClose={() => setCropperOpen(false)} onCropped={handleLogoCropped} />
      <HeroBgCropper open={heroCropperOpen} onClose={() => setHeroCropperOpen(false)} onCropped={handleHeroBgCropped} />
    </>
  );
}

// Utility to apply brand colors as CSS custom properties
export function applyBrandColors(primary?: string, gradientFrom?: string, gradientTo?: string) {
  const root = document.documentElement;
  if (primary) {
    const hsl = hexToHsl(primary);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-ring", hsl);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--accent", hsl.replace(/(\d+)%$/, (_, l) => `${Math.min(parseInt(l) + 40, 96)}%`));
  }
  if (gradientFrom && gradientTo) {
    root.style.setProperty("--gradient-from", gradientFrom);
    root.style.setProperty("--gradient-to", gradientTo);
  }
}
