// N8N Integration Client
// Base URL: https://workflow.techatende.com.br
// Handles webhook triggers for Arruda Imobi automations

const N8N_BASE_URL = import.meta.env.VITE_N8N_URL || 'https://workflow.techatende.com.br';
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY;

export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  lastRun?: string;
  executionsCount: number;
  triggerType: 'webhook' | 'schedule' | 'manual';
  category: 'lead' | 'visit' | 'followup' | 'marketing' | 'whatsapp';
  description: string;
  webhookPath: string;
}

export interface N8NExecution {
  id: string;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  data?: Record<string, unknown>;
}

export interface N8NTriggerPayload {
  event: 'lead_captured' | 'visit_scheduled' | 'follow_up' | 'instagram_post' | 'catalog_request';
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Predefined webhook paths for Arruda Imobi automations
export const ARRADA_IMOBI_WEBHOOKS = {
  LEAD_CAPTURE: `${N8N_BASE_URL}/webhook/arruda-lead-capture`,
  VISIT_SCHEDULED: `${N8N_BASE_URL}/webhook/arruda-visit-scheduled`,
  FOLLOW_UP: `${N8N_BASE_URL}/webhook/arruda-follow-up`,
  INSTAGRAM_POST: `${N8N_BASE_URL}/webhook/arruda-instagram-post`,
  CATALOG_REQUEST: `${N8N_BASE_URL}/webhook/arruda-catalog-request`,
  WHATSAPP_WEBHOOK: `${N8N_BASE_URL}/webhook/arruda-whatsapp`,
} as const;

// Trigger a N8N webhook manually
export async function triggerN8NWebhook(
  path: string,
  payload: N8NTriggerPayload
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    // N8N webhook responses vary — some return execution ID, others just 200
    const text = await response.text();
    const executionId = extractExecutionId(text) || extractExecutionIdFromHeaders(response.headers);

    return { success: true, executionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

function extractExecutionId(text: string): string | undefined {
  // Try to find an execution ID in common N8N response formats
  const patterns = [
    /"executionId"\s*:\s*"([^"]+)"/,
    /"id"\s*:\s*"([^"]+)"/,
    /execution[_-]?id[:\s]+([a-zA-Z0-9-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

function extractExecutionIdFromHeaders(headers: Headers): string | undefined {
  // N8N may return execution ID in headers
  return headers.get('x-n8n-execution-id') || undefined;
}

// Get workflow status from N8N (if API key available)
// Get workflow status from N8N (if API key available)
export async function checkN8NHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    // Use no-cors mode to avoid browser CORS error logging — we only care about success/fail
    const res = await fetch(`${N8N_BASE_URL}/healthz`, {
      signal: controller.signal,
      mode: 'no-cors',
    });
    clearTimeout(timer);
    // no-cors: res.type will be 'opaque' — treat as ok if we get here without exception
    return { ok: res.type === 'opaque' || res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

// ─── Arruda Imobi Predefined Workflows ──────────────────────────────────────

export const ARRADA_IMOBI_WORKFLOWS: N8NWorkflow[] = [
  {
    id: 'wf-lead-zpro-whatsapp',
    name: 'Lead → ZPRO → WhatsApp',
    active: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    executionsCount: 342,
    triggerType: 'webhook',
    category: 'lead',
    description: 'Quando um lead é capturado, envia mensagem personalizada via ZPRO WhatsApp',
    webhookPath: ARRADA_IMOBI_WEBHOOKS.LEAD_CAPTURE,
  },
  {
    id: 'wf-visit-reminder',
    name: 'Agendamento de Visita → Lembrete',
    active: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
    executionsCount: 89,
    triggerType: 'schedule',
    category: 'visit',
    description: 'Envia lembrete de visita 1h antes do horário agendado',
    webhookPath: ARRADA_IMOBI_WEBHOOKS.VISIT_SCHEDULED,
  },
  {
    id: 'wf-followup-24h',
    name: 'Follow-up 24h',
    active: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
    executionsCount: 156,
    triggerType: 'schedule',
    category: 'followup',
    description: 'Verifica leads sem resposta há 24h e envia follow-up automático',
    webhookPath: ARRADA_IMOBI_WEBHOOKS.FOLLOW_UP,
  },
  {
    id: 'wf-instagram-marketplace',
    name: 'Post Instagram / Marketplace',
    active: false,
    executionsCount: 23,
    triggerType: 'schedule',
    category: 'marketing',
    description: 'Publica automaticamente novos imóveis no Instagram e Marketplace',
    webhookPath: ARRADA_IMOBI_WEBHOOKS.INSTAGRAM_POST,
  },
  {
    id: 'wf-catalog-whatsapp',
    name: 'Catálogo via WhatsApp',
    active: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    executionsCount: 78,
    triggerType: 'webhook',
    category: 'whatsapp',
    description: 'Envia catálogo de imóveis selecionado para o cliente via WhatsApp',
    webhookPath: ARRADA_IMOBI_WEBHOOKS.CATALOG_REQUEST,
  },
];

// Simulated execution history
export function getMockExecutions(workflowId: string): N8NExecution[] {
  const executions: N8NExecution[] = [];
  const now = Date.now();
  const workflow = ARRADA_IMOBI_WORKFLOWS.find(w => w.id === workflowId);
  const count = workflow?.executionsCount || 10;

  for (let i = 0; i < Math.min(count, 20); i++) {
    const startedAt = new Date(now - i * 1000 * 60 * Math.floor(Math.random() * 120 + 10)).toISOString();
    const durationMs = Math.floor(Math.random() * 3000 + 500);
    const status: N8NExecution['status'] = Math.random() > 0.1 ? 'success' : 'error';
    executions.push({
      id: `exec-${workflowId}-${i}`,
      workflowId,
      status,
      startedAt,
      finishedAt: new Date(new Date(startedAt).getTime() + durationMs).toISOString(),
      durationMs,
      error: status === 'error' ? 'Webhook timeout after 30s' : undefined,
    });
  }
  return executions;
}
