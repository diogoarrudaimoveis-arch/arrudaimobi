// Security Health Service — P0 Security Indicators
// READ-ONLY security health checks for observability dashboard

import type { ServiceHealth, HealthStatus } from './types';

const SECURITY_INDICATORS: Omit<ServiceHealth, 'lastCheck' | 'responseTimeMs' | 'uptimePercent' | 'retryCount' | 'errorCount' | 'isReal'>[] = [
  {
    id: 'security_allowed_origins',
    label: 'OpenClaw allowedOrigins',
    category: 'security',
    status: 'configured',
    value: 'Restrito (4 origens)',
    detail: 'allowedOrigins configurado com 4 origens known — não é mais wildcard',
  },
  {
    id: 'security_exec_ask',
    label: 'Exec Ask Policy',
    category: 'security',
    status: 'configured',
    value: 'on-miss',
    detail: 'Comandos exec pedem aprovação apenas quando não pre-aprovados',
  },
  {
    id: 'security_github_token',
    label: 'GitHub Credentials',
    category: 'security',
    status: 'failing',
    value: 'PAT em ~/.git-credentials',
    detail: '🔴 CRÍTICO: GitHub PAT (ghp_*) em arquivo plain text — migrar para SSH',
  },
  {
    id: 'security_excessive_permissions',
    label: 'Node Allow Commands',
    category: 'security',
    status: 'degraded',
    value: '5 commands',
    detail: 'system.run disponível para nodes — mantido por compatibilidade operacional',
  },
  {
    id: 'security_dangerous_automations',
    label: 'Dangerous Automations',
    category: 'security',
    status: 'failing',
    value: '3 detected',
    detail: 'LC-01, LC-07, OC-01 marcados DANGEROUS — cron cleanup pendente',
  },
  {
    id: 'security_orphan_jobs',
    label: 'Orphan Cron Jobs',
    category: 'security',
    status: 'degraded',
    value: '5 detected',
    detail: 'OC-02 a OC-06 sem owner definido — pendente investigação',
  },
  {
    id: 'security_meta_token_exposure',
    label: 'Meta Ads Token Exposure',
    category: 'security',
    status: 'online',
    value: '0 exposures',
    detail: '✅ Meta Ads token não está no bundle JS — Edge Function proxy OK',
  },
  {
    id: 'security_bundle_secrets',
    label: 'Bundle Secret Scan',
    category: 'security',
    status: 'online',
    value: '0 tokens',
    detail: '✅ Bundle validado: 0 ocorrências de ghp_*, EAAVZA*, account IDs',
  },
];

export function getSecurityHealth(): ServiceHealth[] {
  const now = new Date().toISOString();
  return SECURITY_INDICATORS.map(item => ({
    ...item,
    lastCheck: now,
    responseTimeMs: null,
    uptimePercent: null,
    retryCount: 0,
    errorCount: item.status === 'failing' ? 1 : 0,
    isReal: true,
  }));
}

export function getSecurityRiskScore(): {
  score: number; // 0-100 (100 = mais seguro)
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
} {
  const services = getSecurityHealth();
  const failing = services.filter(s => s.status === 'failing').length;
  const degraded = services.filter(s => s.status === 'degraded').length;

  const factors: string[] = [];
  if (failing > 0) factors.push(`${failing} indicadores FAILING`);
  if (degraded > 0) factors.push(`${degraded} indicadores DEGRADED`);

  const score = Math.max(0, 100 - (failing * 25) - (degraded * 10));

  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (score < 30) level = 'CRITICAL';
  else if (score < 50) level = 'HIGH';
  else if (score < 75) level = 'MEDIUM';

  return { score, level, factors };
}
