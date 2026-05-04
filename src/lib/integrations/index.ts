/**
 * Arruda Imobi — Integration Visibility Layer
 * 
 * Camada de observabilidade para监控 ZPRO, Supabase, n8n e MiniMax.
 * SEM migration. Schema-only. Pronto para quando o Diogo quiser ativar.
 * 
 * Importar de qualquer componente React:
 *   import { integrations, useIntegrationHealth } from '@/lib/integrations'
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── tipos ──────────────────────────────────────────────────────────────────

export type IntegrationId = 'supabase' | 'zpro' | 'n8n' | 'minimax'

export interface IntegrationMeta {
  id: IntegrationId
  name: string
  description: string
  /** vazio = sem schema/pipeline definido ainda */
  metrics: string[]
  status: 'unknown' | 'ok' | 'degraded' | 'down'
  latencyMs?: number
}

export interface IntegrationHealth {
  supabase: IntegrationMeta
  zpro: IntegrationMeta
  n8n: IntegrationMeta
  minimax: IntegrationMeta
  lastChecked: Date
}

// ─── descritores estáticos ───────────────────────────────────────────────────

export const integrationDescriptors: Record<IntegrationId, Omit<IntegrationMeta, 'status' | 'latencyMs'>> = {
  supabase: {
    id: 'supabase',
    name: 'Supabase',
    description: 'Banco de dados + auth + storage + realtime',
    metrics: [
      'db_query_latency_ms',
      'auth_success_rate',
      'realtime_connections',
      'storage_upload_bytes',
    ],
  },
  zpro: {
    id: 'zpro',
    name: 'ZPRO / Zap Max',
    description: 'Automação de mensagens WhatsApp em escala',
    metrics: [
      'messages_sent',
      'delivery_rate',
      'webhook_response_ms',
      'queue_depth',
    ],
  },
  n8n: {
    id: 'n8n',
    name: 'n8n Orchestrator',
    description: 'Orquestração de workflows e eventos',
    metrics: [
      'workflow_runs_total',
      'workflow_success_rate',
      'node_executions',
      'error_rate',
    ],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax (OpenClaw)',
    description: 'IA de navegação e extração de leads',
    metrics: [
      'extraction_runs',
      'leads_captured',
      'avg_extraction_time_ms',
      'error_count',
    ],
  },
}

// ─── health check adapters (schema-only, sem effects colaterais) ─────────────

export async function probeSupabase(client: SupabaseClient): Promise<{ latencyMs: number; ok: boolean }> {
  const start = performance.now()
  try {
    const { error } = await client.from('profiles').select('id').limit(1).maybeSingle()
    const latencyMs = Math.round(performance.now() - start)
    return { latencyMs, ok: !error }
  } catch {
    return { latencyMs: Math.round(performance.now() - start), ok: false }
  }
}

export async function probeZpro(client?: SupabaseClient): Promise<{ latencyMs: number; ok: boolean }> {
  const start = performance.now()
  if (!client) return { latencyMs: -1, ok: false }

  try {
    const { error } = await client.functions.invoke('zpro-proxy', {
      body: { action: 'probe' },
    })
    return { latencyMs: Math.round(performance.now() - start), ok: !error }
  } catch {
    return { latencyMs: Math.round(performance.now() - start), ok: false }
  }
}

export async function probeN8n(): Promise<{ latencyMs: number; ok: boolean }> {
  try {
    const baseUrl = import.meta.env.VITE_N8N_API_URL
    if (!baseUrl) return { latencyMs: -1, ok: false }
    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(baseUrl, {
      method: 'HEAD',
      signal: controller.signal,
      // credentials: 'omit' — no cookies sent, no auth header leaked
    })
    clearTimeout(timeoutId)
    const latencyMs = Math.round(performance.now() - start)
    // any HTTP response (incl. 4xx) means the service is reachable
    return { latencyMs, ok: res.ok || (res.status >= 400 && res.status < 600) }
  } catch {
    return { latencyMs: -1, ok: false }
  }
}

export async function probeMiniMax(): Promise<{ latencyMs: number; ok: boolean }> {
  try {
    const baseUrl = import.meta.env.VITE_MINIMAX_API_BASE_URL
    if (!baseUrl) return { latencyMs: -1, ok: false }
    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(baseUrl, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const latencyMs = Math.round(performance.now() - start)
    return { latencyMs, ok: res.ok || (res.status >= 400 && res.status < 600) }
  } catch {
    return { latencyMs: -1, ok: false }
  }
}

// ───聚合 ───────────────────────────────────────────────────────────────────

export async function checkAllIntegrations(supabase?: SupabaseClient): Promise<IntegrationHealth> {
  const [supabaseResult, zproResult, n8nResult, minimaxResult] = await Promise.all([
    supabase ? probeSupabase(supabase) : Promise.resolve({ latencyMs: -1, ok: false }),
    probeZpro(supabase),
    probeN8n(),
    probeMiniMax(),
  ])

  const statusFrom = (ok: boolean, latencyMs: number): IntegrationMeta['status'] => {
    if (latencyMs === -1) return 'unknown'
    return ok ? (latencyMs > 2000 ? 'degraded' : 'ok') : 'down'
  }

  return {
    supabase: {
      ...integrationDescriptors.supabase,
      status: statusFrom(supabaseResult.ok, supabaseResult.latencyMs),
      latencyMs: supabaseResult.latencyMs,
    },
    zpro: {
      ...integrationDescriptors.zpro,
      status: statusFrom(zproResult.ok, zproResult.latencyMs),
      latencyMs: zproResult.latencyMs,
    },
    n8n: {
      ...integrationDescriptors.n8n,
      status: statusFrom(n8nResult.ok, n8nResult.latencyMs),
      latencyMs: n8nResult.latencyMs,
    },
    minimax: {
      ...integrationDescriptors.minimax,
      status: statusFrom(minimaxResult.ok, minimaxResult.latencyMs),
      latencyMs: minimaxResult.latencyMs,
    },
    lastChecked: new Date(),
  }
}

// ─── singleton de métricas (para logging) ───────────────────────────────────

export interface IntegrationMetric {
  integration: IntegrationId
  metric: string
  value: number
  unit: string
  timestamp: Date
}

const metricLog: IntegrationMetric[] = []

export function logMetric(integration: IntegrationId, metric: string, value: number, unit: string) {
  metricLog.push({ integration, metric, value, unit, timestamp: new Date() })
  // manter só últimos 500 entries
  if (metricLog.length > 500) metricLog.splice(0, metricLog.length - 500)
}

export function getMetricLog(limit = 50): IntegrationMetric[] {
  return metricLog.slice(-limit)
}
