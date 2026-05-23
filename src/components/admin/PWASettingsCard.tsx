import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogoCropper } from "./LogoCropper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Smartphone, ImageIcon, Trash2, Info } from "lucide-react";
import { updateCachedTenantSettings, type TenantSettings } from "@/hooks/use-tenant-settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PWASettingsCardProps {
  tenantId: string;
  settings: TenantSettings;
  allSettings: TenantSettings;
}

export function PWASettingsCard({ tenantId, settings, allSettings }: PWASettingsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pwaIcon192, setPwaIcon192] = useState(settings.pwa_icon_192 || "");
  const [pwaIcon512, setPwaIcon512] = useState(settings.pwa_icon_512 || "");
  
  const [cropper192Open, setCropper192Open] = useState(false);
  const [cropper512Open, setCropper512Open] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [uploading192, setUploading192] = useState(false);
  const [uploading512, setUploading512] = useState(false);

  useEffect(() => {
    setPwaIcon192(settings.pwa_icon_192 || "");
    setPwaIcon512(settings.pwa_icon_512 || "");
  }, [settings]);

  const syncTenantSettingsCache = (updatedSettings: TenantSettings) => {
    queryClient.setQueryData(["admin-tenant", tenantId], (current: any) =>
      current ? { ...current, settings: updatedSettings } : current
    );

    queryClient.setQueryData(["tenant-settings"], (current: any) =>
      current ? { ...current, settings: updatedSettings } : current
    );
  };

  const handleIcon192Cropped = async (blob: Blob) => {
    setUploading192(true);
    try {
      const filename = `pwa-192-${tenantId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(`pwa/${filename}`, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(`pwa/${filename}`);
      setPwaIcon192(urlData.publicUrl);
      setCropper192Open(false);
      toast({ title: "Ícone 192x192 enviado!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar ícone", description: err.message, variant: "destructive" });
    } finally {
      setUploading192(false);
    }
  };

  const handleIcon512Cropped = async (blob: Blob) => {
    setUploading512(true);
    try {
      const filename = `pwa-512-${tenantId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(`pwa/${filename}`, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(`pwa/${filename}`);
      setPwaIcon512(urlData.publicUrl);
      setCropper512Open(false);
      toast({ title: "Ícone 512x512 enviado!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar ícone", description: err.message, variant: "destructive" });
    } finally {
      setUploading512(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings: TenantSettings = {
        ...settings,
        ...allSettings,
        pwa_icon_192: pwaIcon192,
        pwa_icon_512: pwaIcon512,
      };
      
      const { error } = await supabase
        .from("tenants")
        .update({ settings: updatedSettings as any })
        .eq("id", tenantId);
      
      if (error) throw error;

      updateCachedTenantSettings((current) =>
        current ? { ...current, settings: updatedSettings } : current
      );
      syncTenantSettingsCache(updatedSettings);

      queryClient.invalidateQueries({ queryKey: ["admin-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Configurações do PWA salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-[#003366]" /> Configurações do Aplicativo (PWA)
          </CardTitle>
          <CardDescription>Personalize os ícones que aparecem quando o app é instalado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Nota Técnica</AlertTitle>
            <AlertDescription className="text-blue-700 text-xs">
              Para que estas alterações reflitam em PWAs já instalados no celular ou desktop, o usuário pode precisar reinstalar o aplicativo ou limpar o cache do navegador.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Icon 192 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Ícone Pequeno (192x192)</Label>
              <p className="text-xs text-muted-foreground">Usado em notificações e menus do sistema</p>
              <div className="rounded-lg border border-border p-4 bg-secondary/10 flex flex-col items-center">
                {pwaIcon192 ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={pwaIcon192} alt="192x192" className="h-24 w-24 object-contain rounded-lg border bg-white shadow-sm" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCropper192Open(true)} className="gap-1.5 h-8">
                        <ImageIcon className="h-3.5 w-3.5" /> Trocar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPwaIcon192("")} className="gap-1.5 h-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setCropper192Open(true)} className="gap-2" disabled={uploading192}>
                    {uploading192 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    Upload 192x192
                  </Button>
                )}
              </div>
            </div>

            {/* Icon 512 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Ícone Grande (512x512)</Label>
              <p className="text-xs text-muted-foreground">Usado na tela de abertura (Splash Screen) do app</p>
              <div className="rounded-lg border border-border p-4 bg-secondary/10 flex flex-col items-center">
                {pwaIcon512 ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={pwaIcon512} alt="512x512" className="h-24 w-24 object-contain rounded-lg border bg-white shadow-sm" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCropper512Open(true)} className="gap-1.5 h-8">
                        <ImageIcon className="h-3.5 w-3.5" /> Trocar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPwaIcon512("")} className="gap-1.5 h-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setCropper512Open(true)} className="gap-2" disabled={uploading512}>
                    {uploading512 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    Upload 512x512
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex pt-2">
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="gap-2 bg-[#003366] hover:bg-[#002244] text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Configurações do PWA
            </Button>
          </div>
        </CardContent>
      </Card>

      <LogoCropper open={cropper192Open} onClose={() => setCropper192Open(false)} onCropped={handleIcon192Cropped} aspect={1} />
      <LogoCropper open={cropper512Open} onClose={() => setCropper512Open(false)} onCropped={handleIcon512Cropped} aspect={1} />
    </>
  );
}
