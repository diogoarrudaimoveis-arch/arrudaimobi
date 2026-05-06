// Meta Ads READ-ONLY Edge Function
// Server-side proxy — token never exposed to frontend
// Called by: /admin/meta-ads (frontend)

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
const TIMEOUT_MS = 10000;

function getCorsHeaders(origin: string | null) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
}

function getMetaToken(): string {
  const token = Deno.env.get("META_SYSTEM_USER_TOKEN");
  if (!token || token.length < 10) throw new Error("META_SYSTEM_USER_TOKEN não configurado no Supabase");
  return token;
}

function getAccountId(): string {
  const id = Deno.env.get("META_AD_ACCOUNT_ID");
  if (!id) throw new Error("META_AD_ACCOUNT_ID não configurado");
  return id.startsWith("act_") ? id : `act_${id}`;
}

async function metaFetch<T>(path: string, token: string): Promise<T> {
  const url = `${META_BASE}${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function mapCampaignStatus(s: string | null): string {
  const m: Record<string, string> = {
    ACTIVE: "ACTIVE", PAUSED: "PAUSED", DELETED: "DELETED",
    ARCHIVED: "ARCHIVED", IN_PROCESS: "IN_PROCESS",
    WITH_ISSUES: "WITH_ISSUES", DISABLED: "DISABLED",
    COMPLETED: "COMPLETED", NOT_DELIVERING: "NOT_DELIVERING",
  };
  return m[s ?? ""] ?? s ?? "UNKNOWN";
}

function extractActions(actions: Array<{ action_type: string; action_value: string }>, type: string): number {
  return actions
    .filter(a => a.action_type.includes(type))
    .reduce((sum, a) => sum + (parseFloat(a.action_value) || 0), 0);
}

function mapCampaign(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(raw.id ?? ""),
    name: raw.name ?? "Sem nome",
    status: raw.status ?? "UNKNOWN",
    effectiveStatus: mapCampaignStatus(raw.effective_status as string),
    objective: raw.objective ?? "",
    dailyBudget: raw.daily_budget
      ? (Number(raw.daily_budget) / 1_000_000).toFixed(2)
      : null,
    startTime: raw.start_time ?? null,
    stopTime: raw.stop_time ?? null,
  };
}

function mapInsight(raw: Record<string, unknown>, campaignId: string, campaignName: string): Record<string, unknown> {
  const actions: Array<{ action_type: string; action_value: string }> =
    (raw.actions as Array<{ action_type: string; action_value: string }>) ?? [];
  const spend = parseFloat(raw.spend as string) || 0;
  const impressions = parseInt(raw.impressions as string) || 0;
  const clicks = parseInt(raw.clicks as string) || 0;
  const purchases = extractActions(actions, "purchase");
  const leads = extractActions(actions, "lead");
  const roasActions = actions.filter(a => a.action_type.includes("purchase_roas"));
  const roas = roasActions.length > 0 ? parseFloat(roasActions[0].action_value) || 0 : 0;

  return {
    campaignId,
    campaignName,
    spend: parseFloat(spend.toFixed(2)),
    impressions,
    clicks,
    cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
    cpm: impressions > 0 ? parseFloat(((spend / impressions) * 1000).toFixed(2)) : 0,
    ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
    reach: parseInt(raw.reach as string) || 0,
    purchases,
    leads,
    costPerPurchase: purchases > 0 ? parseFloat((spend / purchases).toFixed(2)) : 0,
    costPerLead: leads > 0 ? parseFloat((spend / leads).toFixed(2)) : 0,
    roas,
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const token = getMetaToken();
    const accountId = getAccountId();

    // ── Health check ──
    if (req.method === "GET" && new URL(req.url).pathname === "/meta-ads-readonly/health") {
      const [meData, debugData] = await Promise.all([
        metaFetch<{ id: string; name: string }>(`/me`, token).catch(() => null),
        metaFetch<{ data: { is_valid: boolean; scopes: string[]; expires_at: number } }>(`/debug_token?input_token=${token}`, token).catch(() => null),
      ]);

      const scopes = debugData?.data?.scopes ?? [];
      const hasAdsRead = scopes.includes("ads_read");
      const hasAdsManage = scopes.includes("ads_management");

      let accountStatus: number | null = null;
      let accountName: string | null = null;
      if (accountId) {
        try {
          const acc = await metaFetch<{ name: string; account_status: number }>(`/${accountId}?fields=name,account_status`, token);
          accountName = acc.name;
          accountStatus = acc.account_status;
        } catch { /* non-fatal */ }
      }

      return new Response(JSON.stringify({
        status: hasAdsRead ? "CONNECTED" : "NO_PERMISSION",
        accountId,
        accountName: accountName ?? meData?.name ?? null,
        accountStatus,
        canReadAds: hasAdsRead,
        canManageAds: hasAdsManage,
        scopes,
        tokenExpiresAt: debugData?.data?.expires_at
          ? new Date(debugData.data.expires_at * 1000).toISOString()
          : null,
        apiVersion: META_API_VERSION,
        checkedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Overview (default) ──
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch account + campaigns in parallel
    const [accountData, campaignsData] = await Promise.all([
      metaFetch<Record<string, unknown>>(
        `/${accountId}?fields=name,account_status,currency,timezone_name`,
        token
      ).catch(() => null),
      metaFetch<{ data: Record<string, unknown>[] }>(
        `/${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,start_time,stop_time&limit=50`,
        token
      ).catch(() => ({ data: [] })),
    ]);

    const campaigns = (campaignsData?.data ?? []).map(mapCampaign);

    // Fetch insights per campaign (parallel, non-blocking)
    const insightsResults = await Promise.allSettled(
      campaigns.map((c: Record<string, unknown>) =>
        metaFetch<Record<string, unknown>>(
          `/${c.id}/insights?fields=spend,impressions,clicks,cpc,cpm,ctr,reach,actions&date_preset=last_7d&limit=1`,
          token
        )
      )
    );

    const campaignsWithInsights = campaigns.map((c: Record<string, unknown>, i: number) => {
      const result = insightsResults[i];
      const insightRaw = result.status === "fulfilled" ? result.value : null;
      return {
        ...c,
        insights: insightRaw ? mapInsight(insightRaw, c.id as string, c.name as string) : null,
      };
    });

    // Aggregates
    const withInsights = campaignsWithInsights.filter((c: Record<string, unknown>) => c.insights);
    const totalSpend = withInsights.reduce((s: number, c: Record<string, unknown>) => s + ((c.insights as Record<string, number>)?.spend ?? 0), 0);
    const totalImpressions = withInsights.reduce((s: number, c: Record<string, unknown>) => s + ((c.insights as Record<string, number>)?.impressions ?? 0), 0);
    const totalClicks = withInsights.reduce((s: number, c: Record<string, unknown>) => s + ((c.insights as Record<string, number>)?.clicks ?? 0), 0);
    const totalPurchases = withInsights.reduce((s: number, c: Record<string, unknown>) => s + ((c.insights as Record<string, number>)?.purchases ?? 0), 0);
    const totalLeads = withInsights.reduce((s: number, c: Record<string, unknown>) => s + ((c.insights as Record<string, number>)?.leads ?? 0), 0);

    // Sort top/worst
    const sorted = [...withInsights].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const roasA = ((a.insights as Record<string, number>)?.roas ?? 0);
      const roasB = ((b.insights as Record<string, number>)?.roas ?? 0);
      if (roasB !== roasA) return roasB - roasA;
      return ((b.insights as Record<string, number>)?.spend ?? 0) - ((a.insights as Record<string, number>)?.spend ?? 0);
    });

    const overview = {
      health: {
        status: "CONNECTED",
        accountId,
        accountName: (accountData as Record<string, unknown>)?.name as string ?? null,
        accountStatus: (accountData as Record<string, unknown>)?.account_status as number ?? null,
        canReadAds: true,
        canManageAds: false,
        tokenExpiresAt: null,
        apiVersion: META_API_VERSION,
        checkedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: null,
      },
      account: accountData ? {
        id: accountId,
        name: (accountData as Record<string, unknown>)?.name as string ?? null,
        accountStatus: (accountData as Record<string, unknown>)?.account_status as number ?? null,
        currency: (accountData as Record<string, unknown>)?.currency as string ?? null,
        timezoneName: (accountData as Record<string, unknown>)?.timezone_name as string ?? null,
      } : null,
      campaigns: campaignsWithInsights,
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      totalImpressions,
      totalClicks,
      avgCpc: totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
      avgCpm: totalImpressions > 0 ? parseFloat(((totalSpend / totalImpressions) * 1000).toFixed(2)) : 0,
      avgCtr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      totalPurchases,
      totalLeads,
      avgRoas: 0,
      topCampaigns: sorted.slice(0, 5),
      worstCampaigns: sorted.slice(-5).reverse(),
      noDeliveryCampaigns: campaignsWithInsights.filter((c: Record<string, unknown>) =>
        c.effectiveStatus === "NOT_DELIVERING" || c.effectiveStatus === "DISABLED" ||
        (c.insights && ((c.insights as Record<string, number>).spend ?? 0) > 0 && ((c.insights as Record<string, number>).clicks ?? 0) === 0)
      ),
      pausedCampaigns: campaignsWithInsights.filter((c: Record<string, unknown>) =>
        c.effectiveStatus === "PAUSED" || c.effectiveStatus === "CAMPAIGN_PAUSED"
      ),
      errorCampaigns: campaignsWithInsights.filter((c: Record<string, unknown>) =>
        c.effectiveStatus === "WITH_ISSUES" || c.effectiveStatus === "DISABLED"
      ),
      fetchedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(overview), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("meta-ads-readonly error:", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({
      error: message,
      health: { status: "API_ERROR", checkedAt: new Date().toISOString() },
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
