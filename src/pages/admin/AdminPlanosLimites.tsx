import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, AdminPageHeader } from "@/components/admin/shared/AdminComponents";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CreditCard, Check, X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { normalizeRole } from "@/lib/adminPermissions";
import { useAuth } from "@/contexts/AuthContext";

const SUPABASE_URL = "https://udutxbyzrdwucabxqvgg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkdXR4Ynl6cmR3dWNhYnhxdmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODQ4NjUsImV4cCI6MjA5MTM2MDg2NX0.UjjlVpTn7mCbCQg3tlvK3Sn-ZsNCDNoX28woozbZA2A";

interface PlanLimits {
  properties: number;
  agents: number;
  contacts: number;
  storage_gb: number;
  api_calls_monthly: number;
  portals: number;
  ia_operacional: boolean;
  devops_access: boolean;
  mostruario: boolean;
  white_label: boolean;
}

interface Plan {
  id?: string;
  name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  limits: PlanLimits;
  gateway_plan_id?: string;
  is_active: boolean;
  created_at?: string;
}

const EMPTY_LIMITS: PlanLimits = {
  properties: 10,
  agents: 3,
  contacts: 100,
  storage_gb: 5,
  api_calls_monthly: 1000,
  portals: 1,
  ia_operacional: true,
  devops_access: false,
  mostruario: false,
  white_label: false,
};

const EMPTY_FORM: Partial<Plan> = {
  name: "",
  description: "",
  monthly_price: 0,
  annual_price: 0,
  limits: { ...EMPTY_LIMITS },
  is_active: true,
};

