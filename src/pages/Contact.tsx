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
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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
                      <Button type="submit" size="lg" className="w-full gap-2 sm:w-auto" disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Enviar Mensagem
                      </Button>
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
