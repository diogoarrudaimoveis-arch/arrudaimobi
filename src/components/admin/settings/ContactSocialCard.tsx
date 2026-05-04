import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Globe, Phone, Mail, MapPin, Instagram, Facebook, Linkedin, Youtube, MessageCircle, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

export function ContactSocialCard() {
  const { tenant, saveSettings, toast } = useAdminTenant();
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [hours, setHours] = useState("");
  const [hours2, setHours2] = useState("");

  useEffect(() => {
    const s = (tenant?.settings as TenantSettings) || {};
    setPhone(s.contact_phone || "");
    setWhatsapp(s.contact_whatsapp || "");
    setEmail(s.contact_email || "");
    setAddress(s.contact_address || "");
    setInstagram(s.social_instagram || "");
    setFacebook(s.social_facebook || "");
    setLinkedin(s.social_linkedin || "");
    setYoutube(s.social_youtube || "");
    setTiktok(s.social_tiktok || "");
    setHours(s.business_hours || "");
    setHours2(s.business_hours_secondary || "");
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: () => saveSettings({
      contact_phone: phone.trim(),
      contact_whatsapp: whatsapp.trim(),
      contact_email: email.trim(),
      contact_address: address.trim(),
      social_instagram: instagram.trim(),
      social_facebook: facebook.trim(),
      social_linkedin: linkedin.trim(),
      social_youtube: youtube.trim(),
      social_tiktok: tiktok.trim(),
      business_hours: hours.trim(),
      business_hours_secondary: hours2.trim(),
    }),
    onSuccess: () => toast({ title: "Personalização salva!" }),
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-primary" /> Dados de Contato & Redes Sociais
        </CardTitle>
        <CardDescription>Essas informações aparecem no rodapé do site</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefone
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 3000-0000" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" /> WhatsApp
            </label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-0000" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@suaempresa.com" />
          </div>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Endereço
          </label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Paulista, 1000 - São Paulo, SP" />
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Horário de Funcionamento
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Horário Principal</label>
              <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Seg-Sex: 9h-18h" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Horário Secundário</label>
              <Input value={hours2} onChange={(e) => setHours2(e.target.value)} placeholder="Sáb: 9h-13h" />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium">Redes Sociais</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Instagram className="h-3.5 w-3.5 text-muted-foreground" /> Instagram
              </label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/sua-empresa" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Facebook className="h-3.5 w-3.5 text-muted-foreground" /> Facebook
              </label>
              <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/sua-empresa" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Linkedin className="h-3.5 w-3.5 text-muted-foreground" /> LinkedIn
              </label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/sua-empresa" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Youtube className="h-3.5 w-3.5 text-muted-foreground" /> YouTube
              </label>
              <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@sua-empresa" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-foreground"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg> TikTok
              </label>
              <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@sua-empresa" />
            </div>
          </div>
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Personalização
        </Button>
      </CardContent>
    </Card>
  );
}