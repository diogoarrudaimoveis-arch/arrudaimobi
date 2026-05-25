import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Database,
  GitBranch,
  Megaphone,
  MessageCircle,
  ShieldAlert,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type OpsStatus = "ok" | "warning" | "critical" | "offline" | "running" | "queued" | "success" | "failed";
export type OpsSeverity = "info" | "warning" | "error" | "critical";
export type AgentRiskLevel = "baixo" | "médio" | "alto" | "crítico";

export interface AgentStatusMock {
  id: string;
  name: string;
  emoji: string;
  role: string;
  status: OpsStatus;
  risk: AgentRiskLevel;
  lastAction: string;
  queue: number;
  updatedAt: string;
}

export interface HealthStatusMock {
  id: string;
  label: string;
  status: OpsStatus;
  value: string;
  detail: string;
  icon: LucideIcon;
}

export interface AlertMock {
  id: string;
  severity: OpsSeverity;
  title: string;
  source: string;
  message: string;
  createdAt: string;
}

export interface AutomationRunMock {
  id: string;
  name: string;
  source: string;
  status: OpsStatus;
  duration: string;
  retries: number;
  lastRun: string;
}

export interface MetaAdsMetricMock {
  id: string;
  label: string;
  value: string;
  delta: string;
  status: OpsStatus;
}

export interface DevOpsStatusMock {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: OpsStatus;
}

export interface SupabaseStatusMock {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: OpsStatus;
}

export interface LeadSlaMock {
  id: string;
  label: string;
  value: string;
  detail: string;
  severity: OpsSeverity;
}

export const aiAgents: AgentStatusMock[] = [
  {
    id: "main",
    name: "Jack",
    emoji: "👑",
    role: "Orquestração executiva",
    status: "ok",
    risk: "baixo",
    lastAction: "Blueprint Fase 1 validado sem tocar produção",
    queue: 2,
    updatedAt: "agora",
  },
  {
    id: "carlos",
    name: "Carlos",
    emoji: "🧭",
    role: "Plano e prioridades",
    status: "queued",
    risk: "baixo",
    lastAction: "Aguardando priorização comercial da Central IA",
    queue: 1,
    updatedAt: "5 min",
  },
  {
    id: "arruda_master",
    name: "Arruda Master",
    emoji: "👑",
    role: "Coordenação da célula Arruda",
    status: "ok",
    risk: "baixo",
    lastAction: "Coordenando arruda_operator e marketing",
    queue: 3,
    updatedAt: "2 min",
  },
  {
    id: "arruda_operator",
    name: "Arruda Operator",
    emoji: "⚙️",
    role: "Infra, APIs e deploy",
    status: "running",
    risk: "médio",
    lastAction: "Mapeando GitHub, Vercel, Supabase e n8n",
    queue: 4,
    updatedAt: "1 min",
  },
  {
    id: "arruda_marketing",
    name: "Arruda Marketing",
    emoji: "📈",
    role: "CRM, Meta Ads e funil",
    status: "warning",
    risk: "médio",
    lastAction: "Meta Ads aguardando sync real em modo leitura",
    queue: 3,
    updatedAt: "8 min",
  },
  {
    id: "guardiao_chaves",
    name: "Guardião das Chaves",
    emoji: "🔐",
    role: "Segurança e credenciais",
    status: "critical",
    risk: "crítico",
    lastAction: "Git PAT e devices operator exigem revisão antes de deploy",
    queue: 5,
    updatedAt: "agora",
  },
];

export const healthStatuses: HealthStatusMock[] = [
  { id: "site", label: "Site", status: "ok", value: "200 OK", detail: "arrudaimobi.com.br ativo", icon: CheckCircle2 },
  { id: "admin", label: "Admin", status: "ok", value: "200 OK", detail: "Painel atual operacional", icon: CheckCircle2 },
  { id: "openclaw", label: "OpenClaw", status: "warning", value: "Node off", detail: "Notebook-Diogo pareado, desconectado", icon: Bot },
  { id: "n8n", label: "N8N", status: "ok", value: "Online", detail: "Orquestrador disponível", icon: Workflow },
  { id: "supabase", label: "Supabase", status: "warning", value: "Revisar", detail: "verify_jwt=false em funções públicas", icon: Database },
  { id: "security", label: "Segurança", status: "critical", value: "P0", detail: "Git PAT remoto e devices operator", icon: ShieldAlert },
];

export const alerts: AlertMock[] = [
  {
    id: "a1",
    severity: "critical",
    title: "Git PAT detectado no remote local",
    source: "guardiao_chaves",
    message: "Remover credencial da URL antes de qualquer commit/deploy.",
    createdAt: "agora",
  },
  {
    id: "a2",
    severity: "warning",
    title: "Notebook-Diogo desconectado",
    source: "openclaw",
    message: "Node pareado, mas sem conexão ativa no último check.",
    createdAt: "10 min",
  },
  {
    id: "a3",
    severity: "warning",
    title: "Meta Ads sem sync real",
    source: "arruda_marketing",
    message: "Painel deve iniciar em read-only e dry-run.",
    createdAt: "15 min",
  },
];

