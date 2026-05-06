import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type AgentStatusMock,
  type AlertMock,
  type AutomationRunMock,
  type DevOpsStatusMock,
  type HealthStatusMock,
  type LeadSlaMock,
  type MetaAdsMetricMock,
  type OpsSeverity,
  type OpsStatus,
  type SupabaseStatusMock,
  statusIconMap,
} from "@/data/aiOpsMockData";
import { Activity, AlertTriangle, Bot, Clock, Database, GitBranch, Megaphone, MessageCircle, ShieldAlert, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusStyles: Record<OpsStatus, string> = {
  ok: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  offline: "border-muted bg-muted text-muted-foreground",
  running: "border-info/30 bg-info/10 text-info",
  queued: "border-border bg-muted/70 text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

const severityStyles: Record<OpsSeverity, string> = {
  info: "border-info/30 bg-info/10 text-info",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  critical: "border-destructive/40 bg-destructive/15 text-destructive",
};

const statusLabel: Record<OpsStatus, string> = {
  ok: "OK",
  warning: "Atenção",
  critical: "Crítico",
  offline: "Offline",
  running: "Rodando",
  queued: "Planejado",
  success: "Sucesso",
  failed: "Falhou",
};

function StatusBadge({ status }: { status: OpsStatus }) {
  return (
    <Badge variant="outline" className={cn("gap-1 rounded-full", statusStyles[status])}>
      {statusLabel[status]}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: OpsSeverity }) {
  return (
    <Badge variant="outline" className={cn("rounded-full", severityStyles[severity])}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function IconBubble({ icon: Icon, status }: { icon: LucideIcon; status: OpsStatus }) {
  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", statusStyles[status])}>
      <Icon className="h-6 w-6" />
    </div>
  );
}

export function SummaryMetricCard({ label, value, detail, icon: Icon, status }: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  status: OpsStatus;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 font-display text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <IconBubble icon={Icon} status={status} />
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentStatusCard({ agent }: { agent: AgentStatusMock }) {
  const Icon = statusIconMap[agent.status] || Bot;

  return (
    <Card className="overflow-hidden hover:shadow-card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span>{agent.emoji}</span>
              {agent.name}
            </CardTitle>
            <CardDescription>{agent.role}</CardDescription>
          </div>
          <IconBubble icon={Icon} status={agent.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={agent.status} />
          <Badge variant="outline" className="rounded-full">Risco {agent.risk}</Badge>
          <Badge variant="secondary" className="rounded-full">Fila {agent.queue}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{agent.lastAction}</p>
        <p className="text-xs text-muted-foreground">Atualizado: {agent.updatedAt}</p>
      </CardContent>
    </Card>
  );
}

export function HealthStatusCard({ health }: { health: HealthStatusMock }) {
  return (
    <Card className="overflow-hidden hover:shadow-card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{health.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{health.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{health.detail}</p>
          </div>
          <IconBubble icon={health.icon} status={health.status} />
        </div>
      </CardContent>
    </Card>
  );
}

export function AlertSeverityCard({ alert }: { alert: AlertMock }) {
  const Icon = alert.severity === "critical" || alert.severity === "error" ? ShieldAlert : AlertTriangle;
  const status: OpsStatus = alert.severity === "critical" || alert.severity === "error" ? "critical" : "warning";

  return (
    <Card className="border-border/70">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <IconBubble icon={Icon} status={status} />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <Badge variant="secondary" className="rounded-full">{alert.source}</Badge>
            </div>
            <h3 className="font-semibold text-foreground">{alert.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">{alert.createdAt}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AutomationRunCard({ run }: { run: AutomationRunMock }) {
  const Icon = run.source === "n8n" ? Workflow : Activity;

  return (
    <Card className="overflow-hidden hover:shadow-card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">{run.name}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{run.source}</p>
          </div>
          <IconBubble icon={Icon} status={run.status} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div><p className="text-muted-foreground">Duração</p><p className="font-semibold">{run.duration}</p></div>
          <div><p className="text-muted-foreground">Retries</p><p className="font-semibold">{run.retries}</p></div>
          <div><p className="text-muted-foreground">Última</p><p className="font-semibold">{run.lastRun}</p></div>
        </div>
        <div className="mt-4"><StatusBadge status={run.status} /></div>
      </CardContent>
    </Card>
  );
}

export function MetaAdsMetricCard({ metric }: { metric: MetaAdsMetricMock }) {
  return (
    <Card className="overflow-hidden hover:shadow-card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">{metric.label}</p>
            <p className="mt-1.5 font-display text-3xl font-bold tracking-tight">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.delta}</p>
          </div>
          <IconBubble icon={Megaphone} status={metric.status} />
        </div>
      </CardContent>
    </Card>
  );
}

export function DevOpsStatusCard({ item }: { item: DevOpsStatusMock }) {
  return (
    <StatusPanelCard icon={GitBranch} title={item.label} value={item.value} detail={item.detail} status={item.status} />
  );
}

export function SupabaseStatusCard({ item }: { item: SupabaseStatusMock }) {
  return (
    <StatusPanelCard icon={Database} title={item.label} value={item.value} detail={item.detail} status={item.status} />
  );
}

export function LeadSlaCard({ item }: { item: LeadSlaMock }) {
  const status: OpsStatus = item.severity === "critical" || item.severity === "error" ? "critical" : item.severity === "warning" ? "warning" : "ok";
  return (
    <StatusPanelCard icon={MessageCircle} title={item.label} value={item.value} detail={item.detail} status={status} />
  );
}

function StatusPanelCard({ icon: Icon, title, value, detail, status }: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  status: OpsStatus;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <IconBubble icon={Icon} status={status} />
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export { StatusBadge, SeverityBadge };
