// Health Service — Real Observability Checks
// READ-ONLY health checks for all Arruda AI Ops services

import type { ServiceHealth, SystemHealth, HealthStatus } from './types';

const TIMEOUT_MS = 8000;

function mapToHealthStatus(ok: boolean, degraded: boolean, error: boolean): HealthStatus {
  if (ok) return 'online';
  if (degraded) return 'degraded';
  if (error) return 'failing';
  return 'unknown';
}

async function fetchWithTimeout(url: string, timeout = TIMEOUT_MS): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, method: 'HEAD' });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.includes('abort') || msg.includes('timeout');
    return { ok: false, status: 0, latencyMs: Date.now() - start, error: isTimeout ? 'timeout' : msg };
  }
}

// ─── Individual Health Checks ─────────────────────────────────────────────────

async function checkOpenClawGateway(): Promise<ServiceHealth> {
  const start = Date.now();
  const GATEWAY_URL = (import.meta.env.VITE_OPENCLAW_GATEWAY_URL as string) || 'http://206.183.129.240:18789';
  const now = new Date().toISOString();

  try {
    const res = await fetchWithTimeout(`${GATEWAY_URL}/health`, 5000);
    if (res.ok) {
      return {
        id: 'openclaw_gateway',
        label: 'OpenClaw Gateway',
        category: 'core',
        status: 'online',
        value: 'Online',
        detail: `Gateway respondendo em ${res.latencyMs}ms`,
        lastCheck: now,
        responseTimeMs: res.latencyMs,
        uptimePercent: null,
        retryCount: 0,
        errorCount: 0,
        isReal: true,
      };
    }
    return {
      id: 'openclaw_gateway',
      label: 'OpenClaw Gateway',
      category: 'core',
      status: 'failing',
      value: `HTTP ${res.status}`,
      detail: `Gateway retornou HTTP ${res.status}`,
      lastCheck: now,
      responseTimeMs: res.latencyMs,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 1,
      isReal: true,
    };
  } catch (e) {
    return {
      id: 'openclaw_gateway',
      label: 'OpenClaw Gateway',
      category: 'core',
      status: 'failing',
      value: 'Unreachable',
      detail: e instanceof Error ? e.message.substring(0, 80) : 'Erro de conexão',
      lastCheck: now,
      responseTimeMs: Date.now() - start,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 1,
      isReal: true,
    };
  }
}

async function checkSite(): Promise<ServiceHealth> {
  const start = Date.now();
  const siteUrl = (import.meta.env.VITE_SITE_URL as string) || 'https://arrudaimobi.com.br';
  const now = new Date().toISOString();
  const res = await fetchWithTimeout(siteUrl);
  return {
    id: 'site',
    label: 'Site (arrudaimobi.com.br)',
    category: 'core',
    status: res.ok ? 'online' : 'failing',
    value: res.ok ? `200 OK` : `HTTP ${res.status}`,
    detail: res.ok ? `Site respondendo em ${res.latencyMs}ms` : res.error ?? `HTTP ${res.status}`,
    lastCheck: now,
    responseTimeMs: res.latencyMs,
    uptimePercent: null,
    retryCount: 0,
    errorCount: res.ok ? 0 : 1,
    isReal: true,
  };
}

