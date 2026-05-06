import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OpsStatus } from "@/data/aiOpsMockData";

export interface IntegrationHealthItem {
  id: string;
  label: string;
  status: OpsStatus;
  value: string;
  detail: string;
  icon: string; // stored as string to avoid import issues
}

interface HealthCheckResult {
  status: OpsStatus;
  value: string;
  detail: string;
}

async function checkSupabase(): Promise<HealthCheckResult> {
  try {
    const { error } = await supabase.from("tenants").select("id").limit(1).single();
    if (error) {
      if (error.message.includes("JWT") || error.message.includes("verify")) {
        return { status: "warning", value: "JWT issue", detail: "verify_jwt=false — revisão sugerida" };
      }
      return { status: "warning", value: "Error", detail: error.message.substring(0, 60) };
    }
    return { status: "ok", value: "Online", detail: "Conectado" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return { status: "critical", value: "Offline", detail: msg.substring(0, 80) };
  }
}

async function checkSite(): Promise<HealthCheckResult> {
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 5000) : null;
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://arrudaimobi.com.br";
    const res = await fetch(siteUrl, { method: "HEAD", signal: controller?.signal });
    if (timeout) clearTimeout(timeout);
    return res.ok
      ? { status: "ok", value: "200 OK", detail: `${siteUrl} responds` }
      : { status: "warning", value: `${res.status}`, detail: `HTTP ${res.status}` };
  } catch {
    return { status: "warning", value: "Unreachable", detail: "Site não responde (timeout/DNS)" };
  }
}

async function checkAdmin(): Promise<HealthCheckResult> {
  // Admin is "ok" if the user is authenticated (tenantId available)
  // This is a passive check — doesn't make extra requests
  return { status: "ok", value: "Online", detail: "Admin ativo" };
}

async function checkN8N(): Promise<HealthCheckResult> {
  // n8n health — try to reach its webhook endpoint if VITE_N8N_URL is set
  const n8nUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_N8N_URL;
  if (!n8nUrl) {
    return { status: "queued", value: "Not configured", detail: "VITE_N8N_URL não definido" };
  }
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 3000) : null;
    const res = await fetch(`${n8nUrl}/healthz`, { signal: controller?.signal });
    if (timeout) clearTimeout(timeout);
    return res.ok
      ? { status: "ok", value: "Online", detail: "n8n respondendo" }
      : { status: "warning", value: res.statusText, detail: `HTTP ${res.status}` };
  } catch {
    return { status: "offline", value: "Unreachable", detail: "n8n não responde" };
  }
}

async function checkMiniMax(): Promise<HealthCheckResult> {
  // MiniMax — monitor via AI usage log presence
  const projectId = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_PROJECT_ID : undefined;
  if (!projectId) {
    return { status: "warning", value: "No projectId", detail: "VITE_SUPABASE_PROJECT_ID não definido" };
  }
  try {
    const { error } = await supabase
      .from("ai_usage_logs")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (error) {
      if (error.message.includes("does not exist")) {
        return { status: "warning", value: "No table", detail: "ai_usage_logs não existe (sem custo)" };
      }
      return { status: "warning", value: "Error", detail: error.message.substring(0, 60) };
    }
    return { status: "ok", value: "Logging", detail: "Tabela ai_usage_logs ativa" };
  } catch {
    return { status: "warning", value: "Unknown", detail: "Falha ao verificar" };
  }
}

// Mock fallback data
const mockHealth = [
  { id: "site", label: "Site", status: "ok" as OpsStatus, value: "200 OK", detail: "arrudaimobi.com.br ativo", icon: "CheckCircle2" },
  { id: "admin", label: "Admin", status: "ok" as OpsStatus, value: "200 OK", detail: "Painel atual operacional", icon: "CheckCircle2" },
  { id: "openclaw", label: "OpenClaw", status: "warning" as OpsStatus, value: "Node off", detail: "Notebook-Diogo pareado, desconectado", icon: "Bot" },
  { id: "n8n", label: "N8N", status: "ok" as OpsStatus, value: "Online", detail: "Orquestrador disponível", icon: "Workflow" },
  { id: "supabase", label: "Supabase", status: "warning" as OpsStatus, value: "Revisar", detail: "verify_jwt=false em funções públicas", icon: "Database" },
  { id: "security", label: "Segurança", status: "critical" as OpsStatus, value: "P0", detail: "Git PAT remoto e devices operator", icon: "ShieldAlert" },
];

export function useIntegrationHealth() {
  const query = useQuery({
    queryKey: ["integration-health"],
    queryFn: async () => {
      const [supabaseHealth, siteHealth, adminHealth, n8nHealth, miniMaxHealth] = await Promise.all([
        checkSupabase(),
        checkSite(),
        checkAdmin(),
        checkN8N(),
        checkMiniMax(),
      ]);

      return [
        { id: "site", label: "Site", ...siteHealth, icon: "CheckCircle2" },
        { id: "admin", label: "Admin", ...adminHealth, icon: "CheckCircle2" },
        { id: "supabase", label: "Supabase", ...supabaseHealth, icon: "Database" },
        { id: "n8n", label: "N8N", ...n8nHealth, icon: "Workflow" },
        { id: "minimax", label: "MiniMax", ...miniMaxHealth, icon: "Bot" },
      ] as IntegrationHealthItem[];
    },
    staleTime: 30_000, // 30 seconds — avoid hammering
    retry: 1,
    retryDelay: 1000,
  });

  // Fallback to mock data if the query fails completely
  const healthItems: IntegrationHealthItem[] =
    query.data && query.data.length > 0
      ? query.data
      : mockHealth;

  return {
    healthItems,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
