import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SectionHeader } from '@/components/admin/ai/AiOpsCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { alerts as rawAlerts, governanceItems, getActiveAlerts, getCriticalAlerts, type Alert, type GovernanceItem } from '@/lib/observability';
import {
  AlertTriangle,
  XCircle,
  Info,
  Bell,
  Shield,
  Clock,
  CheckCircle2,
  ChevronDown,
  BellOff,
} from 'lucide-react';

type Severity = 'info' | 'warning' | 'error' | 'critical';
type AlertCategory = 'system' | 'automation' | 'security' | 'performance' | 'deploy';

const SEVERITY_CONFIG: Record<Severity, { label: string; icon: React.ReactNode; badge: string; color: string }> = {
  info: {
    label: 'INFO',
    icon: <Info size={13} />,
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    color: 'border-blue-500/30',
  },
  warning: {
    label: 'WARN',
    icon: <AlertTriangle size={13} />,
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    color: 'border-yellow-500/30',
  },
  error: {
    label: 'ERROR',
    icon: <XCircle size={13} />,
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    color: 'border-red-500/30',
  },
  critical: {
    label: 'CRIT',
    icon: <AlertTriangle size={13} />,
    badge: 'bg-red-900/30 text-red-300 border-red-500/40',
    color: 'border-red-500/40',
  },
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  system: '🖥️ Sistema',
  automation: '⚡ Automação',
  security: '🔒 Segurança',
  performance: '📊 Performance',
  deploy: '🚀 Deploy',
};

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
  return (
    <div className={`flex items-start gap-3 py-4 border-b border-white/5 last:border-0 rounded-lg mb-2 px-3 border ${cfg.color} bg-white/2.5`}>
      <div className={`shrink-0 mt-0.5 ${alert.severity === 'critical' || alert.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{alert.title}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.badge}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[alert.category]}</span>
          {alert.isActive ? (
            <span className="text-xs text-orange-400/70">● ativo</span>
          ) : (
            <span className="text-xs text-green-400/70">✓ resolvido</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
        {alert.triggerCondition && (
          <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">🔎 {alert.triggerCondition}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>Fonte: {alert.source}</span>
          {alert.notifiedVia[0] !== 'none' && (
            <span>📨 Notificado: {alert.notifiedVia.join(', ')}</span>
          )}
          <span>
            <Clock size={10} className="inline mr-1" />
            {new Date(alert.createdAt).toLocaleString('pt-BR')}
          </span>
          {alert.acknowledgedBy && (
            <span className="text-green-400/60">✓ Ack by {alert.acknowledgedBy}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function GovernanceRow({ item }: { item: GovernanceItem }) {
  const cfg = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.info;
  return (
    <div className={`flex items-start gap-3 py-4 border-b border-white/5 last:border-0 rounded-lg mb-2 px-3 border ${cfg.color} bg-white/2.5`}>
      <div className="shrink-0 mt-0.5">
        {item.isActionable ? (
          <Bell size={14} className="text-orange-400" />
        ) : (
          <CheckCircle2 size={14} className="text-green-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{item.title}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.badge}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
            {item.type.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-muted-foreground">Owner: <strong className="text-white/70">{item.owner}</strong></span>
          <span className="text-blue-400/70">→ {item.recommendedAction}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminAIAlerts() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'governance'>('alerts');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');

  const activeAlerts = getActiveAlerts();
  const criticalAlerts = getCriticalAlerts();

  const filteredAlerts = severityFilter === 'all'
    ? rawAlerts
    : rawAlerts.filter(a => a.severity === severityFilter);

  const tabs = [
    { id: 'alerts' as const, label: 'Alertas', count: activeAlerts.length },
    { id: 'governance' as const, label: 'Governança', count: governanceItems.filter(g => g.isActionable).length },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Alert Center"
          description="Central de alertas operacionais e governança. Alertas são READ-ONLY — nenhuma ação automática é executada. Notificações estão PREPARADAS mas não ativadas."
        />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono">{rawAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Total alertas</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono text-red-400">{criticalAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </CardContent>
          </Card>
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono text-orange-400">{activeAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono">{governanceItems.filter(g => g.isActionable).length}</p>
              <p className="text-xs text-muted-foreground">Governança</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-muted-foreground hover:text-white'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Alert Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {/* Severity Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-3 py-1.5 rounded text-xs border transition-colors ${severityFilter === 'all' ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
              >
                Todos
              </button>
              {(Object.keys(SEVERITY_CONFIG) as Severity[]).map(sev => {
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs border transition-colors ${severityFilter === sev ? cfg.badge + ' border' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                  >
                    {cfg.icon}{cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Alert List */}
            <Card className="border-white/5">
              <CardContent className="p-4 space-y-2">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <BellOff size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">Nenhum alerta</p>
                  </div>
                ) : (
                  filteredAlerts.map(alert => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Governance Tab */}
        {activeTab === 'governance' && (
          <div className="space-y-3">
            <Card className="border-white/5">
              <CardContent className="p-4 space-y-2">
                {governanceItems.map(item => (
                  <GovernanceRow key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notification Status */}
        <Card className="border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">📨 Status das Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm">Telegram — <strong className="text-yellow-400">PRONTO (não ativado)</strong> — @arruda_master_bot conectado</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm">Slack — <strong className="text-gray-400">PREPARADO (não configurado)</strong> — Webhook URL não definido</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm">Email — <strong className="text-gray-400">PREPARADO (não configurado)</strong> — SMTP não configurado</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-white/5">
              ⚠️ Notificações reais devem ser ativadas apenas após aprovação do Diogo. Alertas críticos podem ser enviados automaticamente quando configurado.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
