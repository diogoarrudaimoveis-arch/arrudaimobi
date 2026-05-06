import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SectionHeader } from '@/components/admin/ai/AiOpsCards';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  MetaAdsOverview,
  MetaHealthStatus,
  MetaCampaignWithInsights,
  MetaAdsMetricCardData,
} from '@/lib/metaAds';
import {
  getMetaAdsOverview,
  getMetaSetupChecklist,
  statusToBadge,
  mapAccountStatus,
} from '@/lib/metaAds';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  Eye,
  Clock,
  DollarSign,
  MousePointer,
  Megaphone,
  BarChart3,
  Activity,
  Shield,
  Settings,
} from 'lucide-react';

// ─── Health Badge ────────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: MetaHealthStatus }) {
  const config: Record<MetaHealthStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    CONNECTED: { label: 'Conectado', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
    DEGRADED: { label: 'Degradado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
    NO_PERMISSION: { label: 'Sem Permissão', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    TOKEN_INVALID: { label: 'Token Inválido', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    RATE_LIMIT: { label: 'Rate Limited', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Clock },
    API_ERROR: { label: 'Erro de API', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    NOT_CONFIGURED: { label: 'Não Configurado', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Settings },
  };
  const { label, className, icon: Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

// ─── Setup Checklist ─────────────────────────────────────────────────────────

function SetupChecklist() {
  const checklist = getMetaSetupChecklist();
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-yellow-400">
        <Settings size={16} />
        <span className="text-sm font-semibold">Configuração Necessária</span>
      </div>
      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} className={`${item.critical ? 'text-red-400' : 'text-gray-500'} mt-0.5 shrink-0`} />
            )}
            <span className={item.done ? 'text-green-400' : item.critical ? 'text-red-400' : 'text-gray-400'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="pt-2 border-t border-yellow-500/20">
        <p className="text-xs text-yellow-300/70">
          Para corrigir: abra Business Manager → Configurações → Usuários do Sistema. Crie um System User com роль Analista e gere token com escopos <code className="bg-yellow-500/10 px-1 rounded">ads_management</code>, <code className="bg-yellow-500/10 px-1 rounded">ads_read</code>, <code className="bg-yellow-500/10 px-1 rounded">business_management</code>.
        </p>
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetaMetricCard({ metric }: { metric: MetaAdsMetricCardData }) {
  const TrendIcon =
    metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    metric.trend === 'up' ? 'text-green-400' : metric.trend === 'down' ? 'text-red-400' : 'text-gray-500';
  const statusColors: Record<string, string> = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    neutral: 'text-gray-400',
    info: 'text-blue-400',
  };
  return (
    <Card className="border-white/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{metric.title}</p>
            <p className={`text-xl font-bold ${statusColors[metric.status] ?? 'text-white'}`}>
              {metric.value}
            </p>
            {metric.subValue && (
              <p className="text-xs text-muted-foreground">{metric.subValue}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-lg">{metric.icon}</span>
            {metric.trend && (
              <TrendIcon size={14} className={trendColor} />
            )}
          </div>
        </div>
        {metric.detail && (
          <p className="text-xs text-muted-foreground mt-2">{metric.detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Campaign Table ──────────────────────────────────────────────────────────

function CampaignTable({ campaigns }: { campaigns: MetaCampaignWithInsights[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma campanha encontrada
      </div>
    );
  }
  const badgeClass = (s: string) => {
    const b = statusToBadge(s);
    const m: Record<string, string> = {
      success: 'bg-green-500/20 text-green-400',
      warning: 'bg-yellow-500/20 text-yellow-400',
      danger: 'bg-red-500/20 text-red-400',
      neutral: 'bg-gray-500/20 text-gray-400',
    };
    return m[b] ?? m.neutral;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left">
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Campanha</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Spend</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Impressões</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Clicks</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">CTR</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">CPC</th>
            <th className="pb-2 font-medium text-muted-foreground text-right">CPM</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b border-white/5 hover:bg-white/2.5">
              <td className="py-2 pr-4 max-w-[200px] truncate">{c.name}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(c.effectiveStatus)}`}>
                  {c.effectiveStatus}
                </span>
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? `R$ ${c.insights.spend.toFixed(2)}` : '—'}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? c.insights.impressions.toLocaleString('pt-BR') : '—'}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? c.insights.clicks.toLocaleString('pt-BR') : '—'}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? `${c.insights.ctr}%` : '—'}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? `R$ ${c.insights.cpc.toFixed(2)}` : '—'}
              </td>
              <td className="py-2 text-right font-mono">
                {c.insights ? `R$ ${c.insights.cpm.toFixed(2)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section Collapsible ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-white/5 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-white/2.5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4 border-t border-white/5">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminMetaAds() {
  const [overview, setOverview] = useState<MetaAdsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMetaAdsOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ── Não configurado / Sem token ──
  if (!loading && overview?.health.status === 'NOT_CONFIGURED') {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SectionHeader
            title="Meta Ads"
            description="Painel de campanhas, métricas e alertas. READ-ONLY — sem permissão de escrita."
          />
          <SetupChecklist />
        </div>
      </AdminLayout>
    );
  }

  // ── Sem permissão / Token inválido ──
  if (!loading && (overview?.health.status === 'NO_PERMISSION' || overview?.health.status === 'TOKEN_INVALID')) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SectionHeader
            title="Meta Ads"
            description="Painel READ-ONLY. Token existe mas não tem permissões de Marketing API."
          />
          <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <XCircle className="text-red-400 shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-400">Meta Ads — Sem Permissão</p>
              <p className="text-xs text-muted-foreground">
                O token configurado não possui escopo <code className="bg-red-500/10 px-1 rounded">ads_read</code>.
                Acesse Business Manager e crie um System User com permissões de Marketing API.
              </p>
            </div>
          </div>
          <SetupChecklist />
        </div>
      </AdminLayout>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SectionHeader title="Meta Ads" description="Carregando dados..." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-white/5">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Erro genérico ──
  if (error || !overview) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SectionHeader title="Meta Ads" description="Erro ao carregar dados." />
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-red-400 text-sm">
            {error ?? 'Erro desconhecido'}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { health, account, campaigns, totalSpend, totalImpressions, totalClicks, avgCpc, avgCpm, avgCtr, topCampaigns, worstCampaigns, noDeliveryCampaigns, pausedCampaigns, errorCampaigns, fetchedAt } = overview;

  // ── Degraded mode banner ──
  const isDegraded = health.status === 'DEGRADED';

  // ── Build metric cards ──
  const metricCards: MetaAdsMetricCardData[] = [
    {
      id: 'spend',
      title: 'Spend (7d)',
      value: totalSpend > 0 ? `R$ ${totalSpend.toFixed(2)}` : '—',
      icon: '💰',
      status: totalSpend > 0 ? 'success' : 'neutral',
      detail: account ? `Conta: ${account.name ?? account.id}` : undefined,
    },
    {
      id: 'impressions',
      title: 'Impressões (7d)',
      value: totalImpressions > 0 ? totalImpressions.toLocaleString('pt-BR') : '—',
      icon: '👁',
      status: 'neutral',
    },
    {
      id: 'clicks',
      title: 'Clicks (7d)',
      value: totalClicks > 0 ? totalClicks.toLocaleString('pt-BR') : '—',
      icon: '🖱',
      status: 'neutral',
    },
    {
      id: 'ctr',
      title: 'CTR (7d)',
      value: avgCtr > 0 ? `${avgCtr}%` : '—',
      icon: '📊',
      status: avgCtr > 2 ? 'success' : avgCtr > 0 ? 'warning' : 'neutral',
      trend: avgCtr > 2 ? 'up' : avgCtr > 0 ? 'stable' : undefined,
    },
    {
      id: 'cpc',
      title: 'CPC Médio (7d)',
      value: avgCpc > 0 ? `R$ ${avgCpc.toFixed(2)}` : '—',
      icon: '💲',
      status: avgCpc > 0 && avgCpc < 3 ? 'success' : avgCpc > 5 ? 'danger' : 'neutral',
      trend: avgCpc > 0 && avgCpc < 3 ? 'up' : avgCpc > 5 ? 'down' : undefined,
    },
    {
      id: 'cpm',
      title: 'CPM Médio (7d)',
      value: avgCpm > 0 ? `R$ ${avgCpm.toFixed(2)}` : '—',
      icon: '📢',
      status: 'neutral',
    },
    {
      id: 'campaigns',
      title: 'Campanhas Ativas',
      value: campaigns.filter((c) => c.effectiveStatus === 'ACTIVE').length.toString(),
      subValue: `${campaigns.length} total`,
      icon: '🎯',
      status: campaigns.some((c) => c.effectiveStatus === 'ACTIVE') ? 'success' : 'warning',
    },
    {
      id: 'campaigns_paused',
      title: 'Campanhas Pausadas',
      value: pausedCampaigns.length.toString(),
      icon: '⏸',
      status: pausedCampaigns.length > 0 ? 'warning' : 'neutral',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Meta Ads"
            description="Campanhas, métricas e alertas. READ-ONLY — sem permissão de escrita."
          />
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge status={health.status} />
            {isDegraded && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <AlertTriangle size={12} />
                Modo Degradado
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Atualizado {new Date(fetchedAt).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Degraded banner */}
        {isDegraded && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Modo Degradado</p>
              <p className="text-xs text-yellow-300/70 mt-1">
                Algumas métricas podem estar indisponíveis. Erro: {health.errorMessage ?? 'desconhecido'}.
              </p>
            </div>
          </div>
        )}

        {/* Account info */}
        {account && (
          <div className="rounded-lg border border-white/5 bg-white/2.5 p-4 flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Conta</span>
              <p className="font-semibold">{account.name ?? account.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <p className="font-medium">{mapAccountStatus(account.accountStatus)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Moeda</span>
              <p className="font-medium">{account.currency ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Fuso</span>
              <p className="font-medium">{account.timezoneName ?? '—'}</p>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              API v{health.apiVersion}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((m) => (
            <MetaMetricCard key={m.id} metric={m} />
          ))}
        </div>

        {/* All Campaigns */}
        {campaigns.length > 0 && (
          <CollapsibleSection
            title="Todas as Campanhas"
            icon={<Megaphone size={16} />}
            count={campaigns.length}
            defaultOpen={campaigns.length <= 10}
          >
            <CampaignTable campaigns={campaigns} />
          </CollapsibleSection>
        )}

        {/* Top Campaigns */}
        {topCampaigns.length > 0 && (
          <CollapsibleSection
            title="🏆 Top Campanhas (ROAS/Spend)"
            icon={<TrendingUp size={16} />}
            count={topCampaigns.length}
          >
            <CampaignTable campaigns={topCampaigns} />
          </CollapsibleSection>
        )}

        {/* Worst Campaigns */}
        {worstCampaigns.length > 0 && (
          <CollapsibleSection
            title="📉 Campanhas com Pior Performance"
            icon={<TrendingDown size={16} />}
            count={worstCampaigns.length}
          >
            <CampaignTable campaigns={worstCampaigns} />
          </CollapsibleSection>
        )}

        {/* No Delivery */}
        {noDeliveryCampaigns.length > 0 && (
          <CollapsibleSection
            title="⚠️ Sem Entrega"
            icon={<AlertTriangle size={16} />}
            count={noDeliveryCampaigns.length}
          >
            <CampaignTable campaigns={noDeliveryCampaigns} />
          </CollapsibleSection>
        )}

        {/* Error Campaigns */}
        {errorCampaigns.length > 0 && (
          <CollapsibleSection
            title="❌ Campanhas com Erro"
            icon={<XCircle size={16} />}
            count={errorCampaigns.length}
          >
            <CampaignTable campaigns={errorCampaigns} />
          </CollapsibleSection>
        )}

        {/* Empty state */}
        {campaigns.length === 0 && health.status === 'CONNECTED' && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma campanha encontrada nesta conta.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
