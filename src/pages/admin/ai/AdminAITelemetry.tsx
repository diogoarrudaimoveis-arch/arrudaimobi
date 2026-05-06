import { useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SectionHeader } from '@/components/admin/ai/AiOpsCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAllTelemetry,
  metricValueColor,
  type TelemetryMetric,
} from '@/lib/observability/telemetryService';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Cpu,
  MemoryStick,
  Activity,
  Zap,
  AlertTriangle,
  Megaphone,
  GitBranch,
  Bell,
  Shield,
  Clock,
  Timer,
} from 'lucide-react';

const METRIC_ICONS: Record<string, React.ReactNode> = {
  uptime: <Clock size={16} />,
  cpu: <Cpu size={16} />,
  ram: <MemoryStick size={16} />,
  automations: <Zap size={16} />,
  dangerous_automations: <AlertTriangle size={16} />,
  orphan_automations: <AlertTriangle size={16} />,
  cron_jobs: <Timer size={16} />,
  active_alerts: <Bell size={16} />,
  critical_alerts: <Shield size={16} />,
  meta_spend: <Megaphone size={16} />,
  meta_clicks: <Activity size={16} />,
  meta_leads: <Activity size={16} />,
  deploy_freq: <GitBranch size={16} />,
};

const TREND_ICONS: Record<string, React.ReactNode> = {
  up: <TrendingUp size={12} className="text-green-400" />,
  down: <TrendingDown size={12} className="text-yellow-400" />,
  stable: <Minus size={12} className="text-muted-foreground" />,
};

function MetricCard({ metric }: { metric: TelemetryMetric }) {
  const icon = METRIC_ICONS[metric.id] ?? <Activity size={16} />;
  const trendIcon = TREND_ICONS[metric.trend] ?? <Minus size={12} />;
  const valueColor = metricValueColor(metric);
  const isDanger = metric.threshold !== undefined && metric.value >= metric.threshold;

  return (
    <Card className={`border-white/5 ${isDanger ? 'border-red-500/30 bg-red-500/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <CardTitle className="text-xs text-muted-foreground">{metric.label}</CardTitle>
          {metric.isEstimate && (
            <span className="text-xs text-muted-foreground/50 ml-auto">est.</span>
          )}
          {isDanger && (
            <span className="ml-auto text-xs text-red-400">⚠️ acima do limiar</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-2">
          <span className={`text-2xl font-bold font-mono ${valueColor}`}>
            {typeof metric.value === 'number' ? metric.value.toLocaleString('pt-BR') : metric.value}
          </span>
          <span className="text-xs text-muted-foreground mb-0.5">{metric.unit}</span>
          <span className="ml-auto mb-0.5">{trendIcon}</span>
        </div>
        {metric.threshold !== undefined && (
          <div className="mt-2">
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-1 rounded-full transition-all ${isDanger ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Limiar: {metric.threshold} {metric.unit}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TelemetrySection({
  title,
  metrics,
}: {
  title: string;
  metrics: TelemetryMetric[];
}) {
  if (metrics.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(m => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>
    </div>
  );
}

export default function AdminAITelemetry() {
  const allMetrics = useMemo(() => getAllTelemetry(), []);

  const coreMetrics = allMetrics.filter(m =>
    ['uptime', 'cpu', 'ram'].includes(m.id)
  );
  const automationMetrics = allMetrics.filter(m =>
    ['automations', 'dangerous_automations', 'orphan_automations', 'cron_jobs'].includes(m.id)
  );
  const alertMetrics = allMetrics.filter(m =>
    ['active_alerts', 'critical_alerts'].includes(m.id)
  );
  const metaMetrics = allMetrics.filter(m =>
    ['meta_spend', 'meta_clicks', 'meta_leads'].includes(m.id)
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <SectionHeader
          title="Telemetry"
          description="Métricas operacionais em tempo real. Valores marcados como 'est.' são estimativas baseadas em dados disponíveis — não medições diretas de servidor."
        />

        <TelemetrySection title="⚙️ Core" metrics={coreMetrics} />
        <TelemetrySection title="⚡ Automações" metrics={automationMetrics} />
        <TelemetrySection title="🔔 Alertas" metrics={alertMetrics} />
        <TelemetrySection title="📢 Meta Ads (7 dias)" metrics={metaMetrics} />

        {/* Data Quality Note */}
        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Activity size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Sobre as métricas</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• CPU/RAM: <strong className="text-white/60">estimativa browser</strong> — não mede servidor</li>
                  <li>• Uptime: <strong className="text-white/60">process.uptime()</strong> — disponível em Node.js environments</li>
                  <li>• Cron jobs, automações: <strong className="text-white/60">dados do audit</strong> — last updated 2026-05-06</li>
                  <li>• Meta Ads: <strong className="text-white/60">Edge Function real</strong> — dados de 7 dias</li>
                  <li>• GitHub deploys: <strong className="text-white/60">requer token</strong> — não disponível no frontend</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