export const automationRuns: AutomationRunMock[] = [
  { id: "r1", name: "OpenClaw Healthcheck", source: "n8n", status: "success", duration: "1.2s", retries: 0, lastRun: "5 min" },
  { id: "r2", name: "Lead SLA Sweep", source: "n8n", status: "queued", duration: "—", retries: 0, lastRun: "aguardando" },
  { id: "r3", name: "Meta Ads Sync", source: "edge", status: "queued", duration: "—", retries: 0, lastRun: "draft" },
  { id: "r4", name: "DevOps Sync", source: "edge", status: "queued", duration: "—", retries: 0, lastRun: "draft" },
];

export const metaAdsMetrics: MetaAdsMetricMock[] = [
  { id: "spend", label: "Gasto", value: "R$ 0,00", delta: "mock / read-only", status: "queued" },
  { id: "cpc", label: "CPC", value: "—", delta: "aguardando API", status: "queued" },
  { id: "ctr", label: "CTR", value: "—", delta: "aguardando API", status: "queued" },
  { id: "cpl", label: "CPL", value: "—", delta: "alerta futuro", status: "warning" },
  { id: "roas", label: "ROAS", value: "—", delta: "não conectado", status: "queued" },
  { id: "leads", label: "Leads", value: "—", delta: "sync planejado", status: "queued" },
];

export const devOpsStatuses: DevOpsStatusMock[] = [
  { id: "branch", label: "Branch atual", value: "arruda/ai-first-central-ia-draft", detail: "branch local sem commit", status: "running" },
  { id: "build", label: "Build", value: "pendente", detail: "rodar após mockups", status: "queued" },
  { id: "lint", label: "Lint", value: "falha conhecida", detail: "baseline anterior: 217 problemas", status: "warning" },
  { id: "deploy", label: "Deploy", value: "bloqueado", detail: "sem deploy nesta fase", status: "ok" },
];

export const supabaseStatuses: SupabaseStatusMock[] = [
  { id: "auth", label: "Auth", value: "Ativo", detail: "ProtectedRoute já usado no admin", status: "ok" },
  { id: "edge", label: "Edge Functions", value: "10", detail: "revisar verify_jwt=false", status: "warning" },
  { id: "rls", label: "RLS", value: "revisar", detail: "novas tabelas exigem tenant_id", status: "warning" },
  { id: "service", label: "Service Role", value: "server-only", detail: "nunca expor no client", status: "critical" },
];

export const leadSlaCards: LeadSlaMock[] = [
  { id: "hot", label: "Lead quente sem contato", value: "5 min", detail: "gera alerta crítico", severity: "critical" },
  { id: "new", label: "Lead novo sem contato", value: "15 min", detail: "alerta para arruda_marketing", severity: "warning" },
  { id: "follow", label: "Follow-up automático", value: "24/48/72h", detail: "fila n8n planejada", severity: "info" },
];

export const aiOpsSummaryCards = [
  { label: "Agentes", value: "6", detail: "célula Arruda mapeada", icon: Bot, status: "ok" as OpsStatus },
  { label: "Automações", value: "4", detail: "draft/read-only", icon: Workflow, status: "queued" as OpsStatus },
  { label: "Alertas", value: "3", detail: "1 crítico, 2 avisos", icon: AlertTriangle, status: "critical" as OpsStatus },
  { label: "CRM SLA", value: "15m", detail: "meta de resposta inicial", icon: MessageCircle, status: "warning" as OpsStatus },
];

export const statusIconMap: Record<OpsStatus, LucideIcon> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  critical: ShieldAlert,
  offline: XCircle,
  running: Activity,
  queued: Clock,
  success: CheckCircle2,
  failed: XCircle,
};

export const devOpsTimeline = [
  { id: "d1", title: "Blueprint Fase 1 aprovado", detail: "Sem commit e sem deploy", icon: GitBranch, status: "ok" as OpsStatus },
  { id: "d2", title: "Vercel tracking planejado", detail: "Deploys serão read-only", icon: Activity, status: "queued" as OpsStatus },
  { id: "d3", title: "Rollback tracking", detail: "Somente exibir candidatos", icon: Clock, status: "queued" as OpsStatus },
];

export const metaAdsPlan = [
  { id: "m1", title: "Campanhas", detail: "sync read-only via Meta Marketing API", icon: Megaphone, status: "queued" as OpsStatus },
  { id: "m2", title: "Pixel/events", detail: "monitorar ausência de eventos por 6h", icon: Activity, status: "warning" as OpsStatus },
  { id: "m3", title: "Alertas CPL/ROAS", detail: "Telegram dry-run até aprovação", icon: AlertTriangle, status: "warning" as OpsStatus },
];
