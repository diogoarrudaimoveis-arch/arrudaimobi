import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Target, Globe, LineChart, Activity, Code2, Hash, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketingSettings {
  id?: string;
  tenant_id: string;
  meta_pixel_id: string;
  ga4_id: string;
  google_ads_id: string;
  gtm_id: string;
  tiktok_pixel_id: string;
  pinterest_tag_id: string;
}

export default function AdminPortalMarketing() {
  const { tenantId, user, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<MarketingSettings>>({
    meta_pixel_id: "",
    ga4_id: "",
    google_ads_id: "",
    gtm_id: "",
    tiktok_pixel_id: "",
    pinterest_tag_id: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["portal-marketing-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_marketing_settings")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        meta_pixel_id: settings.meta_pixel_id || "",
        ga4_id: settings.ga4_id || "",
        google_ads_id: settings.google_ads_id || "",
        gtm_id: settings.gtm_id || "",
        tiktok_pixel_id: settings.tiktok_pixel_id || "",
        pinterest_tag_id: settings.pinterest_tag_id || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;

      const payload = {
        ...formData,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("portal_marketing_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portal_marketing_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-marketing-settings"] });
      toast.success("Configurações de rastreamento atualizadas com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const cards = [
    {
      id: "meta",
      title: "Meta Pixel",
      description: "Rastreamento de conversão para Facebook e Instagram.",
      icon: Target,
      color: "text-blue-600",
      field: "meta_pixel_id",
      placeholder: "Ex: 123456789012345",
    },
    {
      id: "ga4",
      title: "Google Analytics 4",
      description: "Analise o tráfego e comportamento dos usuários no portal.",
      icon: LineChart,
      color: "text-amber-500",
      field: "ga4_id",
      placeholder: "Ex: G-XXXXXXXXXX",
    },
    {
      id: "google_ads",
      title: "Google Ads",
      description: "ID de rastreamento para conversões de anúncios ativos.",
      icon: Activity,
      color: "text-red-500",
      field: "google_ads_id",
      placeholder: "Ex: AW-123456789",
    },
    {
      id: "gtm",
      title: "Google Tag Manager",
      description: "Gestão centralizada de todas as suas tags de marketing.",
      icon: Code2,
      color: "text-blue-500",
      field: "gtm_id",
      placeholder: "Ex: GTM-XXXXXXX",
    },
    {
      id: "tiktok",
      title: "TikTok Pixel",
      description: "Rastreie conversões e audiências na plataforma TikTok.",
      icon: Hash,
      color: "text-slate-900",
      field: "tiktok_pixel_id",
      placeholder: "Ex: CXXXXXXXXXXXXXXXXXXX",
    },
    {
      id: "pinterest",
      title: "Pinterest Tag",
      description: "Rastreie visualizações e intenção de compra no Pinterest.",
      icon: Globe,
      color: "text-red-700",
      field: "pinterest_tag_id",
      placeholder: "Ex: 261XXXXXXXXXX",
    },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Rastreamento do Portal</h1>
            <p className="text-muted-foreground text-sm">
              Configure os pixels e IDs de marketing para o seu portal público.
            </p>
          </div>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="bg-[#003366] hover:bg-[#002244] text-white gap-2 shadow-lg shadow-[#003366]/20"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className="border-slate-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-white shadow-sm border border-slate-100", card.color)}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <CardDescription className="text-slate-600 leading-relaxed min-h-[40px]">
                  {card.description}
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor={card.id} className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.title} ID / Pixel
                  </Label>
                  <Input
                    id={card.id}
                    placeholder={card.placeholder}
                    className="border-slate-200 focus:border-[#003366] focus:ring-[#003366]/10 transition-all font-mono text-sm"
                    value={formData[card.field as keyof MarketingSettings] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [card.field]: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
          <Activity className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Dica de Especialista</p>
            <p>
              O uso de pixels de rastreamento permite que sua imobiliária realize campanhas de <strong>Remarketing</strong>, 
              exibindo anúncios para pessoas que já visitaram seus imóveis no portal, aumentando drasticamente a conversão.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