async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl) {
    return {
      id: 'supabase',
      label: 'Supabase',
      category: 'infrastructure',
      status: 'requires_auth',
      value: 'Não configurado',
      detail: 'VITE_SUPABASE_URL não definido',
      lastCheck: now,
      responseTimeMs: null,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 0,
      isReal: false,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id&limit=1`, {
      signal: controller.signal,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return {
        id: 'supabase',
        label: 'Supabase',
        category: 'infrastructure',
        status: 'online',
        value: 'Online',
        detail: `Banco respondendo em ${latencyMs}ms`,
        lastCheck: now,
        responseTimeMs: latencyMs,
        uptimePercent: null,
        retryCount: 0,
        errorCount: 0,
        isReal: true,
      };
    }
    const detail = res.status === 404 ? 'Tabela tenants não encontrada' : `HTTP ${res.status}`;
    return {
      id: 'supabase',
      label: 'Supabase',
      category: 'infrastructure',
      status: res.status === 404 ? 'degraded' : 'failing',
      value: `HTTP ${res.status}`,
      detail,
      lastCheck: now,
      responseTimeMs: latencyMs,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 1,
      isReal: true,
    };
  } catch (e) {
    return {
      id: 'supabase',
      label: 'Supabase',
      category: 'infrastructure',
      status: 'failing',
      value: 'Unreachable',
      detail: e instanceof Error ? e.message.substring(0, 80) : 'Erro',
      lastCheck: now,
      responseTimeMs: Date.now() - start,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 1,
      isReal: true,
    };
  }
}

async function checkN8N(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();
  const n8nUrl = import.meta.env.VITE_N8N_URL as string;

  if (!n8nUrl) {
    return {
      id: 'n8n',
      label: 'N8N (Automações)',
      category: 'ai',
      status: 'configured',
      value: 'Não configurado',
      detail: 'VITE_N8N_URL não definido — automações não monitoradas',
      lastCheck: now,
      responseTimeMs: null,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 0,
      isReal: false,
    };
  }

  const res = await fetchWithTimeout(`${n8nUrl}/healthz`);
  return {
    id: 'n8n',
    label: 'N8N (Automações)',
    category: 'ai',
    status: res.ok ? 'online' : 'failing',
    value: res.ok ? 'Online' : 'Unreachable',
    detail: res.ok ? `N8N respondendo em ${res.latencyMs}ms` : res.error ?? 'N8N não responde',
    lastCheck: now,
    responseTimeMs: res.latencyMs,
    uptimePercent: null,
    retryCount: 0,
    errorCount: res.ok ? 0 : 1,
    isReal: true,
  };
}

async function checkVercel(): Promise<ServiceHealth> {
  const now = new Date().toISOString();
  // Vercel project info is public — no token needed for basic status
  // We check via DNS resolution and public endpoint
  const res = await fetchWithTimeout('https://vercel.com');
  return {
    id: 'vercel',
    label: 'Vercel (Deploys)',
    category: 'infrastructure',
    status: res.ok ? 'online' : 'degraded',
    value: res.ok ? 'Online' : 'Degraded',
    detail: res.ok ? 'Plataforma Vercel operacional' : 'Vercel com problemas de disponibilidade',
    lastCheck: now,
    responseTimeMs: res.latencyMs,
    uptimePercent: null,
    retryCount: 0,
    errorCount: res.ok ? 0 : 1,
    isReal: true,
  };
}

async function checkMetaAdsEdge(): Promise<ServiceHealth> {
  const start = Date.now();
  const now = new Date().toISOString();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !supabaseKey) {
    return {
      id: 'meta_ads',
      label: 'Meta Ads (Campanhas)',
      category: 'integrations',
      status: 'requires_auth',
      value: 'Não configurado',
      detail: 'Supabase env não definido',
      lastCheck: now,
      responseTimeMs: null,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 0,
      isReal: false,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${supabaseUrl}/functions/v1/meta-ads-readonly`, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const status = data?.health?.status === 'CONNECTED' ? 'online' : 'degraded';
      return {
        id: 'meta_ads',
        label: 'Meta Ads (Campanhas)',
        category: 'integrations',
        status,
        value: data?.health?.status === 'CONNECTED' ? 'Conectado' : 'Degradado',
        detail: `Edge Function OK — ${data?.campaigns?.length ?? 0} campanhas | ${latencyMs}ms`,
        lastCheck: now,
        responseTimeMs: latencyMs,
        uptimePercent: null,
        retryCount: 0,
        errorCount: 0,
        isReal: true,
      };
    }
    return {
      id: 'meta_ads',
      label: 'Meta Ads (Campanhas)',
      category: 'integrations',
      status: 'failing',
      value: `HTTP ${res.status}`,
      detail: 'Edge Function retornou erro',
      lastCheck: now,
      responseTimeMs: latencyMs,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 1,
      isReal: true,
    };
  } catch (e) {
    return {
      id: 'meta_ads',
      label: 'Meta Ads (Campanhas)',
      category: 'integrations',
      status: 'failing',
      value: 'Unreachable',
      detail: e instanceof Error ? e.message.substring(0, 80) : 'Erro',
      lastCheck: now,
      responseTimeMs: Date.now() - start,
      uptimePercent: null,
      retryCount: 0,
      errorCount: 1,
      isReal: true,
    };
  }
}

