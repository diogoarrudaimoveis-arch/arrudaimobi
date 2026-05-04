import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface Props {
  propertyId: string;
  propertyTitle: string;
  agentId?: string | null;
  tenantId: string;
  onTrackMarketingEvent?: (eventName: string, eventData?: Record<string, unknown>) => void;
}

export function PropertyContactForm({ propertyId, propertyTitle, agentId, tenantId, onTrackMarketingEvent }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: `Olá, tenho interesse no imóvel "${propertyTitle}".`,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nome obrigatório (mínimo 2 caracteres)";
    if (form.name.trim().length > 100) e.name = "Nome muito longo (máximo 100 caracteres)";
    if (!form.phone.trim()) e.phone = "Telefone obrigatório";
    if (form.phone.trim().length > 20) e.phone = "Telefone inválido";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
    if (form.email && form.email.length > 255) e.email = "Email muito longo";
    if (form.message.length > 1000) e.message = "Mensagem muito longa (máximo 1000 caracteres)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/submit-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-contact",
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          message: form.message || null,
          property_id: propertyId,
          agent_id: agentId || null,
          tenant_id: tenantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");

      onTrackMarketingEvent?.("Lead", { property_id: propertyId });
      setSubmitted(true);
      toast({ title: "Mensagem enviada!", description: "O agente entrará em contato." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="mt-3 font-display text-sm font-semibold">Mensagem enviada!</p>
          <p className="mt-1 text-xs text-muted-foreground">Entraremos em contato em breve.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => {
            setSubmitted(false);
            setForm({ name: "", email: "", phone: "", message: `Olá, tenho interesse no imóvel "${propertyTitle}".` });
          }}>
            Enviar outra
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-display text-sm font-semibold text-foreground">Solicitar Informações</h3>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div>
          <Input placeholder="Seu nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>
        <div>
          <Input placeholder="Seu email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
        <div>
          <Input placeholder="Seu telefone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
          {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
        </div>
        <Textarea placeholder="Mensagem" className="min-h-[80px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={1000} />
        <Button className="w-full gap-2" type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar Mensagem
        </Button>
      </form>
    </Card>
  );
}
