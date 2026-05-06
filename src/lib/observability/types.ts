// Observability Types — Arruda AI Ops

export type HealthStatus = 'online' | 'degraded' | 'failing' | 'disconnected' | 'unknown' | 'configured' | 'requires_auth';
export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type LogLevel = 'info' | 'warn' | 'error' | 'critical';

// ─── Health ───────────────────────────────────────────────────────────────────

export interface ServiceHealth {
  id: string;
  label: string;
  category: 'core' | 'ai' | 'infrastructure' | 'integrations';
  status: HealthStatus;
  value: string;
  detail: string;
  lastCheck: string; // ISO timestamp
  responseTimeMs: number | null;
  uptimePercent: number | null;
  retryCount: number;
  errorCount: number;
  isReal: boolean; // true = live check, false = mock/config-based
}

export interface SystemHealth {
  overall: HealthStatus;
  services: ServiceHealth[];
  checkedAt: string;
  totalOnline: number;
  totalDegraded: number;
  totalFailing: number;
  totalServices: number;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  agentId?: string;
  service: string;
  message: string;
  timestamp: string; // ISO
  correlationId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
}

export interface LogFilter {
  levels: LogLevel[];
  sources: string[];
  agents: string[];
  services: string[];
  search: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export type AlertCategory = 'system' | 'automation' | 'security' | 'performance' | 'deploy';
export type AlertAction = 'telegram' | 'slack' | 'email' | 'none';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: AlertCategory;
  source: string;
  serviceId: string;
  createdAt: string;
  acknowledged: boolean;
  resolvedAt: string | null;
  acknowledgedBy: string | null;
  notifiedVia: AlertAction[];
  webhookUrl?: string;
  triggerCondition: string;
  isActive: boolean;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold?: number;
  isEstimate: boolean;
}

// ─── Governance ───────────────────────────────────────────────────────────────

export interface GovernanceItem {
  id: string;
  type: 'dangerous' | 'orphan' | 'duplicated' | 'degraded' | 'critical' | 'pending_approval';
  severity: Severity;
  title: string;
  description: string;
  automationId?: string;
  serviceId?: string;
  owner: string;
  recommendedAction: string;
  createdAt: string;
  isActionable: boolean;
}
