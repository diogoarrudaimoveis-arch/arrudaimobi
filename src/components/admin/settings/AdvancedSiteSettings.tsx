import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Image as ImageIcon, FileText, Globe, Cookie, Shield, Link as LinkIcon, Trash2 } from "lucide-react";
import { BlogRichEditor } from "@/components/admin/BlogRichEditor";

interface AdvancedSiteSettingsProps {
  tenantId: string;
}

export function AdvancedSiteSettings({ tenantId }: AdvancedSiteSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [savingFavicon, setSavingFavicon] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);
  const [savingCookies, setSavingCookies] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingSeoImg, setUploadingSeoImg] = useState(false);

  // States
  const [faviconUrl, setFaviconUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImageUrl, setSeoImageUrl] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [cookieMsg, setCookieMsg] = useState("");

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
      } catch (e) {
        // ignore
      }
    }
  }, [settings]);

  const upsertMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { ...updates, tenant_id: tenantId },
          { onConflict: 'tenant_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  });

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
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSeoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSeoImg(true);
    try {
      const filename = `seo-${tenantId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("property-images").upload(`branding/${filename}`, file, { upsert: true });
      if (error) throw error;
      
      const { data } = supabase.storage.from("property-images").getPublicUrl(`branding/${filename}`);
      setSeoImageUrl(data.publicUrl);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploadingSeoImg(false);
    }
  };

  const saveFavicon = async () => {
    setSavingFavicon(true);
    try {
      await upsertMutation.mutateAsync({ favicon_url: faviconUrl });
      toast({ title: "Favicon salvo com sucesso!" });
    } finally {
      setSavingFavicon(false);
    }
  };

  const saveSeo = async () => {
    setSavingSeo(true);
    try {
      await upsertMutation.mutateAsync({ 
        seo_title: seoTitle, 
        seo_description: seoDescription, 
        seo_image_url: seoImageUrl 
      });
      toast({ title: "Configurações de SEO salvas com sucesso!" });
    } finally {
      setSavingSeo(false);
    }
  };

  const saveDocs = async () => {
    setSavingDocs(true);
    try {
      await upsertMutation.mutateAsync({ 
        terms_content: termsContent, 
        privacy_policy_content: privacyContent 
      });
      toast({ title: "Documentos atualizados com sucesso!" });
    } finally {
      setSavingDocs(false);
    }
  };

  const saveCookies = async () => {
    setSavingCookies(true);
    try {
      await upsertMutation.mutateAsync({ 
        cookie_banner_json: { message: cookieMsg }
      });
      toast({ title: "Configurações de cookies salvas!" });
    } finally {
      setSavingCookies(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" /> Favicon do Site
          </CardTitle>
          <CardDescription>Ícone que aparece na aba superior do navegador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card p-2 overflow-hidden shadow-sm">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="max-h-full max-w-full object-contain" />
              ) : (
                <Globe className="h-8 w-8 text-muted-foreground/30" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild className="gap-1.5" disabled={uploadingFavicon}>
                    <span>
                      {uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      Obter Favicon
                    </span>
                  </Button>
                  <input type="file" accept=".ico,.png,.jpg" className="hidden" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                </label>
                {faviconUrl && (
                  <Button variant="outline" size="sm" onClick={() => setFaviconUrl("")} className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Recomendado: Arquivo .PNG ou .ICO de 32x32px com fundo transparente.</p>
            </div>
          </div>
          <Button onClick={saveFavicon} disabled={savingFavicon} className="bg-[#003366] hover:bg-[#002244] text-white">
            {savingFavicon ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Favicon
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="h-5 w-5 text-primary" /> Compartilhamento e SEO
          </CardTitle>
          <CardDescription>Como o site aparece ao ser pesquisado ou enviado no WhatsApp e Redes Sociais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Título do Site (SEO Title)</Label>
                  <span className={`text-[10px] ${seoTitle.length > 60 || seoTitle.length < 50 ? 'text-amber-500' : 'text-green-600'}`}>
                    {seoTitle.length} / 50-60 caracteres
                  </span>
                </div>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Ex: Minha Imobiliária - Imóveis" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Descrição Curta (SEO Description)</Label>
                  <span className={`text-[10px] ${seoDescription.length > 160 || seoDescription.length < 120 ? 'text-amber-500' : 'text-green-600'}`}>
                    {seoDescription.length} / 120-160 caracteres
                  </span>
                </div>
                <Textarea 
                  value={seoDescription} 
                  onChange={(e) => setSeoDescription(e.target.value)} 
                  placeholder="Encontre as melhores casas e apartamentos..." 
                  rows={3} 
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem de Compartilhamento (Min 1200x630px)</Label>
                <div className="flex gap-2 items-center">
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild className="gap-1.5" disabled={uploadingSeoImg}>
                      <span>
                        {uploadingSeoImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        Fazer Upload
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSeoImageUpload} disabled={uploadingSeoImg} />
                  </label>
                  {seoImageUrl && (
                    <Button variant="outline" size="sm" onClick={() => setSeoImageUrl("")} className="text-destructive hover:text-destructive">
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Simulação de Envio (WhatsApp)</Label>
              <div className="bg-[#E5DDD5] p-4 rounded-xl border border-border shadow-inner flex flex-col justify-center">
                <div className="w-[85%] ml-auto bg-[#DCF8C6] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  {seoImageUrl ? (
                    <div className="w-full h-[140px] bg-white border-b border-[#0000001a] overflow-hidden">
                      <img src={seoImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-[140px] bg-[#0000001a] border-b border-[#0000001a] flex items-center justify-center">
                       <ImageIcon className="h-8 w-8 text-black/20" />
                    </div>
                  )}
                  <div className="px-3 pt-2 pb-3 bg-[#0000000d]">
                    <h3 className="font-bold text-sm truncate text-[#111111]">{seoTitle || "Título do Site"}</h3>
                    <p className="text-[11px] line-clamp-2 mt-0.5 leading-snug" style={{ color: "#444444" }}>
                      {seoDescription || "Descrição do site aparecerá aqui de forma resumida, atraindo o clique do usuário."}
                    </p>
                    <p className="text-[10px] mt-1.5 truncate text-[#00000066]">link-dinamico.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={saveSeo} disabled={savingSeo} className="bg-[#003366] hover:bg-[#002244] text-white">
            {savingSeo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar SEO
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" /> Documentos Legais
          </CardTitle>
          <CardDescription>Termos e Políticas exigidos para manter a empresa amparada legalmente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Termos de Serviço</Label>
            <p className="text-xs text-muted-foreground mb-1">Crie tópicos destacando regras de uso. Utilize as opções de formatação HTML disponíveis abaixo para organizar a leitura.</p>
            <BlogRichEditor 
              content={termsContent} 
              onChange={setTermsContent} 
            />
          </div>
          <div className="space-y-2">
            <Label>Política de Privacidade</Label>
            <p className="text-xs text-muted-foreground mb-1">Explique como os dados dos leads são tratados, respeitando a LGPD.</p>
            <BlogRichEditor 
              content={privacyContent} 
              onChange={setPrivacyContent} 
            />
          </div>
          <Button onClick={saveDocs} disabled={savingDocs} className="bg-[#003366] hover:bg-[#002244] text-white">
            {savingDocs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Documentos
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cookie className="h-5 w-5 text-primary" /> Cookies e Marketing
          </CardTitle>
          <CardDescription>Gerencie a transparência da coleta de dados de usuários do portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 flex gap-3 text-amber-800">
            <Shield className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Nota Informativa sobre Coleta</p>
              <p className="text-xs mt-0.5">O sistema captura registros analíticos (visitas, cliques, conversões) nos portais das propriedades para rastreamento de anúncios (Google Ads / Meta). Essa atividade obedece à LGPD, e sua mensagem aos usuários é vital.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Texto do Banner de Cookies</Label>
            <Textarea 
              value={cookieMsg} 
              onChange={(e) => setCookieMsg(e.target.value)} 
              placeholder="Utilizamos cookies essenciais para oferecer uma experiência melhor. Ao continuar navegando você concorda com nossas políticas." 
              rows={2} 
            />
          </div>
          <Button onClick={saveCookies} disabled={savingCookies} className="bg-[#003366] hover:bg-[#002244] text-white">
            {savingCookies ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Preferências
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
