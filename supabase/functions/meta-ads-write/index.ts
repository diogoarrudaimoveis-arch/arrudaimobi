// Meta Ads WRITE Edge Function — guarded by draft/approval flow.
// Never expose META_SYSTEM_USER_TOKEN to frontend.

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "https://arrudaimobi-9twwru1pa-diogoarrudaimoveis-archs-projects.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];
const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const MIN_DAILY_BUDGET_CENTS = 500; // R$ 5,00
const MAX_DAILY_BUDGET_CENTS = 1000000; // R$ 10.000,00
const MIN_CAMPAIGN_NAME = 3;
const MAX_CAMPAIGN_NAME = 128;

type DraftRequest = {
  action: "draft-budget-update" | "apply-budget-update" | "create-campaign";
  campaignId?: string;
  campaignName?: string;
  currentDailyBudget?: string | null;
  newDailyBudget?: number;
  approvalId?: string;
  // create-campaign fields
  name?: string;
  objective?: string;
  dailyBudget?: number;
  status?: string;
};

function cors(origin: string | null) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
}

function token() {
  const value = Deno.env.get("META_SYSTEM_USER_TOKEN") ?? Deno.env.get("META_ACCESS_TOKEN");
  if (!value || value.length < 20) throw new Error("META token não configurado");
  return value;
}
function accountId() {
  const id = Deno.env.get("META_AD_ACCOUNT_ID");
  if (!id) throw new Error("META_AD_ACCOUNT_ID não configurado");
  return id.startsWith("act_") ? id : `act_${id}`;
}
async function metaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${META_BASE}${path}${sep}access_token=${token()}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
async function canManageAds(): Promise<boolean> {
  const debug = await metaFetch<{ data?: { scopes?: string[] } }>(`/debug_token?input_token=${token()}`);
  return Boolean(debug.data?.scopes?.includes("ads_management"));
}
function toCents(value: number) {
  return Math.round(value * 100);
}
function validateBudget(value: number) {
  if (!Number.isFinite(value)) return "Orçamento inválido";
  const cents = toCents(value);
  if (cents < MIN_DAILY_BUDGET_CENTS) return "Orçamento mínimo é R$ 5,00";
  if (cents > MAX_DAILY_BUDGET_CENTS) return "Orçamento máximo é R$ 10.000,00";
  return null;
}
function approvalHash(input: DraftRequest) {
  const normalized = `${input.campaignId ?? ""}:${input.currentDailyBudget ?? ""}:${input.newDailyBudget ?? ""}`;
  return btoa(normalized).replace(/=+$/g, "").slice(0, 18);
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json() as DraftRequest;

    // ── CREATE CAMPAIGN ────────────────────────────────────────────────────────
    if (body.action === "create-campaign") {
      const name = (body.name ?? "").trim();
      const objective = body.objective ?? "OUTCOME_LEADS";
      const dailyBudget = body.dailyBudget ?? 0;
      const status = body.status ?? "PAUSED";

      if (name.length < MIN_CAMPAIGN_NAME) {
        return new Response(JSON.stringify({ ok: false, error: `Nome deve ter pelo menos ${MIN_CAMPAIGN_NAME} caracteres` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (name.length > MAX_CAMPAIGN_NAME) {
        return new Response(JSON.stringify({ ok: false, error: `Nome deve ter no máximo ${MAX_CAMPAIGN_NAME} caracteres` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const budgetError = validateBudget(dailyBudget);
      if (budgetError) return new Response(JSON.stringify({ ok: false, error: budgetError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const manage = await canManageAds();

      // Draft mode: just return what would be created
      if (!manage || Deno.env.get("META_ADS_WRITE_ENABLED") !== "true") {
        const draft = {
          approvalId: approvalHash({ action: "create-campaign", name, objective, dailyBudget }),
          name,
          objective,
          dailyBudget,
          dailyBudgetCents: toCents(dailyBudget),
          status,
          canManageAds: manage,
          risk: "Criação de campanha é uma ação irreversível. Requer aprovação explícita do Diogo.",
        };
        return new Response(JSON.stringify({ ok: true, mode: "draft", draft }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Real creation
      const createPayload: Record<string, unknown> = {
        name,
        objective,
        daily_budget: toCents(dailyBudget),
        status: status.toUpperCase(),
      };

      const created = await metaFetch<{ id: string; name: string; status: string; effective_status: string }>(
        `/${accountId()}/campaigns`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createPayload) }
      );

      // Fetch full campaign data
      const refreshed = await metaFetch<Record<string, unknown>>(
        `/${created.id}?fields=id,name,status,effective_status,objective,daily_budget,start_time,stop_time`,
        { method: "GET" }
      );

      return new Response(JSON.stringify({
        ok: true,
        mode: "applied",
        campaign: {
          id: created.id,
          name: created.name ?? name,
          status: created.status ?? status,
          effectiveStatus: created.effective_status ?? status.toLowerCase(),
          objective,
          dailyBudget: String(dailyBudget),
          dailyBudgetCents: toCents(dailyBudget),
        },
        raw: refreshed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── BUDGET UPDATE ──────────────────────────────────────────────────────────
    if (!body.campaignId || !body.newDailyBudget) {
      return new Response(JSON.stringify({ error: "campaignId e newDailyBudget são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const budgetError = validateBudget(body.newDailyBudget);
    if (budgetError) return new Response(JSON.stringify({ error: budgetError }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const manage = await canManageAds();
    const current = await metaFetch<Record<string, unknown>>(`/${body.campaignId}?fields=id,name,status,effective_status,daily_budget`);
    const draft = {
      approvalId: approvalHash({ ...body, currentDailyBudget: String(current.daily_budget ?? body.currentDailyBudget ?? "") }),
      campaignId: String(current.id ?? body.campaignId),
      campaignName: String(current.name ?? body.campaignName ?? "Campanha"),
      status: current.status,
      effectiveStatus: current.effective_status,
      currentDailyBudgetCents: current.daily_budget ?? null,
      currentDailyBudget: current.daily_budget ? Number(current.daily_budget) / 100 : null,
      newDailyBudget: body.newDailyBudget,
      newDailyBudgetCents: toCents(body.newDailyBudget),
      canManageAds: manage,
      risk: "Alteração de orçamento afeta gasto real. Requer aprovação explícita do Diogo.",
    };

    if (body.action === "draft-budget-update") {
      return new Response(JSON.stringify({ ok: true, mode: "draft", draft }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extra guard: real execution requires both write permission and explicit server env enablement.
    if (Deno.env.get("META_ADS_WRITE_ENABLED") !== "true") {
      return new Response(JSON.stringify({ ok: false, mode: "blocked", error: "META_ADS_WRITE_ENABLED não habilitado no servidor", draft }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!manage) {
      return new Response(JSON.stringify({ ok: false, error: "Token sem ads_management", draft }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!body.approvalId || body.approvalId !== draft.approvalId) {
      return new Response(JSON.stringify({ ok: false, error: "approvalId inválido ou ausente", draft }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await metaFetch<Record<string, unknown>>(`/${body.campaignId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_budget: draft.newDailyBudgetCents }),
    });
    const after = await metaFetch<Record<string, unknown>>(`/${body.campaignId}?fields=id,name,status,effective_status,daily_budget`);
    return new Response(JSON.stringify({ ok: true, mode: "applied", draft, result, after }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});