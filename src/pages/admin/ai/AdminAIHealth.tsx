import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  SectionHeader,
} from '@/components/admin/ai/AiOpsCards';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getSystemHealth,
  toHealthStatusColor,
  toHealthStatusBg,
  type SystemHealth,
  type ServiceHealth,
} from '@/lib/observability';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Minus,
  RefreshCw,
  Clock,
  Zap,
  Database,
  Bot,
  Globe,
  Workflow,
  GitBranch,
  Megaphone,
  Shield,
} from 'lucide-react';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  site: <Globe size={16} />,
  openclaw_gateway: <Bot size={16} />,
  openclaw_agents: <Bot size={16} />,
  supabase: <Database size={16} />,
  n8n: <Workflow size={16} />,
  vercel: <Zap size={16} />,
  github: <GitBranch size={16} />,
  meta_ads: <Megaphone size={16} />,
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
  online: { label: 'Online', icon: <CheckCircle2 size={14} />, badge: 'success' },
  degraded: { label: 'Degradado', icon: <AlertTriangle size={14} />, badge: 'warning' },
  failing: { label: 'Falhando', icon: <XCircle size={14} />, badge: 'danger' },
  disconnected: { label: 'Desconectado', icon: <Minus size={14} />, badge: 'neutral' },
  unknown: { label: 'Desconhecido', icon: <Minus size={14} />, badge: 'neutral' },
  configured: { label: 'Configurado', icon: <CheckCircle2 size={14} />, badge: 'info' },
  requires_auth: { label: 'Requer Auth', icon: <Shield size={14} />, badge: 'warning' },
};

const BADGE_VARIANTS: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({ service }: { service: ServiceHealth }) {
  const cfg = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.unknown;
  const icon = SERVICE_ICONS[service.id] ?? <Globe size={16} />;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className={`mt-0.5 shrink-0 ${toHealthStatusColor(service.status)}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{service.label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${BADGE_VARIANTS[cfg.badge]}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {service.isReal && (
            <span className="text-xs text-muted-foreground">● real</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.detail}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono">{service.value}</p>
        {service.responseTimeMs !== null && (
          <p className="text-xs text-muted-foreground">{service.responseTimeMs}ms</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(service.lastCheck).toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

// ─── Overall Status Banner ─────────────────────────────────────────────────────

function OverallBanner({ health }: { health: SystemHealth }) {
  const { overall, totalOnline, totalDegraded, totalFailing, totalServices, checkedAt } = health;

  const config = {
    online: { label: 'Sistema Operacional', class: 'border-green-500/30 bg-green-500/5 text-green-400', icon: <CheckCircle2 size={20} /> },
    degraded: { label: 'Sistema Degradado', class: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400', icon: <AlertTriangle size={20} /> },
    failing: { label: 'Sistema com Falhas', class: 'border-red-500/30 bg-red-500/5 text-red-400', icon: <XCircle size={20} /> },
  };

  const cfg = config[overall] ?? config.failing;

  return (
    <div className={`rounded-lg border p-4 flex flex-wrap items-center gap-4 ${cfg.class}`}>
      <div className="flex items-center gap-2">
        {cfg.icon}
        <span className="text-sm font-semibold">{cfg.label}</span>
      </div>
      <div className="flex flex-wrap gap-3 ml-auto text-xs">
        <span className="text-green-400">{totalOnline} online</span>
        {totalDegraded > 0 && <span className="text-yellow-400">{totalDegraded} degradado</span>}
        {totalFailing > 0 && <span className="text-red-400">{totalFailing} falhando</span>}
        <span className="text-muted-foreground">/ {totalServices} total</span>
        <span className="text-muted-foreground ml-2">
          <Clock size={12} className="inline mr-1" />
          {new Date(checkedAt).toLocaleTimeString('pt-BR')}
        </span>
      </div>
    </div>
  );
}

// ─── Category Section ───────────────────────────────────────────────────────────

function CategorySection({
  title,
  services,
}: {
  title: string;
  services: ServiceHealth[];
}) {
  if (services.length === 0) return null;
  return (
    <Card className="border-white/5">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 px-4">
        {services.map((s) => (
          <ServiceRow key={s.id} service={s} />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── SLA Card ─────────────────────────────────────────────────────────────────

function SlaCard({ health }: { health: SystemHealth }) {
  const uptime = health.totalServices > 0
    ? Math.round((health.totalOnline / health.totalServices) * 100)
    : 0;

  const slaColor = uptime >= 95 ? 'text-green-400' : uptime >= 80 ? 'text-yellow-400' : 'text-red-400';

  return (
    <Card className="border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">SLA Observabilidade</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold font-mono mb-1">
          <span className={slaColor}>{uptime}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {health.totalOnline}/{health.totalServices} serviços online
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAIHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = () => {
    setLoading(true);
    setError(null);
    getSystemHealth()
      .then((data) => {
        setHealth(data);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const coreServices = health?.services.filter(s => s.category === 'core') ?? [];
  const infraServices = health?.services.filter(s => s.category === 'infrastructure') ?? [];
  const aiServices = health?.services.filter(s => s.category === 'ai') ?? [];
  const integrations = health?.services.filter(s => s.category === 'integrations') ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Health Center"
            description="Monitoramento real de todos os serviços. Atualiza automaticamente a cada 60s."
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Atualizado {lastRefresh.toLocaleTimeString('pt-BR')}
            </span>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 text-xs hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && !health && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-white/5">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !health && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">Erro ao carregar health: {error}</p>
            <button onClick={fetchHealth} className="mt-2 text-xs underline">Tentar novamente</button>
          </div>
        )}

        {/* Health Data */}
        {health && (
          <>
            <OverallBanner health={health} />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SlaCard health={health} />
              <Card className="border-white/5">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Serviços Online</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <p className="text-3xl font-bold text-green-400">{health.totalOnline}</p>
                  <p className="text-xs text-muted-foreground">{health.totalServices - health.totalOnline - health.totalDegraded - health.totalFailing} restantes</p>
                </CardContent>
              </Card>
              <Card className="border-white/5">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Degradados</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <p className={`text-3xl font-bold ${health.totalDegraded > 0 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                    {health.totalDegraded}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/5">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Falhando</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <p className={`text-3xl font-bold ${health.totalFailing > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {health.totalFailing}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Service Categories */}
            <CategorySection title="🔧 Core Services" services={coreServices} />
            <CategorySection title="☁️ Infraestrutura" services={infraServices} />
            <CategorySection title="🤖 AI & Orquestração" services={aiServices} />
            <CategorySection title="🔗 Integrações" services={integrations} />

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Online</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Degradado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Falhando</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Desconectado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Requer Auth</span>
              <span className="ml-auto">● real = verificação em tempo real</span>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
