import { useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SectionHeader } from '@/components/admin/ai/AiOpsCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSecurityHealth, getSecurityRiskScore } from '@/lib/observability/securityHealthService';
import type { ServiceHealth } from '@/lib/observability/types';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Key,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; badge: string }> = {
  online: { label: 'SEGURO', icon: <ShieldCheck size={14} />, color: 'text-green-400', badge: 'bg-green-500/10 border-green-500/30 text-green-400' },
  degraded: { label: 'ATENÇÃO', icon: <AlertTriangle size={14} />, color: 'text-yellow-400', badge: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
  failing: { label: 'CRÍTICO', icon: <XCircle size={14} />, color: 'text-red-400', badge: 'bg-red-500/10 border-red-500/30 text-red-400' },
  configured: { label: 'CONFIGURADO', icon: <CheckCircle2 size={14} />, color: 'text-blue-400', badge: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
};

function SecurityIndicatorRow({ indicator }: { indicator: ServiceHealth }) {
  const cfg = STATUS_CONFIG[indicator.status] ?? STATUS_CONFIG.configured;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className={`shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{indicator.label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.badge}`}>
            {cfg.icon}{cfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{indicator.detail}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-medium font-mono">{indicator.value}</span>
      </div>
    </div>
  );
}

function RiskScoreCard({ score, level, factors }: { score: number; level: string; factors: string[] }) {
  const color = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : score >= 30 ? 'text-orange-400' : 'text-red-400';
  const bg = score >= 75 ? 'border-green-500/30 bg-green-500/5' : score >= 50 ? 'border-yellow-500/30 bg-yellow-500/5' : score >= 30 ? 'border-orange-500/30 bg-orange-500/5' : 'border-red-500/30 bg-red-500/5';
  const gaugeColor = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : score >= 30 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <Card className={`border ${bg}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert size={16} />
          Risk Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-bold font-mono ${color}`}>{score}</span>
          <span className="text-sm text-muted-foreground mb-1">/100</span>
          <span className={`ml-auto text-sm font-medium ${color}`}>{level}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${gaugeColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        {factors.length > 0 && (
          <ul className="space-y-1">
            {factors.map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle size={10} className="text-red-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAISecurity() {
  const indicators = useMemo(() => getSecurityHealth(), []);
  const risk = useMemo(() => getSecurityRiskScore(), []);

  const failingIndicators = indicators.filter(i => i.status === 'failing');
  const degradedIndicators = indicators.filter(i => i.status === 'degraded');
  const secureIndicators = indicators.filter(i => i.status === 'online' || i.status === 'configured');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="🔒 Security Center"
          description="Painel de segurança READ-ONLY — monitoramento de riscos, configurações e exposição de segredos. Nenhuma ação é executada automaticamente."
        />

        {/* Risk Score */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RiskScoreCard score={risk.score} level={risk.level} factors={risk.factors} />
          <Card className="border-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono text-red-400">{failingIndicators.length}</p>
              <p className="text-xs text-muted-foreground">Indicadores CRÍTICOS</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono text-yellow-400">{degradedIndicators.length}</p>
              <p className="text-xs text-muted-foreground">Indicadores ATENÇÃO</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-mono text-green-400">{secureIndicators.length}</p>
              <p className="text-xs text-muted-foreground">Configurados/OK</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Indicators */}
        {failingIndicators.length > 0 && (
          <Card className="border-red-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                <XCircle size={16} />
                Indicadores Críticos — Requerem Ação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-1">
              {failingIndicators.map(ind => (
                <SecurityIndicatorRow key={ind.id} indicator={ind} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Attention Indicators */}
        {degradedIndicators.length > 0 && (
          <Card className="border-yellow-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                Indicadores em Atenção
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-1">
              {degradedIndicators.map(ind => (
                <SecurityIndicatorRow key={ind.id} indicator={ind} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* OK Indicators */}
        <Card className="border-green-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-400 flex items-center gap-2">
              <ShieldCheck size={16} />
              Indicadores OK
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-1">
            {secureIndicators.map(ind => (
              <SecurityIndicatorRow key={ind.id} indicator={ind} />
            ))}
          </CardContent>
        </Card>

        {/* Secret Inventory Summary */}
        <Card className="border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key size={16} />
              Inventário de Secrets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                <Lock size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">GitHub PAT</p>
                  <p className="text-xs text-muted-foreground">~/.git-credentials — plain text</p>
                  <p className="text-xs text-red-400/70 mt-1">🔴 Ação: Migrar para SSH</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                <Key size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">API Keys</p>
                  <p className="text-xs text-muted-foreground">Google + xAI em openclaw.json</p>
                  <p className="text-xs text-yellow-400/70 mt-1">🟡 Verificar rotação</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                <Key size={14} className="text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-400">Meta Token</p>
                  <p className="text-xs text-muted-foreground">Supabase Secrets — server-side</p>
                  <p className="text-xs text-green-400/70 mt-1">✅ OK — não exposto</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                <Shield size={14} className="text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-400">Supabase Anon Key</p>
                  <p className="text-xs text-muted-foreground">RLS ativo — publicável</p>
                  <p className="text-xs text-green-400/70 mt-1">✅ OK — método correto</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card className="border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw size={16} />
              Ações Pendentes (requerem Diogo)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs text-red-400 font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Migrar GitHub de PAT para SSH</p>
                  <p className="text-xs text-muted-foreground">Adicionar deploy key no GitHub → configurar SSH → remover ~/.git-credentials</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs text-yellow-400 font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Revisar API keys (Google, xAI)</p>
                  <p className="text-xs text-muted-foreground">Verificar se ainda são necessárias → regenerar se escopo excessivo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs text-orange-400 font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Cron cleanup (LC-01, LC-07, OC-01)</p>
                  <p className="text-xs text-muted-foreground">Plano criado em /root/.openclaw/workspace/artifacts/arruda/cron-cleanup-plan.md</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs text-blue-400 font-bold">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Regenerar Vercel token</p>
                  <p className="text-xs text-muted-foreground">Verificar escopo → minimal scope para deploy only</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
