// Log Service — Structured Operational Logs
// Client-side log aggregation for observability (no server persistence)

import type { LogEntry, LogFilter, LogLevel } from './types';

const MAX_LOGS = 500;
const LOG_STORAGE_KEY = 'arruda_ops_logs';

let inMemoryLogs: LogEntry[] = [];

// ─── In-Memory Log Buffer ────────────────────────────────────────────────────

export function log(level: LogLevel, source: string, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    source,
    service: source,
    message,
    timestamp: new Date().toISOString(),
    correlationId: meta?.correlationId as string | undefined,
    traceId: meta?.traceId as string | undefined,
    metadata: meta,
    resolved: false,
  };

  inMemoryLogs.unshift(entry);
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs = inMemoryLogs.slice(0, MAX_LOGS);
  }

  // Persist last 100 to sessionStorage
  try {
    const compact = inMemoryLogs.slice(0, 100).map(l => ({
      ...l,
      metadata: undefined, // Don't store metadata in sessionStorage
    }));
    sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(compact));
  } catch { /* ignore quota errors */ }
}

// ─── Bootstrap from sessionStorage ─────────────────────────────────────────────

export function bootstrapLogs(): void {
  try {
    const stored = sessionStorage.getItem(LOG_STORAGE_KEY);
    if (stored) {
      const parsed: LogEntry[] = JSON.parse(stored);
      inMemoryLogs = parsed;
    }
  } catch { /* ignore */ }
}

// ─── Query Logs ──────────────────────────────────────────────────────────────

export function queryLogs(filter?: Partial<LogFilter>): LogEntry[] {
  bootstrapLogs();

  let results = [...inMemoryLogs];

  if (!filter) return results;

  if (filter.levels && filter.levels.length > 0) {
    results = results.filter(l => filter.levels!.includes(l.level));
  }

  if (filter.sources && filter.sources.length > 0) {
    results = results.filter(l => filter.sources!.includes(l.source));
  }

  if (filter.services && filter.services.length > 0) {
    results = results.filter(l => filter.services!.includes(l.service));
  }

  if (filter.search && filter.search.length > 0) {
    const q = filter.search.toLowerCase();
    results = results.filter(
      l =>
        l.message.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q)
    );
  }

  if (filter.dateFrom) {
    results = results.filter(l => l.timestamp >= filter.dateFrom!);
  }

  if (filter.dateTo) {
    results = results.filter(l => l.timestamp <= filter.dateTo!);
  }

  return results;
}

export function getLogStats(): {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<string, number>;
  last24h: number;
} {
  bootstrapLogs();
  const now = Date.now();
  const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const byLevel: Record<LogLevel, number> = { info: 0, warn: 0, error: 0, critical: 0 };
  const bySource: Record<string, number> = {};

  for (const log of inMemoryLogs) {
    byLevel[log.level] = (byLevel[log.level] ?? 0) + 1;
    bySource[log.source] = (bySource[log.source] ?? 0) + 1;
  }

  return {
    total: inMemoryLogs.length,
    byLevel,
    bySource,
    last24h: inMemoryLogs.filter(l => l.timestamp >= last24h).length,
  };
}

// ─── Seed Mock Logs (for demo/development) ────────────────────────────────────

export function seedMockLogs(): void {
  const mockEntries: LogEntry[] = [
    {
      id: 'log-001',
      level: 'info',
      source: 'openclaw',
      service: 'openclaw',
      message: 'Gateway health check OK — uptime 99.8%',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      resolved: true,
    },
    {
      id: 'log-002',
      level: 'warn',
      source: 'cron',
      service: 'system',
      message: 'LC-01 Claw3D builder executado mas feature desabilitada — cron trigger redundante',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      correlationId: 'cron-lc01-001',
      resolved: false,
    },
    {
      id: 'log-003',
      level: 'warn',
      source: 'cron',
      service: 'system',
      message: 'LC-07 Builderfy syntax error — comando ignorado silenciosamente',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      correlationId: 'cron-lc07-001',
      resolved: false,
    },
    {
      id: 'log-004',
      level: 'info',
      source: 'meta_ads',
      service: 'meta_ads',
      message: 'Meta Ads Edge Function — 2 campanhas ativas, R$25.37 spend (7d)',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolved: true,
    },
    {
      id: 'log-005',
      level: 'error',
      source: 'automation',
      service: 'automation',
      message: 'OC-01 remote-access-research timeout loop — 5min timeout, retry 3x',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      correlationId: 'oc01-timeout-001',
      resolved: false,
    },
    {
      id: 'log-006',
      level: 'info',
      source: 'supabase',
      service: 'supabase',
      message: 'Edge Function meta-ads-readonly deployed successfully',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      resolved: true,
    },
    {
      id: 'log-007',
      level: 'critical',
      source: 'security',
      service: 'guardiao_chaves',
      message: 'GITHUB_TOKEN detectado no remote do git credentials store — risco de exfiltação',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      correlationId: 'security-token-001',
      resolved: true,
    },
    {
      id: 'log-008',
      level: 'warn',
      source: 'vercel',
      service: 'vercel',
      message: 'Deploy preview arrudaimobi-ekxeewvsi falhou — BUILD FAILED',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      resolved: true,
    },
    {
      id: 'log-009',
      level: 'info',
      source: 'github',
      service: 'github',
      message: 'Branch arruda/ai-first-central-ia-draft atualizada — 3 commits ahead',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      resolved: true,
    },
    {
      id: 'log-010',
      level: 'info',
      source: 'openclaw',
      service: 'openclaw',
      message: 'Agent main heartbeat — sessão ativa, 23h42 uptime',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      resolved: true,
    },
    {
      id: 'log-011',
      level: 'warn',
      source: 'automation',
      service: 'automation',
      message: '5 automations ORPHAN detected — sem owner há mais de 7 dias',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      resolved: false,
    },
    {
      id: 'log-012',
      level: 'error',
      source: 'automation',
      service: 'automation',
      message: '2 automations FAILING — LC-07 Builderfy e OC-01 remote-research',
      timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      resolved: false,
    },
  ];

  inMemoryLogs = mockEntries;
}

// ─── Pre-seed on module load ──────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  bootstrapLogs();
  if (inMemoryLogs.length === 0) {
    seedMockLogs();
  }
}