async function checkOpenClawAgent(): Promise<ServiceHealth> {
  const now = new Date().toISOString();
  // Agent status — can be inferred from gateway reachability
  // Real agent status requires OpenClaw internal API
  return {
    id: 'openclaw_agents',
    label: 'OpenClaw Agents',
    category: 'ai',
    status: 'configured',
    value: 'Check via CLI',
    detail: 'Status dos agentes disponível via openclaw status — verificação visual only',
    lastCheck: now,
    responseTimeMs: null,
    uptimePercent: null,
    retryCount: 0,
    errorCount: 0,
    isReal: false,
  };
}

async function checkGitHubIntegration(): Promise<ServiceHealth> {
  const now = new Date().toISOString();
  return {
    id: 'github',
    label: 'GitHub (CI/CD)',
    category: 'infrastructure',
    status: 'requires_auth',
    value: 'Token requerido',
    detail: 'GitHub API token não disponível no frontend — verificação via Actions CI',
    lastCheck: now,
    responseTimeMs: null,
    uptimePercent: null,
    retryCount: 0,
    errorCount: 0,
    isReal: false,
  };
}

// ─── Full System Health ────────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
  const checks = await Promise.allSettled([
    checkSite(),
    checkOpenClawGateway(),
    checkSupabase(),
    checkN8N(),
    checkVercel(),
    checkMetaAdsEdge(),
    checkOpenClawAgent(),
    checkGitHubIntegration(),
  ]);

  const services = checks
    .filter((r): r is PromiseFulfilledResult<ServiceHealth> => r.status === 'fulfilled')
    .map(r => r.value);

  const total = services.length;
  const online = services.filter(s => s.status === 'online').length;
  const degraded = services.filter(s => s.status === 'degraded').length;
  const failing = services.filter(s => s.status === 'failing' || s.status === 'disconnected').length;

  let overall: HealthStatus = 'online';
  if (failing > 0) overall = 'failing';
  else if (degraded > 0) overall = 'degraded';

  return {
    overall,
    services,
    checkedAt: new Date().toISOString(),
    totalOnline: online,
    totalDegraded: degraded,
    totalFailing: failing,
    totalServices: total,
  };
}

// Map OpsStatus string to our HealthStatus
export function toHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'online': return 'text-green-400';
    case 'degraded': return 'text-yellow-400';
    case 'failing': return 'text-red-400';
    case 'disconnected': return 'text-gray-400';
    case 'unknown': return 'text-gray-500';
    case 'configured': return 'text-blue-400';
    case 'requires_auth': return 'text-orange-400';
    default: return 'text-gray-500';
  }
}

export function toHealthStatusBg(status: HealthStatus): string {
  switch (status) {
    case 'online': return 'bg-green-500/10 border-green-500/30';
    case 'degraded': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'failing': return 'bg-red-500/10 border-red-500/30';
    case 'disconnected': return 'bg-gray-500/10 border-gray-500/30';
    case 'unknown': return 'bg-gray-500/10 border-gray-500/30';
    case 'configured': return 'bg-blue-500/10 border-blue-500/30';
    case 'requires_auth': return 'bg-orange-500/10 border-orange-500/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
}