const AdminPlanosLimites = () => {
  const { profile } = useAuth();
  const normalizedRole = normalizeRole(profile?.role);
  const isDeveloper = normalizedRole === "developer";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>(EMPTY_FORM);

  const fetchPlans = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/plans?order=monthly_price.asc`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (resp.status === 404) {
        setTableError(true);
        setLoading(false);
        return;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const parsed = data.map((p: any) => ({
        ...p,
        limits: typeof p.limits === "string" ? JSON.parse(p.limits) : (p.limits || EMPTY_LIMITS),
      }));
      setPlans(parsed);
    } catch (e) {
      console.error("fetchPlans error:", e);
      setTableError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ ...EMPTY_FORM, limits: { ...EMPTY_LIMITS } });
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      limits: { ...plan.limits },
      is_active: plan.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPlan(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (field: string, value: any) => {
    setForm((prev) => {
      if (field.startsWith("limits.")) {
        const limitKey = field.replace("limits.", "") as keyof PlanLimits;
        return {
          ...prev,
          limits: { ...(prev.limits || EMPTY_LIMITS), [limitKey]: value },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const createPlan = async () => {
    if (!form.name) {
      toast.error("Nome do plano é obrigatório");
      return;
    }
    const body = {
      name: form.name,
      description: form.description || "",
      monthly_price: Number(form.monthly_price) || 0,
      annual_price: Number(form.annual_price) || 0,
      limits: JSON.stringify(form.limits || EMPTY_LIMITS),
      is_active: true,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/plans`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      toast.success("Plano criado com sucesso");
      closeDialog();
      fetchPlans();
    } else {
      const err = await resp.text();
      toast.error(`Erro ao criar plano: ${err}`);
    }
  };

  const updatePlan = async () => {
    if (!editingPlan?.id || !form.name) return;
    const body = {
      name: form.name,
      description: form.description || "",
      monthly_price: Number(form.monthly_price) || 0,
      annual_price: Number(form.annual_price) || 0,
      limits: JSON.stringify(form.limits || EMPTY_LIMITS),
      is_active: form.is_active,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/plans?id=eq.${editingPlan.id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      toast.success("Plano atualizado");
      closeDialog();
      fetchPlans();
    } else {
      toast.error("Erro ao atualizar plano");
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Excluir este plano? Esta ação não pode ser desfeita.")) return;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/plans?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (resp.ok) {
      toast.success("Plano excluído");
      fetchPlans();
    } else {
      toast.error("Erro ao excluir plano");
    }
  };

  const duplicatePlan = (plan: Plan) => {
    setForm({
      name: `${plan.name} (cópia)`,
      description: plan.description || "",
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      limits: { ...plan.limits },
      is_active: false,
    });
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  const FeatureCheck = ({ checked }: { checked: boolean }) =>
    checked ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Planos e Limites"
          subtitle="Gerencie planos de assinatura e limites de uso para cada plano."
          actions={
            isDeveloper ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Plano
              </Button>
            ) : undefined
          }
        />

        {/* Developer notice */}
        {isDeveloper && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <p className="text-sm text-purple-800 font-medium">Desenvolvedor — Acesso Total</p>
          </div>
        )}

        {/* Asaas notice */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                Integração Asaas — Configurar em Permissões de Menu
              </p>
              <p className="text-sm text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                Para ativar pagamentos automáticos, configure a API Key do Asaas na página{" "}
                <span className="font-medium">Permissões de Menu</span>. A integração usa o
                gateway Asaas para cobraanças recorrentes via cartão, boleto ou PIX.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Table error — table doesn't exist */}
        {tableError && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  Tabela `plans` não existe no banco
                </p>
                <p className="text-sm text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                  Execute o SQL abaixo no Supabase Dashboard (SQL Editor) para criar a tabela:
                </p>
                <pre className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2) DEFAULT 0,
  annual_price NUMERIC(10,2) DEFAULT 0,
  limits JSONB DEFAULT '{}',
  gateway_plan_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON plans FOR ALL USING (true) WITH CHECK (true);`}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans table */}
        {!tableError && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Planos Criados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum plano criado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plano</TableHead>
                        <TableHead>Mensal</TableHead>
                        <TableHead>Anual</TableHead>
                        <TableHead>Limites</TableHead>
                        <TableHead>Status</TableHead>
                        {isDeveloper && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{plan.name}</p>
                              {plan.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {plan.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold">
                              {formatCurrency(plan.monthly_price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {formatCurrency(plan.annual_price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {plan.limits?.properties ?? 0} imóveis
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {plan.limits?.agents ?? 0} agentes
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {plan.limits?.storage_gb ?? 0} GB
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {plan.is_active ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </TableCell>
                          {isDeveloper && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(plan)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => duplicatePlan(plan)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                  onClick={() => deletePlan(plan.id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features reference */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo de Limites por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-3 border rounded-lg space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{plan.name}</p>
                    {plan.is_active ? (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Imóveis:</span> <span className="font-medium">{plan.limits?.properties ?? 0}</span>
                    <span>Agentes:</span> <span className="font-medium">{plan.limits?.agents ?? 0}</span>
                    <span>Contatos:</span> <span className="font-medium">{plan.limits?.contacts ?? 0}</span>
                    <span>Armazenamento:</span> <span className="font-medium">{plan.limits?.storage_gb ?? 0} GB</span>
                    <span>IA Operacional:</span>
                    <span>
                      <FeatureCheck checked={!!plan.limits?.ia_operacional} />
                    </span>
                    <span>DevOps/Meta Ads:</span>
                    <span>
                      <FeatureCheck checked={!!plan.limits?.devops_access} />
                    </span>
                    <span>Mostruário:</span>
                    <span>
                      <FeatureCheck checked={!!plan.limits?.mostruario} />
                    </span>
                    <span>White Label:</span>
                    <span>
                      <FeatureCheck checked={!!plan.limits?.white_label} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AdminPageShell>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar Plano" : "Criar Novo Plano"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informações Básicas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="plan-name">Nome do Plano *</Label>
                  <Input
                    id="plan-name"
                    value={form.name || ""}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Ex: Plano Basic"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="plan-desc">Descrição</Label>
                  <Input
                    id="plan-desc"
                    value={form.description || ""}
                    onChange={(e) => handleFormChange("description", e.target.value)}
                    placeholder="Descrição breve do plano"
                  />
                </div>
                <div>
                  <Label htmlFor="monthly-price">Preço Mensal (R$) *</Label>
                  <Input
                    id="monthly-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthly_price || ""}
                    onChange={(e) => handleFormChange("monthly_price", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="annual-price">Preço Anual (R$)</Label>
                  <Input
                    id="annual-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.annual_price || ""}
                    onChange={(e) => handleFormChange("annual_price", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="plan-active" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="plan-active"
                      type="checkbox"
                      checked={form.is_active ?? true}
                      onChange={(e) => handleFormChange("is_active", e.target.checked)}
                      className="rounded"
                    />
                    Plano Ativo
                  </Label>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Limites do Plano</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="lim-properties">Número de Imóveis</Label>
                  <Input
                    id="lim-properties"
                    type="number"
                    min="0"
                    value={form.limits?.properties ?? 0}
                    onChange={(e) => handleFormChange("limits.properties", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="lim-agents">Número de Agentes</Label>
                  <Input
                    id="lim-agents"
                    type="number"
                    min="0"
                    value={form.limits?.agents ?? 0}
                    onChange={(e) => handleFormChange("limits.agents", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="lim-contacts">Número de Contatos</Label>
                  <Input
                    id="lim-contacts"
                    type="number"
                    min="0"
                    value={form.limits?.contacts ?? 0}
                    onChange={(e) => handleFormChange("limits.contacts", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="lim-storage">Armazenamento (GB)</Label>
                  <Input
                    id="lim-storage"
                    type="number"
                    min="0"
                    value={form.limits?.storage_gb ?? 0}
                    onChange={(e) => handleFormChange("limits.storage_gb", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="lim-api">Chamadas API/mês</Label>
                  <Input
                    id="lim-api"
                    type="number"
                    min="0"
                    value={form.limits?.api_calls_monthly ?? 0}
                    onChange={(e) => handleFormChange("limits.api_calls_monthly", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="lim-portals">Portais Disponíveis</Label>
                  <Input
                    id="lim-portals"
                    type="number"
                    min="0"
                    value={form.limits?.portals ?? 0}
                    onChange={(e) => handleFormChange("limits.portals", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Feature flags */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Funcionalidades Liberadas</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={form.limits?.ia_operacional ?? true}
                    onChange={(e) => handleFormChange("limits.ia_operacional", e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">IA Operacional</p>
                    <p className="text-xs text-muted-foreground">Central IA, Agentes, Automações</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={form.limits?.devops_access ?? false}
                    onChange={(e) => handleFormChange("limits.devops_access", e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">DevOps + Meta Ads</p>
                    <p className="text-xs text-muted-foreground">Acesso a DevOps e Meta Ads</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={form.limits?.mostruario ?? false}
                    onChange={(e) => handleFormChange("limits.mostruario", e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">Mostruário</p>
                    <p className="text-xs text-muted-foreground">Biblioteca de mostruário</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={form.limits?.white_label ?? false}
                    onChange={(e) => handleFormChange("limits.white_label", e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">White Label</p>
                    <p className="text-xs text-muted-foreground">Marca personalizada</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={editingPlan ? updatePlan : createPlan}
              disabled={!form.name}
            >
              {editingPlan ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPlanosLimites;