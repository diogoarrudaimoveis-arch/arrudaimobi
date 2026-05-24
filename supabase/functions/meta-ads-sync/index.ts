// Edge Function: meta-ads-sync
// Block 7d: Supabase Schema — Edge Functions for API
// Syncs Meta Ads performance data to campaigns_meta table

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const TIMEOUT_MS = 15000;

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
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

function getTenantId(): string {
  return Deno.env.get("ARRUDA_TENANT_ID") || "00000000-0000-0000-0000-000000000000";
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
      throw new Error(err.error?.message || `Meta API error ${res.status}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const token = getMetaToken();
    const accountId = getAccountId();
    const tenantId = getTenantId();

    // Fetch campaigns from Meta API
    const campaignsData = await metaFetch<any>(
      `/act_${accountId.replace("act_", "")}/campaigns?fields=id,name,objective,status,start_time,stop_time,daily_budget,lifetime_budget,bid_strategy&limit=100`,
      token
    );

    const campaigns = campaignsData.data || [];
    if (campaigns.length === 0) {
      return new Response(JSON.stringify({ success: true, synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch adset-level stats
    const campaignIds = campaigns.map((c: any) => c.id).join(",");
    const insightsData = await metaFetch<any>(
      `/act_${accountId.replace("act_", "")}/campaigns?fields=id&ids=[${campaignIds}]&action_attribution=datas1&action_reports=datas1&level=campaign&time_increment=1&limit=10`,
      token
    );

    const insightsMap: Record<string, any> = {};
    if (insightsData.data) {
      for (const item of insightsData.data) {
        insightsMap[item.id] = item;
      }
    }

    // Upsert each campaign
    let synced = 0;
    for (const campaign of campaigns) {
      const insights = insightsMap[campaign.id] || {};
      const { error } = await supabase
        .from("campaigns_meta")
        .upsert({
          tenant_id: tenantId,
          meta_campaign_id: campaign.id,
          meta_ad_account_id: accountId,
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status === "ACTIVE" ? "active" : campaign.status === "PAUSED" ? "paused" : "archived",
          daily_budget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
          bid_strategy: campaign.bid_strategy || null,
          start_date: campaign.start_time ? new Date(campaign.start_time * 1000).toISOString().split("T")[0] : null,
          end_date: campaign.stop_time ? new Date(campaign.stop_time * 1000).toISOString().split("T")[0] : null,
          impressions: insights.impressions ? Number(insights.impressions) : 0,
          clicks: insights.clicks ? Number(insights.clicks) : 0,
          conversions: insights.actions?.find((a: any) => a.action_type === "lead_generation")?.value || 0,
          spend: insights.spend ? Number(insights.spend) : 0,
          reach: insights.reach ? Number(insights.reach) : 0,
          frequency: insights.frequency ? Number(insights.frequency) : 0,
          ctr: insights.ctr ? Number(insights.ctr) : 0,
          cpc: insights.cpc ? Number(insights.cpc) : 0,
          cpm: insights.cpm ? Number(insights.cpm) : 0,
          roas: insights.roas ? Number(insights.roas) : 0,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: "meta_campaign_id",
        });

      if (!error) synced++;
    }

    return new Response(JSON.stringify({ success: true, synced, total: campaigns.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-ads-sync error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});