import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SectionHeader, SummaryMetricCard } from "@/components/admin/ai/AiOpsCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type AutomationCriticality,
  type AutomationHealthStatus,
  type AutomationRegistryItemMock,
  type AutomationRiskLevel,
  automationRegistryFilters,
  automationRegistryItems,
  automationRegistryMeta,
} from "@/data/automationRegistryMockData";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, Bot, CheckCircle2, Filter, ShieldAlert, Workflow, Wrench } from "lucide-react";

type FilterValue = string;

const healthStyles: Record<AutomationHealthStatus, string> = {
  HEALTHY: "border-success/30 bg-success/10 text-success",
  DEGRADED: "border-warning/30 bg-warning/10 text-warning",
  FAILING: "border-destructive/30 bg-destructive/10 text-destructive",
  DISABLED: "border-muted bg-muted text-muted-foreground",
  UNKNOWN: "border-border bg-muted/70 text-muted-foreground",
};

const criticalityStyles: Record<AutomationCriticality, string> = {
  ESSENTIAL: "border-info/30 bg-info/10 text-info",
  IMPORTANT: "border-primary/30 bg-primary/10 text-primary",
  OPTIONAL: "border-border bg-muted/60 text-muted-foreground",
  REDUNDANT: "border-warning/30 bg-warning/10 text-warning",
  ORPHAN: "border-muted-foreground/30 bg-muted text-muted-foreground",
  DANGEROUS: "border-destructive/40 bg-destructive/15 text-destructive",
};

const riskStyles: Record<AutomationRiskLevel, string> = {
  LOW: "border-success/30 bg-success/10 text-success",
  MEDIUM: "border-warning/30 bg-warning/10 text-warning",
  HIGH: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  CRITICAL: "border-destructive/40 bg-destructive/15 text-destructive",
};

const actionLabel: Record<AutomationRegistryItemMock["recommendedAction"], string> = {
  KEEP: "Manter",
  REVIEW: "Revisar",
  FIX: "Corrigir",
  PAUSE_WITH_APPROVAL: "Pausar com aprovação",
  REVIEW_THEN_REMOVE: "Revisar → remover depois",
  REVIEW_LATER: "Revisar depois",
};

function filterMatches(value: string, filter: FilterValue) {
  return filter === "ALL" || value === filter;
}

function GovernanceBadge({ label, className }: { label: string; className?: string }) {
  return <Badge variant="outline" className={cn("rounded-full whitespace-nowrap", className)}>{label}</Badge>;
}

