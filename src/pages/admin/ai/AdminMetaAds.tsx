import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageShell, PageCard } from '@/components/admin/shared/AdminComponents';
import { SectionHeader } from '@/components/admin/ai/AiOpsCards';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type {
  MetaAdsBudgetDraft,
  MetaAdsOverview,
  MetaHealthStatus,
  MetaCampaignWithInsights,
  MetaAdsMetricCardData,
} from '@/lib/metaAds';
import {
  applyMetaCampaignDailyBudget,
  createMetaCampaign,
  draftMetaCampaignDailyBudget,
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
  Pencil,
  Plus,
  RefreshCw,
  ShoppingCart,
  Users,
  Target,
  Zap,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

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
    <Card className="border-white/5 hover:border-white/10 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.title}</p>
            <p className={`text-xl font-bold ${statusColors[metric.status] ?? 'text-white'}`}>
              {metric.value}
            </p>
            {metric.subValue && (
              <p className="text-[10px] text-muted-foreground">{metric.subValue}</p>
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

// ─── Spend Over Time Chart ──────────────────────────────────────────────────

const SPEND_CHART_COLORS = ['#6366f1', '#06b6d4'];

interface SpendChartProps {
  campaigns: MetaCampaignWithInsights[];
}

function SpendOverTimeChart({ campaigns }: SpendChartProps) {
  // Build spend trend from campaigns that have startTime
  const chartData = useMemo(() => {
    const sorted = [...campaigns]
      .filter((c) => c.insights && c.insights.spend > 0)
      .sort((a, b) => {
        const aTime = a.startTime ?? '';
        const bTime = b.startTime ?? '';
        return aTime.localeCompare(bTime);
      });

    return sorted.map((c) => ({
      name: c.name.length > 20 ? c.name.substring(0, 20) + '…' : c.name,
      spend: c.insights?.spend ?? 0,
      impressions: c.insights?.impressions ?? 0,
      clicks: c.insights?.clicks ?? 0,
      roas: c.insights?.roas ?? 0,
    }));
  }, [campaigns]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
        <BarChart3 className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sem dados de spend para exibir</p>
      </div>
    );
  }

  const chartConfig = {
    spend: { label: 'Spend (R$)', color: SPEND_CHART_COLORS[0] },
    impressions: { label: 'Impressões', color: SPEND_CHART_COLORS[1] },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `R$${v}`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="spend" fill={SPEND_CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Spend (R$)" />
        <Bar dataKey="impressions" fill={SPEND_CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Impressões" />
      </BarChart>
    </ChartContainer>
  );
}

// ─── ROAS Bar Chart ───────────────────────────────────────────────────────────

interface RoasChartProps {
  campaigns: MetaCampaignWithInsights[];
}

function RoasChart({ campaigns }: RoasChartProps) {
  const chartData = useMemo(() => {
    return [...campaigns]
      .filter((c) => c.insights && c.insights.roas > 0)
      .sort((a, b) => (b.insights?.roas ?? 0) - (a.insights?.roas ?? 0))
      .slice(0, 8)
      .map((c) => ({
        name: c.name.length > 18 ? c.name.substring(0, 18) + '…' : c.name,
        roas: Number((c.insights?.roas ?? 0).toFixed(2)),
        spend: c.insights?.spend ?? 0,
      }));
  }, [campaigns]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
        <Zap className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sem dados de ROAS para exibir</p>
      </div>
    );
  }

  const chartConfig = {
    roas: { label: 'ROAS', color: '#22c55e' },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}x`}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                <p className="font-medium">{d.name}</p>
                <p className="text-muted-foreground">ROAS: <span className="text-green-400 font-mono">{d.roas}x</span></p>
                <p className="text-muted-foreground">Spend: <span className="font-mono">R${d.spend.toFixed(2)}</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="roas" fill="#22c55e" radius={[4, 4, 0, 0]} name="ROAS" />
      </BarChart>
    </ChartContainer>
  );
}

// ─── Spend Donut by Campaign ────────────────────────────────────────────────

interface SpendDonutProps {
  campaigns: MetaCampaignWithInsights[];
}

const DONUT_COLORS = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

function SpendDonut({ campaigns }: SpendDonutProps) {
  const chartData = useMemo(() => {
    return [...campaigns]
      .filter((c) => c.insights && c.insights.spend > 0)
      .sort((a, b) => (b.insights?.spend ?? 0) - (a.insights?.spend ?? 0))
      .slice(0, 6)
      .map((c) => ({
        name: c.name.length > 16 ? c.name.substring(0, 16) + '…' : c.name,
        value: c.insights?.spend ?? 0,
      }));
  }, [campaigns]);

  const totalSpend = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
        <PieChart className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sem dados de spend</p>
      </div>
    );
  }

  const renderLabel = ({ name, percent }: { name: string; percent: number }) =>
    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : null;

  return (
    <div className="flex flex-col h-full">
      <ChartContainer
        config={{}}
        className="h-[180px] w-full"
      >
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            label={renderLabel}
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Spend']} />
          <Legend
            content={({ payload }) => (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {payload?.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-muted-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          />
        </PieChart>
      </ChartContainer>
      <div className="text-center mt-auto">
        <p className="text-xs text-muted-foreground">Total spend: <span className="font-mono font-medium text-foreground">R$ {totalSpend.toFixed(2)}</span></p>
      </div>
    </div>
  );
}

// ─── Results Trend Area Chart ────────────────────────────────────────────────

interface ResultsChartProps {
  campaigns: MetaCampaignWithInsights[];
}

function ResultsChart({ campaigns }: ResultsChartProps) {
  const chartData = useMemo(() => {
    return [...campaigns]
      .filter((c) => c.insights && (c.insights.spend > 0 || c.insights.impressions > 0))
      .sort((a, b) => {
        const aTime = a.startTime ?? '';
        const bTime = b.startTime ?? '';
        return aTime.localeCompare(bTime);
      })
      .slice(0, 12)
      .map((c) => ({
        name: c.name.length > 16 ? c.name.substring(0, 16) + '…' : c.name,
        purchases: c.insights?.purchases ?? 0,
        leads: c.insights?.leads ?? 0,
        ctr: c.insights?.ctr ?? 0,
      }));
  }, [campaigns]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
        <TrendingUp className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sem dados de resultados</p>
      </div>
    );
  }

  const chartConfig = {
    purchases: { label: 'Compras', color: '#22c55e' },
    leads: { label: 'Leads', color: '#6366f1' },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area type="monotone" dataKey="purchases" stroke="#22c55e" fill="url(#colorPurchases)" name="Compras" />
        <Area type="monotone" dataKey="leads" stroke="#6366f1" fill="url(#colorLeads)" name="Leads" />
      </AreaChart>
    </ChartContainer>
  );
}

// ─── Campaign Table ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

function formatBudget(value: string | null) {
  if (!value) return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '—';
}

function CampaignTable({ campaigns, canWrite, onEditBudget }: {
  campaigns: MetaCampaignWithInsights[];
  canWrite: boolean;
  onEditBudget: (campaign: MetaCampaignWithInsights) => void;
}) {
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
            <th className="pb-2 pl-4 font-medium text-muted-foreground text-right">Orçamento</th>
            <th className="pb-2 pl-4 font-medium text-muted-foreground text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b border-white/5 hover:bg-white/2.5 transition-colors">
              <td className="py-2 pr-4 max-w-[200px] truncate">{c.name}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(c.effectiveStatus)}`}>
                  {c.effectiveStatus}
                </span>
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? formatCurrency(c.insights.spend) : <span className="text-xs text-muted-foreground">Sem dados</span>}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? formatNumber(c.insights.impressions) : <span className="text-xs text-muted-foreground">Sem dados</span>}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? formatNumber(c.insights.clicks) : <span className="text-xs text-muted-foreground">Sem dados</span>}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? `${c.insights.ctr.toFixed(2)}%` : <span className="text-xs text-muted-foreground">Sem dados</span>}
              </td>
              <td className="py-2 pr-4 text-right font-mono">
                {c.insights ? formatCurrency(c.insights.cpc) : <span className="text-xs text-muted-foreground">Sem dados</span>}
              </td>
              <td className="py-2 text-right font-mono">
                {c.insights ? formatCurrency(c.insights.cpm) : <span className="text-xs text-muted-foreground">Sem dados</span>}
              </td>
              <td className="py-2 pl-4 text-right font-mono">
                {formatBudget(c.dailyBudget)}
              </td>
              <td className="py-2 pl-4 text-right">
                <Button size="sm" variant="outline" onClick={() => onEditBudget(c)}>
                  <Pencil size={12} className="mr-1" />
                  {canWrite ? 'Editar orçamento' : 'Ver write mode'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BudgetEditModal({
  campaign,
  canWrite,
  open,
  onOpenChange,
}: {
  campaign: MetaCampaignWithInsights | null;
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dailyBudget, setDailyBudget] = useState('');
  const [draft, setDraft] = useState<MetaAdsBudgetDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDailyBudget(campaign?.dailyBudget ?? '');
    setDraft(null);
    setStatus(null);
  }, [campaign]);

  const newDailyBudget = Number(String(dailyBudget).replace(',', '.'));
  const invalidBudget = !Number.isFinite(newDailyBudget) || newDailyBudget < 5 || newDailyBudget > 10000;

  async function saveDraft() {
    if (!campaign || invalidBudget) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await draftMetaCampaignDailyBudget({
        campaignId: campaign.id,
        campaignName: campaign.name,
        currentDailyBudget: campaign.dailyBudget,
        newDailyBudget,
      });
      setDraft(result.draft);
      setStatus('Rascunho criado. Nenhuma alteração foi aplicada na Meta.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Erro ao criar rascunho');
    } finally {
      setLoading(false);
    }
  }

  async function applyAfterApproval() {
    if (!campaign || !draft || invalidBudget) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await applyMetaCampaignDailyBudget({
        campaignId: campaign.id,
        campaignName: campaign.name,
        currentDailyBudget: campaign.dailyBudget,
        newDailyBudget,
        approvalId: draft.approvalId,
      });
      setStatus(result.mode === 'applied'
        ? 'Alteração aplicada e validada.'
        : result.error ?? 'Aplicação bloqueada pelo servidor.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Erro ao aplicar alteração');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar orçamento diário</DialogTitle>
          <DialogDescription>
            Fluxo seguro: rascunho → preview → aprovação Diogo → execução → log → validação.
          </DialogDescription>
        </DialogHeader>
        {campaign && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <p className="font-semibold truncate">{campaign.name}</p>
              <p className="text-muted-foreground">Orçamento atual: {formatBudget(campaign.dailyBudget)}</p>
              <p className="text-muted-foreground">Status: {campaign.effectiveStatus}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-daily-budget">Novo orçamento diário (R$)</Label>
              <Input
                id="meta-daily-budget"
                inputMode="decimal"
                value={dailyBudget}
                onChange={(event) => setDailyBudget(event.target.value)}
                placeholder="Ex.: 25,00"
              />
              <p className="text-xs text-muted-foreground">Mínimo R$ 5,00 · máximo R$ 10.000,00.</p>
            </div>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-200">
              <strong>Alerta de risco:</strong> orçamento impacta gasto real. Nada é aplicado sem aprovação explícita.
            </div>
            {!canWrite && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                Token sem write mode segundo o health atual. Apenas rascunho/preview ficam disponíveis.
              </div>
            )}
            {draft && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-xs text-green-200">
                <p><strong>Approval ID:</strong> {draft.approvalId}</p>
                <p>Preview: R$ {draft.currentDailyBudget ?? 0} → R$ {draft.newDailyBudget.toFixed(2)}</p>
              </div>
            )}
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={saveDraft} disabled={loading || invalidBudget}>
            Salvar rascunho
          </Button>
          <Button variant="secondary" disabled={!draft || loading} onClick={() => setStatus('Aprovação registrada como pendente. Solicitar confirmação do Diogo antes de aplicar.')}>
            Solicitar aprovação
          </Button>
          <Button onClick={applyAfterApproval} disabled={!draft || loading || !canWrite}>
            Aplicar após aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Section Collapsible ──────────────────────────────────────────────────────

