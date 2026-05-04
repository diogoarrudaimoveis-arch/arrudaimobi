import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { Phone, Mail, MapPin, Clock, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const Contact = () => {
  const { toast } = useToast();
  const { data: tenant } = useTenantSettings();
  const s = tenant?.settings || {};
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nome é obrigatório";
    if (!form.email.trim() && !form.phone.trim()) e.email = "Informe email ou telefone";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Get default tenant
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/public-api?action=get-default-tenant`);
      const tenantData = await res.json();
      if (!tenantData?.id) throw new Error("Tenant não encontrado");

      const submitRes = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/submit-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-contact",
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          message: [form.subject, form.message].filter(Boolean).join(" - "),
          tenant_id: tenantData.id,
        }),
      });

      const data = await submitRes.json();
      if (!submitRes.ok) throw new Error(data.error || "Erro ao enviar");

      setSubmitted(true);
      toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="bg-secondary/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Fale Conosco</h1>
          <p className="mt-1 text-muted-foreground">Estamos prontos para atender você</p>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="p-6">
                {submitted ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-success" />
                    <h2 className="mt-4 font-display text-lg font-semibold">Mensagem enviada!</h2>
                    <p className="mt-2 text-muted-foreground">Entraremos em contato em breve.</p>
                    <Button className="mt-4" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}>
                      Enviar outra mensagem
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-lg font-semibold text-foreground">Envie sua mensagem</h2>
                    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">Nome *</label>
                          <Input placeholder="Seu nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                          <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">Telefone</label>
                          <Input placeholder="(11) 99999-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">Assunto</label>
                          <Input placeholder="Como podemos ajudar?" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Mensagem</label>
                        <Textarea placeholder="Descreva o que você precisa..." className="min-h-[120px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                      </div>
                  <div className="mt-3 border-t border-border/60 pt-4">
                    <a href={`https://wa.me/553197918717?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de mais informações sobre os serviços da Arruda Imobi.')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:bg-green-600 hover:shadow-xl">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Chamar no WhatsApp
                    </a>
                  </div>
                    </form>
                  </>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              {[
                { icon: Phone, title: "Telefone", value: s.contact_phone || "(11) 3000-0000", subtitle: s.business_hours || "Seg-Sex, 9h-18h", show: true },
                { icon: MessageCircle, title: "WhatsApp", value: s.contact_whatsapp || s.contact_phone || "(11) 99999-0000", subtitle: "Atendimento rápido", show: true },
                { icon: Mail, title: "Email", value: s.contact_email || "contato@empresa.com", subtitle: "Respondemos em 24h", show: true },
                { icon: MapPin, title: "Endereço", value: s.contact_address || "Av. Paulista, 1000 - São Paulo, SP", subtitle: "", show: true },
                { icon: Clock, title: "Horário", value: s.business_hours || "Seg-Sex: 9h-18h", subtitle: s.business_hours_secondary || "Sáb: 9h-13h", show: true },
              ].filter(item => item.show).map((item) => (
                <Card key={item.title} className="flex items-start gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-foreground">{item.value}</p>
                    {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