function AutomationFilter({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option === "ALL" ? "Todos" : option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatNullable(value: string | number | null) {
  if (value === null || value === "") return "—";
  return String(value);
}

function isHighlighted(item: AutomationRegistryItemMock) {
  return item.criticality === "DANGEROUS" || item.criticality === "ORPHAN" || item.status === "FAILING" || item.status === "DISABLED";
}

export default function AdminAIAutomations() {
  const [statusFilter, setStatusFilter] = useState<FilterValue>("ALL");
  const [criticalityFilter, setCriticalityFilter] = useState<FilterValue>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<FilterValue>("ALL");
  const [typeFilter, setTypeFilter] = useState<FilterValue>("ALL");
  const [riskFilter, setRiskFilter] = useState<FilterValue>("ALL");

  const filteredItems = useMemo(() => automationRegistryItems.filter((item) => (
    filterMatches(item.status, statusFilter)
    && filterMatches(item.criticality, criticalityFilter)
    && filterMatches(item.owner, ownerFilter)
    && filterMatches(item.type, typeFilter)
    && filterMatches(item.risk.level, riskFilter)
  )), [criticalityFilter, ownerFilter, riskFilter, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const dangerous = automationRegistryItems.filter((item) => item.criticality === "DANGEROUS").length;
    const orphan = automationRegistryItems.filter((item) => item.criticality === "ORPHAN").length;
    const failing = automationRegistryItems.filter((item) => item.status === "FAILING").length;
    const disabled = automationRegistryItems.filter((item) => item.status === "DISABLED").length;
    const healthy = automationRegistryItems.filter((item) => item.status === "HEALTHY").length;
    return { dangerous, orphan, failing, disabled, healthy };
  }, []);

  const nextSafeActions = useMemo(() => {
    const priorityOrder = ["PAUSE_WITH_APPROVAL", "FIX", "REVIEW", "REVIEW_THEN_REMOVE", "REVIEW_LATER", "KEEP"];
    return [...automationRegistryItems]
      .sort((a, b) => priorityOrder.indexOf(a.recommendedAction) - priorityOrder.indexOf(b.recommendedAction))
      .slice(0, 8);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <SectionHeader
          title="Governança de Automações"
          description="Registry local/mock das automações da stack. Esta tela é somente leitura: nenhum cron, job, processo ou deploy é alterado daqui."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryMetricCard label="Registradas" value={String(automationRegistryItems.length)} detail={`Schema ${automationRegistryMeta.schemaVersion}`} icon={Workflow} status="running" />
          <SummaryMetricCard label="Saudáveis" value={String(summary.healthy)} detail="HEALTHY no registry" icon={CheckCircle2} status="ok" />
          <SummaryMetricCard label="Falhando" value={String(summary.failing)} detail="FAILING exige correção" icon={AlertTriangle} status={summary.failing > 0 ? "critical" : "ok"} />
          <SummaryMetricCard label="Perigosas" value={String(summary.dangerous)} detail="DANGEROUS / P0-P1" icon={ShieldAlert} status={summary.dangerous > 0 ? "critical" : "ok"} />
          <SummaryMetricCard label="Órfãs" value={String(summary.orphan)} detail={`${summary.disabled} disabled detectados`} icon={Bot} status={summary.orphan > 0 ? "warning" : "ok"} />
        </div>

        <Card className="border-info/20 bg-info/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-5 w-5" /> Modo seguro ativo</CardTitle>
            <CardDescription>
              Botões e recomendações são dry-run/desabilitados. Pausar, corrigir, substituir ou remover exige aprovação explícita do Diogo.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-5 w-5" /> Filtros de governança</CardTitle>
            <CardDescription>Filtre por status, criticidade, owner, tipo e risco sem consultar APIs externas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <AutomationFilter label="Status" value={statusFilter} options={automationRegistryFilters.statuses} onValueChange={setStatusFilter} />
              <AutomationFilter label="Criticidade" value={criticalityFilter} options={automationRegistryFilters.criticalities} onValueChange={setCriticalityFilter} />
              <AutomationFilter label="Owner" value={ownerFilter} options={automationRegistryFilters.owners} onValueChange={setOwnerFilter} />
              <AutomationFilter label="Tipo" value={typeFilter} options={automationRegistryFilters.types} onValueChange={setTypeFilter} />
              <AutomationFilter label="Risco" value={riskFilter} options={automationRegistryFilters.riskLevels} onValueChange={setRiskFilter} />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <SectionHeader title="Registry central" description={`${filteredItems.length} automações visíveis. Comandos sensíveis permanecem mascarados e ações reais estão bloqueadas.`} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Automação</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criticidade</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Última execução</TableHead>
                    <TableHead>Última falha</TableHead>
                    <TableHead>Ação recomendada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className={cn(isHighlighted(item) && "bg-muted/50")}> 
                      <TableCell className="min-w-[260px]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{item.name}</span>
                            <GovernanceBadge label={item.id} />
                          </div>
                          <p className="text-xs text-muted-foreground">Agente: {item.agentResponsible} · Health {item.health.score}/100</p>
                        </div>
                      </TableCell>
                      <TableCell><GovernanceBadge label={item.type} /></TableCell>
                      <TableCell className="font-medium">{item.owner}</TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">{item.frequency}</TableCell>
                      <TableCell><GovernanceBadge label={item.status} className={healthStyles[item.status]} /></TableCell>
                      <TableCell><GovernanceBadge label={item.criticality} className={criticalityStyles[item.criticality]} /></TableCell>
                      <TableCell><GovernanceBadge label={item.risk.level} className={riskStyles[item.risk.level]} /></TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">{item.origin}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatNullable(item.lastRun)}</TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">{formatNullable(item.lastFailure)}</TableCell>
                      <TableCell className="min-w-[170px]">
                        <div className="space-y-2">
                          <span className="text-sm font-medium">{actionLabel[item.recommendedAction]}</span>
                          <Button variant="outline" size="sm" disabled className="w-full justify-start gap-2">
                            <Wrench className="h-3.5 w-3.5" /> Dry-run
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Próximas ações seguras" description="Fila visual de governança. Nada é executado por esta página." />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {nextSafeActions.map((item) => (
              <Card key={item.id} className={cn("overflow-hidden", item.criticality === "DANGEROUS" && "border-destructive/40", item.criticality === "ORPHAN" && "border-muted-foreground/30")}> 
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span>{item.name}</span>
                    <GovernanceBadge label={item.risk.level} className={riskStyles[item.risk.level]} />
                  </CardTitle>
                  <CardDescription>{item.health.reason}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <GovernanceBadge label={item.status} className={healthStyles[item.status]} />
                    <GovernanceBadge label={item.criticality} className={criticalityStyles[item.criticality]} />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Owner:</span> {item.owner}</p>
                    <p><span className="text-muted-foreground">Ação:</span> {actionLabel[item.recommendedAction]}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" disabled>Revisar</Button>
                    <Button variant="outline" size="sm" disabled>Pausar c/ aprovação</Button>
                    <Button variant="outline" size="sm" disabled>Corrigir</Button>
                    <Button variant="outline" size="sm" disabled>Remover depois</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Botões desabilitados até existir fluxo de aprovação.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5" /> Integração preparada</CardTitle>
            <CardDescription>
              Próximo passo técnico: mover este mock para um endpoint read-only e conectar snapshots OpenClaw/Linux/Docker com mascaramento de logs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AdminLayout>
  );
}
