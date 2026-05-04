import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Type } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

export function HomeCustomization() {
  const { tenant, saveSettings, toast } = useAdminTenant();
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [footerDesc, setFooterDesc] = useState("");
  const [headlineVisible, setHeadlineVisible] = useState(true);
  const [subheadlineVisible, setSubheadlineVisible] = useState(true);
  const [searchVisible, setSearchVisible] = useState(true);
  const [footerQuickLinksVisible, setFooterQuickLinksVisible] = useState(true);
  const [footerPropertyTypesVisible, setFooterPropertyTypesVisible] = useState(true);

  useEffect(() => {
    const s = (tenant?.settings as TenantSettings) || {};
    setHeadline(s.hero_headline || "");
    setSubheadline(s.hero_subheadline || "");
    setFooterDesc(s.footer_description || "");
    setHeadlineVisible(s.hero_headline_visible !== false);
    setSubheadlineVisible(s.hero_subheadline_visible !== false);
    setSearchVisible(s.hero_search_visible !== false);
    setFooterQuickLinksVisible(s.footer_quick_links_visible !== false);
    setFooterPropertyTypesVisible(s.footer_property_types_visible !== false);
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: () => saveSettings({
      hero_headline: headline.trim(),
      hero_subheadline: subheadline.trim(),
      footer_description: footerDesc.trim(),
      hero_headline_visible: headlineVisible,
      hero_subheadline_visible: subheadlineVisible,
      hero_search_visible: searchVisible,
      footer_quick_links_visible: footerQuickLinksVisible,
      footer_property_types_visible: footerPropertyTypesVisible,
    }),
    onSuccess: () => toast({ title: "Personalização salva!" }),
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Type className="h-5 w-5 text-primary" /> Personalização da Home
        </CardTitle>
        <CardDescription>Personalize o título e subtítulo do hero da página inicial</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium">Título Principal (Headline)</label>
            <div className="flex items-center gap-2">
              <Label htmlFor="headline-visible" className="text-xs text-muted-foreground">
                {headlineVisible ? "Visível" : "Oculto"}
              </Label>
              <Switch id="headline-visible" checked={headlineVisible} onCheckedChange={setHeadlineVisible} />
            </div>
          </div>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Encontre o imóvel dos seus sonhos" maxLength={120} disabled={!headlineVisible} />
          <p className="mt-1 text-xs text-muted-foreground">{headline.length}/120 caracteres</p>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium">Subtítulo (Subheadline)</label>
            <div className="flex items-center gap-2">
              <Label htmlFor="subheadline-visible" className="text-xs text-muted-foreground">
                {subheadlineVisible ? "Visível" : "Oculto"}
              </Label>
              <Switch id="subheadline-visible" checked={subheadlineVisible} onCheckedChange={setSubheadlineVisible} />
            </div>
          </div>
          <Textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Conectamos você às melhores oportunidades imobiliárias." maxLength={200} rows={2} disabled={!subheadlineVisible} />
          <p className="mt-1 text-xs text-muted-foreground">{subheadline.length}/200 caracteres</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="search-visible" className="text-sm font-medium">Barra de Busca do Hero</Label>
            <p className="text-xs text-muted-foreground">Exibir a barra de busca na seção hero da página inicial</p>
          </div>
          <Switch id="search-visible" checked={searchVisible} onCheckedChange={setSearchVisible} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="footer-quick-links-visible" className="text-sm font-medium">Links Rápidos</Label>
              <p className="text-xs text-muted-foreground">Mostrar a seção Links Rápidos no rodapé</p>
            </div>
            <Switch id="footer-quick-links-visible" checked={footerQuickLinksVisible} onCheckedChange={setFooterQuickLinksVisible} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="footer-property-types-visible" className="text-sm font-medium">Tipos de Imóvel</Label>
              <p className="text-xs text-muted-foreground">Mostrar a seção Tipos de Imóvel no rodapé</p>
            </div>
            <Switch id="footer-property-types-visible" checked={footerPropertyTypesVisible} onCheckedChange={setFooterPropertyTypesVisible} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Descrição do Rodapé</label>
          <Textarea value={footerDesc} onChange={(e) => setFooterDesc(e.target.value)} placeholder="Sua plataforma completa para encontrar o imóvel ideal..." maxLength={300} rows={3} />
          <p className="mt-1 text-xs text-muted-foreground">{footerDesc.length}/300 caracteres</p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Personalização
        </Button>
      </CardContent>
    </Card>
  );
}