// ─── Campaign Creation Modal ─────────────────────────────────────────────────

interface CreateCampaignForm {
  name: string;
  objective: string;
  dailyBudget: string;
  status: string;
}

function CreateCampaignModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateCampaignForm>({
    name: '',
    objective: 'OUTCOME_LEADS',
    dailyBudget: '',
    status: 'PAUSED',
  });
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ name: '', objective: 'OUTCOME_LEADS', dailyBudget: '', status: 'PAUSED' });
      setDraft(null);
      setStatus(null);
    }
  }, [open]);

  const newBudget = Number(String(form.dailyBudget).replace(',', '.'));
  const invalidBudget = !Number.isFinite(newBudget) || newBudget < 5 || newBudget > 10000;
  const invalidName = form.name.trim().length < 3;

  async function handleCreate(preview = false) {
    if (invalidName || invalidBudget) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await createMetaCampaign({
        campaignName: form.name.trim(),
        objective: form.objective,
        dailyBudget: newBudget,
        status: form.status,
      });
      if (result.ok) {
        if (result.mode === 'draft') {
          setDraft(result.draft ?? result);
          setStatus('Rascunho criado — ação não foi aplicada na Meta.');
        } else {
          setStatus('Campanha criada com sucesso na Meta Ads!');
          setTimeout(() => { onOpenChange(false); onCreated(); }, 1500);
        }
      } else {
        setStatus(result.error ?? 'Erro ao criar campanha');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  }

  const objectiveLabels: Record<string, string> = {
    OUTCOME_LEADS: 'Conversões / Leads',
    OUTCOME_SALES: 'Vendas',
    OUTCOME_AWARENESS: 'Reconhecimento',
    OUTCOME_ENGAGEMENT: 'Engajamento',
    OUTCOME_TRAFFIC: 'Tráfego',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Campanha</DialogTitle>
          <DialogDescription>
            Crie uma nova campanha de anúncios. Rascunho disponível mesmo sem write mode.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cc-name">Nome da Campanha</Label>
            <Input
              id="cc-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Imóveis 3 dorms — Junho 2025"
              maxLength={128}
            />
            {invalidName && form.name.length > 0 && (
              <p className="text-xs text-red-400">Nome deve ter pelo menos 3 caracteres</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cc-objective">Objetivo</Label>
            <select
              id="cc-objective"
              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
            >
              {Object.entries(objectiveLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cc-budget">Orçamento Diário (R$)</Label>
            <Input
              id="cc-budget"
              inputMode="decimal"
              value={form.dailyBudget}
              onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })}
              placeholder="Ex.: 25,00"
            />
            {invalidBudget && form.dailyBudget.length > 0 && (
              <p className="text-xs text-red-400">Mínimo R$ 5,00 · máximo R$ 10.000,00</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cc-status">Status Inicial</Label>
            <select
              id="cc-status"
              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="PAUSED">Pausada (não veicula)</option>
              <option value="ACTIVE">Ativa (veicula imediatamente)</option>
            </select>
          </div>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-200">
            <strong>Atenção:</strong> criar campanha é uma ação irreversível. Solicite aprovação do Diogo antes de executar.
          </div>
          {draft && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-xs text-green-200">
              <p><strong>Approval ID:</strong> {String(draft.approvalId ?? '')}</p>
              <p>Preview: {form.name} · R$ {newBudget.toFixed(2)}/dia · {form.status}</p>
            </div>
          )}
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleCreate(true)} disabled={loading || invalidName || invalidBudget}>
            Gerar rascunho
          </Button>
          <Button onClick={() => handleCreate(false)} disabled={loading || invalidName || invalidBudget}>
            {draft ? 'Criar na Meta' : 'Solicitar aprovação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [budgetCampaign, setBudgetCampaign] = useState<MetaCampaignWithInsights | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  async function fetchLiveMetaAds({ initial = false }: { initial?: boolean } = {}) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    setRefreshError(null);

    try {
      const data = await getMetaAdsOverview();
      setOverview(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (initial) setError(message);
      else setRefreshError(message || 'Erro ao atualizar dados da Meta Ads');
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }

  function handleCampaignCreated() {
    fetchLiveMetaAds();
    setCreateModalOpen(false);
  }

  useEffect(() => {
    let mounted = true;
    getMetaAdsOverview()
      .then((data) => { if (mounted) setOverview(data); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // ── Não configurado / Sem token ──
  if (!loading && overview?.health.status === 'NOT_CONFIGURED') {
    return (
      <AdminLayout>
        <AdminPageShell>
          <PageCard>
            <SectionHeader
              title="Meta Ads"
              description="Painel de campanhas, métricas e alertas. READ-ONLY — sem permissão de escrita."
            />
            <SetupChecklist />
          </PageCard>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  // ── Sem permissão / Token inválido ──
  if (!loading && (overview?.health.status === 'NO_PERMISSION' || overview?.health.status === 'TOKEN_INVALID')) {
    return (
      <AdminLayout>
        <AdminPageShell>
          <PageCard>
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
          </PageCard>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <AdminLayout>
        <AdminPageShell>
          <PageCard>
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
          </PageCard>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  // ── Erro genérico ──
  if (error || !overview) {
    return (
      <AdminLayout>
        <AdminPageShell>
          <PageCard>
            <SectionHeader title="Meta Ads" description="Erro ao carregar dados." />
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-red-400 text-sm">
              {error ?? 'Erro desconhecido'}
            </div>
          </PageCard>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  const {
    health, account, campaigns, totalSpend, totalImpressions, totalClicks,
    avgCpc, avgCpm, avgCtr, totalPurchases, totalLeads, avgRoas,
    topCampaigns, worstCampaigns, noDeliveryCampaigns, pausedCampaigns, errorCampaigns, fetchedAt
  } = overview;
  const canWriteMetaAds = health.canReadAds && health.canManageAds;
  const isDegraded = health.status === 'DEGRADED';

  // ── Build metric cards ──
  const metricCards: MetaAdsMetricCardData[] = [
    {
      id: 'spend',
      title: 'Spend (7d)',
      value: totalSpend > 0 ? formatCurrency(totalSpend) : 'Sem dados',
      icon: '💰',
      status: totalSpend > 0 ? 'success' : 'neutral',
      detail: account ? `Conta: ${account.name ?? account.id}` : undefined,
    },
    {
      id: 'impressions',
      title: 'Impressões (7d)',
      value: totalImpressions > 0 ? formatNumber(totalImpressions) : 'Sem dados',
      icon: '👁',
      status: 'neutral',
    },
    {
      id: 'clicks',
      title: 'Clicks (7d)',
      value: totalClicks > 0 ? formatNumber(totalClicks) : 'Sem dados',
      icon: '🖱',
      status: 'neutral',
    },
    {
      id: 'ctr',
      title: 'CTR (7d)',
      value: avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : 'Sem dados',
      icon: '📊',
      status: avgCtr > 2 ? 'success' : avgCtr > 0 ? 'warning' : 'neutral',
      trend: avgCtr > 2 ? 'up' : avgCtr > 0 ? 'stable' : undefined,
    },
    {
      id: 'cpc',
      title: 'CPC Médio (7d)',
      value: avgCpc > 0 ? formatCurrency(avgCpc) : 'Sem dados',
      icon: '💲',
      status: avgCpc > 0 && avgCpc < 3 ? 'success' : avgCpc > 5 ? 'danger' : 'neutral',
      trend: avgCpc > 0 && avgCpc < 3 ? 'up' : avgCpc > 5 ? 'down' : undefined,
    },
    {
      id: 'purchases',
      title: 'Compras (7d)',
      value: totalPurchases > 0 ? formatNumber(totalPurchases) : 'Sem dados',
      icon: '🛒',
      status: totalPurchases > 0 ? 'success' : 'neutral',
      subValue: avgRoas > 0 ? `ROAS: ${avgRoas.toFixed(2)}x` : undefined,
    },
    {
      id: 'leads',
      title: 'Leads (7d)',
      value: totalLeads > 0 ? formatNumber(totalLeads) : 'Sem dados',
      icon: '👥',
      status: totalLeads > 0 ? 'success' : 'neutral',
    },
    {
      id: 'campaigns',
      title: 'Campanhas Ativas',
      value: campaigns.filter((c) => c.effectiveStatus === 'ACTIVE').length.toString(),
      subValue: `${campaigns.length} total`,
      icon: '🎯',
      status: campaigns.some((c) => c.effectiveStatus === 'ACTIVE') ? 'success' : 'warning',
    },
  ];

  return (
    <AdminLayout>
      <AdminPageShell>
        <PageCard>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Meta Ads"
            description={canWriteMetaAds
              ? 'Campanhas, métricas e alertas. WRITE-MODE controlado — rascunho e aprovação obrigatórios.'
              : 'Campanhas, métricas e alertas. READ-ONLY — sem permissão de escrita.'}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchLiveMetaAds()}
              disabled={refreshing}
              aria-label="Atualizar dados ao vivo da Meta Ads"
            >
              <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar agora'}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              aria-label="Criar nova campanha na Meta Ads"
            >
              <Plus size={14} className="mr-2" />
              Criar Campanha
            </Button>
            <HealthBadge status={health.status} />
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${canWriteMetaAds ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
              <Shield size={12} />
              {canWriteMetaAds ? 'WRITE-MODE READY' : 'READ-ONLY'}
            </span>
            {isDegraded && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <AlertTriangle size={12} />
                Modo Degradado
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Atualizado às {new Date(fetchedAt).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        {refreshError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
            Não foi possível atualizar agora: {refreshError}
          </div>
        )}

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

        {/* Charts — Tabs: Spend | ROAS | Resultados */}
        {campaigns.length > 0 && (
          <Tabs defaultValue="spend" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="spend">
                <DollarSign size={14} className="mr-1.5" />
                Spend
              </TabsTrigger>
              <TabsTrigger value="roas">
                <Zap size={14} className="mr-1.5" />
                ROAS
              </TabsTrigger>
              <TabsTrigger value="results">
                <Target size={14} className="mr-1.5" />
                Resultados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spend">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Spend &amp; Impressões por Campanha
                    </p>
                    <SpendOverTimeChart campaigns={campaigns} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Distribuição de Spend
                    </p>
                    <SpendDonut campaigns={campaigns} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="roas">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    ROAS por Campanha (top 8)
                  </p>
                  <RoasChart campaigns={campaigns} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Compras &amp; Leads por Campanha
                  </p>
                  <ResultsChart campaigns={campaigns} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* All Campaigns */}
        {campaigns.length > 0 && (
          <CollapsibleSection
            title="Todas as Campanhas"
            icon={<Megaphone size={16} />}
            count={campaigns.length}
            defaultOpen={campaigns.length <= 10}
          >
            <CampaignTable campaigns={campaigns} canWrite={canWriteMetaAds} onEditBudget={setBudgetCampaign} />
          </CollapsibleSection>
        )}

        {/* Top Campaigns */}
        {topCampaigns.length > 0 && (
          <CollapsibleSection
            title="🏆 Top Campanhas (ROAS/Spend)"
            icon={<TrendingUp size={16} />}
            count={topCampaigns.length}
          >
            <CampaignTable campaigns={topCampaigns} canWrite={canWriteMetaAds} onEditBudget={setBudgetCampaign} />
          </CollapsibleSection>
        )}

        {/* Worst Campaigns */}
        {worstCampaigns.length > 0 && (
          <CollapsibleSection
            title="📉 Campanhas com Pior Performance"
            icon={<TrendingDown size={16} />}
            count={worstCampaigns.length}
          >
            <CampaignTable campaigns={worstCampaigns} canWrite={canWriteMetaAds} onEditBudget={setBudgetCampaign} />
          </CollapsibleSection>
        )}

        {/* No Delivery */}
        {noDeliveryCampaigns.length > 0 && (
          <CollapsibleSection
            title="⚠️ Sem Entrega"
            icon={<AlertTriangle size={16} />}
            count={noDeliveryCampaigns.length}
          >
            <CampaignTable campaigns={noDeliveryCampaigns} canWrite={canWriteMetaAds} onEditBudget={setBudgetCampaign} />
          </CollapsibleSection>
        )}

        {/* Error Campaigns */}
        {errorCampaigns.length > 0 && (
          <CollapsibleSection
            title="❌ Campanhas com Erro"
            icon={<XCircle size={16} />}
            count={errorCampaigns.length}
          >
            <CampaignTable campaigns={errorCampaigns} canWrite={canWriteMetaAds} onEditBudget={setBudgetCampaign} />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Histórico de alterações"
          icon={<Activity size={16} />}
          defaultOpen={false}
        >
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Logs serão gravados em <code className="bg-white/10 px-1 rounded">meta_ads_audit_log</code> quando a Edge Function write for habilitada.</p>
            <p>Rollback usa valor anterior salvo no log antes de qualquer mutação.</p>
          </div>
        </CollapsibleSection>

        <BudgetEditModal
          campaign={budgetCampaign}
          canWrite={canWriteMetaAds}
          open={Boolean(budgetCampaign)}
          onOpenChange={(open) => !open && setBudgetCampaign(null)}
        />

        {/* Empty state */}
        {campaigns.length === 0 && health.status === 'CONNECTED' && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma campanha encontrada nesta conta.</p>
          </div>
        )}
        </PageCard>
      </AdminPageShell>
    </AdminLayout>
  );
}