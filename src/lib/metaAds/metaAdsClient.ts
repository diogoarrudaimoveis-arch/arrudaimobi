// Meta Ads Client — READ-ONLY
// Chama Supabase Edge Function (server-side) — token NUNCA sai do browser
// O Edge Function faz as chamadas à Meta API com META_SYSTEM_USER_TOKEN em servidor

import type {
  MetaAdsBudgetDraftResponse,
  MetaAdsOverview,
  MetaCampaignCreateDraft,
  MetaCampaignCreateResponse,
  MetaCampaign,
} from './metaAdsTypes';

const TIMEOUT_MS = 12000;

function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) throw new Error("VITE_SUPABASE_URL não definido");
  return url;
}

function getSupabaseKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!key) throw new Error("VITE_SUPABASE_ANON_KEY não definido");
  return key;
}

async function edgeFetch<T>(path: string): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();
  const url = `${supabaseUrl}/functions/v1/${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err?.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function edgePost<T>(path: string, body: unknown): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();
  const url = `${supabaseUrl}/functions/v1/${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify(body),
    });

    clearTimeout(timeout);

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error ?? `HTTP ${res.status}`);
    }
    return payload as T;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// Overview completo via Edge Function
export async function getMetaAdsOverview(): Promise<MetaAdsOverview> {
  return edgeFetch<MetaAdsOverview>('meta-ads-readonly');
}

export async function draftMetaCampaignDailyBudget(params: {
  campaignId: string;
  campaignName?: string;
  currentDailyBudget?: string | null;
  newDailyBudget: number;
}): Promise<MetaAdsBudgetDraftResponse> {
  return edgePost<MetaAdsBudgetDraftResponse>('meta-ads-write', {
    action: 'draft-budget-update',
    ...params,
  });
}

export async function applyMetaCampaignDailyBudget(params: {
  campaignId: string;
  campaignName?: string;
  currentDailyBudget?: string | null;
  newDailyBudget: number;
  approvalId: string;
}): Promise<MetaAdsBudgetDraftResponse> {
  return edgePost<MetaAdsBudgetDraftResponse>('meta-ads-write', {
    action: 'apply-budget-update',
    ...params,
  });
}

// Campaign creation (draft mode always available; applied only when META_ADS_WRITE_ENABLED=true)
export async function createMetaCampaign(params: MetaCampaignCreateDraft): Promise<MetaCampaignCreateResponse> {
  return edgePost<MetaCampaignCreateResponse>('meta-ads-write', {
    action: 'create-campaign',
    ...params,
  });
}

// Setup checklist — agora verifica apenas config do Supabase (token está no Edge)
export function getMetaSetupChecklist(): Array<{ id: string; label: string; done: boolean; critical: boolean }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  return [
    {
      id: 'supabase_url',
      label: 'VITE_SUPABASE_URL configurado',
      done: Boolean(supabaseUrl && supabaseUrl.length > 10),
      critical: true,
    },
    {
      id: 'supabase_key',
      label: 'VITE_SUPABASE_ANON_KEY configurado',
      done: Boolean(supabaseKey && supabaseKey.length > 10),
      critical: true,
    },
    {
      id: 'edge_function',
      label: 'Edge Function meta-ads-readonly implantada no Supabase',
      done: false, // não dá para detectar do browser — assume deploy manual
      critical: true,
    },
    {
      id: 'meta_token_supabase',
      label: 'META_SYSTEM_USER_TOKEN configurado como secret no Supabase',
      done: false, // não dá para detectar do browser
      critical: true,
    },
  ];
}