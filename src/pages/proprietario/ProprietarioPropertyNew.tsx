import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Home, Loader2, CheckCircle2 } from "lucide-react";

const propertyTypes = [
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "lote", label: "Lote / Terreno" },
  { value: "chacara", label: "Chácara" },
  { value: "sitio", label: "Sítio" },
  { value: "comercial", label: "Sala / Loja / Comercial" },
];

const purposes = [
  { value: "sale", label: "Venda" },
  { value: "rent", label: "Aluguel" },
];

const ProprietarioPropertyNew = () => {
  const [searchParams] = useSearchParams();
  const ownerId = searchParams.get("owner");
  const token = searchParams.get("token");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title: "", city: "", state: "MG", price: "",
    property_type: "", purpose: "sale",
    description: "", neighborhood: "",
  });

  if (!ownerId || !token) {
    return (
      <Layout>
        <section className="py-12 px-4">
          <div className="container max-w-2xl mx-auto text-center">
            <h1 className="font-display text-2xl font-bold mb-4">Acesso não autorizado</h1>
            <p className="text-muted-foreground">Use o link enviado para seu e-mail/WhatsApp para acessar o portal.</p>
          </div>
        </section>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.city || !form.property_type) {
      toast({ title: "Erro", description: "Preencha campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("properties").insert({
        owner_id: ownerId,
        title: form.title,
        city: form.city,
        state: form.state || "MG",
        price: parseFloat(form.price) || 0,
        type_id: null,
        purpose: form.purpose,
        description: form.description || "",
        status: "available",
        review_status: "pending_review",
        tenant_id: "9b4b048e-7d09-48a7-aebb-8376cc443695",
        featured: false,
      });

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Imóvel cadastrado!", description: "Sua propriedade está em revisão." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <section className="py-12 px-4">
          <div className="container max-w-xl mx-auto text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Imóvel Cadastrado!</h2>
            <p className="text-muted-foreground mb-6">Seu imóvel está em <strong>revisão</strong> e será publicado após aprovação.</p>
            <a href={`/#/proprietario/imoveis?owner=${ownerId}&token=${token}`}>
              <Button>Ver Meus Imóveis</Button>
            </a>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="bg-primary/5 py-8 px-4">
        <div className="container">
          <h1 className="font-display text-2xl font-bold">Cadastrar Imóvel</h1>
          <p className="text-muted-foreground">Preencha os dados do seu imóvel</p>
        </div>
      </section>
      <section className="py-8 px-4">
        <div className="container max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Dados Básicos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título do Imóvel *</label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Chácara em Betim - 1.000m²" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo *</label>
                    <Select onValueChange={v => setForm({...form, property_type: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Finalidade</label>
                    <Select defaultValue="sale" onValueChange={v => setForm({...form, purpose: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {purposes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Cidade *</label>
                    <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Betim" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Preço (R$)</label>
                    <Input value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="29900" type="number" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} placeholder="Descreva seu imóvel..." />
                </div>
              </CardContent>
            </Card>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">⏳ Seu imóvel entra em <strong>revisão</strong> e só será publicado após aprovação da equipe Arruda Imobi.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Home className="mr-2 h-4 w-4" /> Cadastrar Imóvel</>}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default ProprietarioPropertyNew;
