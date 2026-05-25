/**
 * CatalogRequestForm — Block 5c: Lead capture form with N8N webhook trigger
 * Allows users to request a property catalog via WhatsApp
 * Triggers N8N → ZPRO → WhatsApp flow via workflow-hooks.ts
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sonnerToast } from "@/components/ui/sonner";
import { useCatalogRequestWorkflow } from "@/hooks/workflow-hooks";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, BookOpen, MessageSquare } from "lucide-react";

interface CatalogRequestFormProps {
  variant?: "card" | "inline";
  compact?: boolean;
}

const PROPERTY_TYPES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Sala / Loja / Comercial" },
  { value: "lote", label: "Lote / Terreno" },
  { value: "chacara", label: "Chácara" },
  { value: "sitio", label: "Sítio" },
  { value: "fazenda", label: "Fazenda" },
  { value: "qualquer", label: "Ainda não sei" },
];

const BUDGET_OPTIONS = [
  { value: "ate_200k", label: "Até R$ 200 mil" },
  { value: "200k_400k", label: "R$ 200 mil - R$ 400 mil" },
  { value: "400k_700k", label: "R$ 400 mil - R$ 700 mil" },
  { value: "700k_1m", label: "R$ 700 mil - R$ 1 milhão" },
  { value: "1m_2m", label: "R$ 1 milhão - R$ 2 milhões" },
  { value: "acima_2m", label: "Acima de R$ 2 milhões" },
  { value: "nao_definido", label: "Ainda não definiu" },
];

const LOCATION_PRESETS = [
  { value: "betim", label: "Betim" },
  { value: "contagem", label: "Contagem" },
  { value: "belo_horizonte", label: "Belo Horizonte" },
  { value: "outra", label: "Outra região" },
];

export function CatalogRequestForm({ variant = "card", compact = false }: CatalogRequestFormProps) {
    const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferenceType: "",
    budget: "",
    location: "",
  });

  const catalogWorkflow = useCatalogRequestWorkflow();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nome é obrigatório";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSelect = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const phoneDigits = form.phone.replace(/\D/g, "");

      // 1. Save lead to Supabase (non-blocking)
      try {
        const { error: supabaseError } = await supabase.from("leads").insert({
          nome: form.name.trim(),
          telefone: phoneDigits,
          fonte: "catalogo_whatsapp",
          etapa: "catalogo_solicitado",
          tags: ["catalogo", "whatsapp"],
          observacoes: `Tipo preferido: ${form.preferenceType || "não informado"} | Budget: ${form.budget || "não informado"} | Local: ${form.location || "não informado"}`,
        });
        if (supabaseError) {
          console.warn("[CatalogRequest] Supabase lead save failed (non-fatal):", supabaseError.message);
        }
      } catch (supabaseErr) {
        console.warn("[CatalogRequest] Supabase error (non-fatal):", supabaseErr);
      }

      // 2. Trigger N8N catalog workflow (non-blocking, async)
      catalogWorkflow.mutate(
        {
          name: form.name.trim(),
          phone: phoneDigits,
          preferenceType: form.preferenceType || undefined,
          budget: form.budget || undefined,
          location: form.location || undefined,
        },
        {
          onSuccess: (result) => {
            console.log("[CatalogRequest] N8N workflow triggered:", result.executionId);
          },
          onError: (err) => {
            console.warn("[CatalogRequest] N8N workflow trigger failed (non-fatal):", err.message);
          },
        }
      );

      // 3. Show success immediately
      setSubmitted(true);
      sonnerToast({
        title: "Catálogo solicitado! 📚",
        description: "Você receberá no WhatsApp em instantes. Obrigado pelo interesse!",
      });
    } catch (err: any) {
      sonnerToast({
        title: "Erro",
        description: err.message || "Erro ao processar solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Solicitação enviada!</p>
            <p className="mt-1 text-sm text-green-700">
              Prepare seu WhatsApp — entraremos em contato em breve com o catálogo personalizado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome completo *</label>
        <Input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Seu nome"
          maxLength={100}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Telefone */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">WhatsApp *</label>
        <Input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="(31) 99999-9999"
          aria-invalid={!!errors.phone}
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
      </div>

      {/* Tipo de imóvel */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tipo de imóvel</label>
        <Select value={form.preferenceType} onValueChange={(v) => handleSelect("preferenceType", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Faixa de preço</label>
        <Select value={form.budget} onValueChange={(v) => handleSelect("budget", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_OPTIONS.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Localização */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Prefere qual região?</label>
        <Select value={form.location} onValueChange={(v) => handleSelect("location", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_PRESETS.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={submitting || catalogWorkflow.isPending}
      >
        {(submitting || catalogWorkflow.isPending) ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
        ) : (
          <><MessageSquare className="h-4 w-4" /> Receber catálogo no WhatsApp</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Ao clicar, você concorda em receber mensagens via WhatsApp.
      </p>
    </form>
  );

  if (variant === "card") {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Solicitar Catálogo</CardTitle>
          </div>
          <CardDescription>
            Receba no WhatsApp uma seleção de imóveis com base nas suas preferências.
          </CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}