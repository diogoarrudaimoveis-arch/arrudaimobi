import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sonnerToast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Home, Phone, Mail, User, Building, Key, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const CaptarImovel = () => {
    const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    cpf_cnpj: "",
    phone: "",
    email: "",
    city: "",
    property_type: "",
    intention: "",
    notes: "",
  });

  const propertyTypes = [
    { value: "casa", label: "Casa" },
    { value: "apartamento", label: "Apartamento" },
    { value: "lote", label: "Lote / Terreno" },
    { value: "chacara", label: "Chácara" },
    { value: "sitio", label: "Sítio" },
    { value: "comercial", label: "Sala / Loja / Comercial" },
    { value: "fazenda", label: "Fazenda" },
    { value: "outro", label: "Outro" },
  ];

  const intentions = [
    { value: "sell", label: "Quero vender" },
    { value: "rent", label: "Quero alugar" },
    { value: "both", label: "Vender ou alugar" },
  ];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nome é obrigatório (mínimo 2 caracteres)";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    if (!form.property_type) e.property_type = "Selecione o tipo do imóvel";
    if (!form.intention) e.intention = "Selecione a intenção";
    if (!form.city.trim()) e.city = "Cidade é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const phoneDigits = form.phone.replace(/\D/g, "");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: phoneDigits,
          email: form.email.trim() || null,
          cpf_cnpj: form.cpf_cnpj.replace(/\D/g, "") || null,
          city: form.city,
          property_type: form.property_type,
          intention: form.intention,
          source: "captacao-imovel",
          notes: form.notes || "",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error || !result.owner_id) {
        throw new Error(result.error || "Erro ao cadastrar proprietário. Tente novamente.");
      }

      const portalToken = result.portal_token || btoa(result.owner_id);

      setSubmitted(true);
      sonnerToast({
        title: "Cadastro enviado!",
        description: "Nossa equipe entrará em contato em breve.",
      });

      setTimeout(() => {
        navigate(`/proprietario/imoveis/novo?owner=${encodeURIComponent(result.owner_id)}&token=${encodeURIComponent(portalToken)}`);
      }, 1200);

    } catch (err: any) {
      sonnerToast({
        title: "Erro",
        description: err.message || "Erro ao enviar cadastro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  if (submitted) {
    return (
      <Layout>
        <section className="bg-secondary/50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="container px-0">
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Cadastro Enviado!</h1>
            <p className="mt-1 text-muted-foreground">Recebemos suas informações</p>
          </div>
        </section>
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container px-0 max-w-xl mx-auto text-center">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-800 mb-2">Proprietário Cadastrado</h2>
              <p className="text-green-700 mb-6">
                Seu cadastro foi recebido e está em <strong>revisão</strong>. Nossa equipe entrará em contato pelo WhatsApp em breve.
              </p>
              <div className="bg-white rounded-lg p-4 text-left">
                <p className="text-sm text-muted-foreground mb-1">Resumo do cadastro:</p>
                <p className="font-semibold">{form.name}</p>
                <p className="text-sm text-muted-foreground">{form.phone}</p>
                <p className="text-sm text-muted-foreground capitalize">{propertyTypes.find(t => t.value === form.property_type)?.label} em {form.city}</p>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Link to="/">
                  <Button variant="outline">Voltar ao Início</Button>
                </Link>
                <Link to="/contato">
                  <Button variant="outline">Fale Conosco</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="bg-secondary/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Capte seu Imóvel</h1>
          <p className="mt-1 text-muted-foreground">Cadastre-se para que nossa equipe entre em contato</p>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Proprietário</CardTitle>
                  <CardDescription>
                    Preencha seus dados para que nossa equipe possa avaliar seu imóvel e entrar em contato.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Nome completo *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Seu nome"
                            className="pl-10"
                            error={errors.name}
                          />
                        </div>
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">CPF ou CNPJ</label>
                        <Input
                          name="cpf_cnpj"
                          value={form.cpf_cnpj}
                          onChange={handleChange}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">WhatsApp *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="(31) 99999-9999"
                            className="pl-10"
                            error={errors.phone}
                          />
                        </div>
                        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="seu@email.com"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Cidade / Bairro *</label>
                        <Input
                          name="city"
                          value={form.city}
                          onChange={handleChange}
                          placeholder="Ex: Betim, MG ou Centro, Belo Horizonte"
                          error={errors.city}
                        />
                        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Tipo do imóvel *</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <select
                            name="property_type"
                            value={form.property_type}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                          >
                            <option value="">Selecione...</option>
                            {propertyTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        {errors.property_type && <p className="text-xs text-destructive mt-1">{errors.property_type}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Intenção *</label>
                      <div className="flex gap-3 flex-wrap">
                        {intentions.map(i => (
                          <label
                            key={i.value}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                              form.intention === i.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="intention"
                              value={i.value}
                              checked={form.intention === i.value}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <Key className="h-4 w-4" />
                            {i.label}
                          </label>
                        ))}
                      </div>
                      {errors.intention && <p className="text-xs text-destructive mt-1">{errors.intention}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Observações</label>
                      <Textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Descreva brevemente seu imóvel: localização, características, valor desejado..."
                        rows={4}
                      />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-semibold mb-1">Seu cadastro entra em revisão</p>
                          <p className="">Após our team analisar seus dados, entraremos em contato pelo WhatsApp em até 24h úteis.</p>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Home className="mr-2 h-4 w-4" />
                          Cadastrar Imóvel
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-3">Por que cadastrar?</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Avaliação gratuita do seu imóvel</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Sem compromisso de venda</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Equipe especializada em Betim e região</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Contato via WhatsApp em até 24h</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-3">Fale diretamente</h3>
                  <div className="flex flex-col gap-2">
                    <a href="https://wa.me/553197918717" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                      <Phone className="h-4 w-4" />
                      (31) 99791-8717
                    </a>
                    <a href="mailto:contato@arrudaimobi.com.br" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                      <Mail className="h-4 w-4" />
                      contato@arrudaimobi.com.br
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CaptarImovel;