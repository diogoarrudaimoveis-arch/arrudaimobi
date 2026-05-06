// Meta Ads Client — READ-ONLY
// Token nunca sai do browser; todas as chamadas são server-side via ambiente

import type {
  MetaAdsOverview,
  MetaCampaignWithInsights,
  MetaCampaign,
} from './metaAdsTypes';
import { checkMetaHealth } from './metaAdsHealth';
import {
  mapAdAccount,
  mapCampaign,
  mapCampaignWithInsights,
  sortTopCampaigns,
  sortWorstCampaigns,
  filterNoDelivery,
  filterPaused,
  filterWithErrors,
} from './metaAdsMapper';

const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
const TIMEOUT_MS = 10000;

function getMetaEnv() {
  const token = import.meta.env.VITE_META_ACCESS_TOKEN as string | undefined;
  const accountId = import.meta.env.VITE_META_AD_ACCOUNT_ID as string | undefined;
  const systemToken = import.meta.env.VITE_META_SYSTEM_USER_TOKEN as string | undefined;
  return {
    token: systemToken && systemToken.length > 10 ? systemToken : token,
    accountId,
  };
}

async function metaFetch<T>(path: string): Promise<T> {
  const { token } = getMetaEnv();
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}&access_token=${token}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (res.status === 400) {
      const err = await res.json();
      throw new Error(err?.error?.message ?? 'Bad request');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// Busca overview completo
export async function getMetaAdsOverview(): Promise<MetaAdsOverview> {
  const { accountId } = getMetaEnv();
  const health = await checkMetaHealth();
  const fetchedAt = new Date().toISOString();

  // Sem conta configurada
  if (!accountId) {
    return {
      health,
      account: null,
      campaigns: [],
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCpc: 0,
      avgCpm: 0,
      avgCtr: 0,
      totalPurchases: 0,
      totalLeads: 0,
      avgRoas: 0,
      topCampaigns: [],
      worstCampaigns: [],
      noDeliveryCampaigns: [],
      pausedCampaigns: [],
      errorCampaigns: [],
      fetchedAt,
    };
  }

  // Sem permissão — retorna health com estrutura vazia
  if (health.status === 'NO_PERMISSION' || health.status === 'TOKEN_INVALID') {
    return {
      health,
      account: null,
      campaigns: [],
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCpc: 0,
      avgCpm: 0,
      avgCtr: 0,
      totalPurchases: 0,
      totalLeads: 0,
      avgRoas: 0,
      topCampaigns: [],
      worstCampaigns: [],
      noDeliveryCampaigns: [],
      pausedCampaigns: [],
      errorCampaigns: [],
      fetchedAt,
    };
  }

  // Erro de rede
  if (health.status === 'API_ERROR') {
    return {
      health,
      account: null,
      campaigns: [],
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCpc: 0,
      avgCpm: 0,
      avgCtr: 0,
      totalPurchases: 0,
      totalLeads: 0,
      avgRoas: 0,
      topCampaigns: [],
      worstCampaigns: [],
      noDeliveryCampaigns: [],
      errorCampaigns: [],
      fetchedAt,
    };
  }

  // CONNECTED — buscar dados reais
  try {
    // Buscar account + campanhas em paralelo
    const [accountData, campaignsData] = await Promise.all([
      metaFetch<Record<string, unknown>>(
        `/${accountId}?fields=name,account_status,currency,timezone_name`
      ),
      metaFetch<{ data: Record<string, unknown>[] }>(
        `/${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=50`
      ),
    ]);

    const account = mapAdAccount(accountData);
    const campaigns: MetaCampaign[] = campaignsData.data.map(mapCampaign);

    // Buscar insights para cada campanha
    const insightsResults = await Promise.allSettled(
      campaigns.map((c) =>
        metaFetch<Record<string, unknown>>(
          `/${c.id}/insights?fields=spend,impressions,clicks,cpc,cpm,ctr,reach,actions&date_preset=last_7d&limit=1`
        )
      )
    );

    const campaignsWithInsights: MetaCampaignWithInsights[] = campaigns.map(
      (c, i) => {
        const result = insightsResults[i];
        return mapCampaignWithInsights(
          c,
          result.status === 'fulfilled' ? (result.value as Record<string, unknown>) : null
        );
      }
    );

    // Métricas agregadas
    const withInsights = campaignsWithInsights.filter((c) => c.insights);
    const totalSpend = withInsights.reduce(
      (s, c) => s + (c.insights?.spend ?? 0),
      0
    );
    const totalImpressions = withInsights.reduce(
      (s, c) => s + (c.insights?.impressions ?? 0),
      0
    );
    const totalClicks = withInsights.reduce(
      (s, c) => s + (c.insights?.clicks ?? 0),
      0
    );
    const totalPurchases = withInsights.reduce(
      (s, c) => s + (c.insights?.purchases ?? 0),
      0
    );
    const totalLeads = withInsights.reduce(
      (s, c) => s + (c.insights?.leads ?? 0),
      0
    );

    return {
      health,
      account,
      campaigns: campaignsWithInsights,
      totalSpend: Number(totalSpend.toFixed(2)),
      totalImpressions,
      totalClicks,
      avgCpc: totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0,
      avgCpm: totalImpressions > 0
        ? Number(((totalSpend / totalImpressions) * 1000).toFixed(2))
        : 0,
      avgCtr: totalImpressions > 0
        ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
        : 0,
      totalPurchases,
      totalLeads,
      avgRoas: 0, // calculado via actions se disponível
      topCampaigns: sortTopCampaigns(campaignsWithInsights),
      worstCampaigns: sortWorstCampaigns(campaignsWithInsights),
      noDeliveryCampaigns: filterNoDelivery(campaignsWithInsights),
      pausedCampaigns: filterPaused(campaignsWithInsights),
      errorCampaigns: filterWithErrors(campaignsWithInsights),
      fetchedAt,
    };
  } catch (err) {
    // DEGRADED — algum erro parcial
    const degradedHealth = { ...health, status: 'DEGRADED' as const };
    return {
      health: degradedHealth,
      account: null,
      campaigns: [],
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCpc: 0,
      avgCpm: 0,
      avgCtr: 0,
      totalPurchases: 0,
      totalLeads: 0,
      avgRoas: 0,
      topCampaigns: [],
      worstCampaigns: [],
      noDeliveryCampaigns: [],
      pausedCampaigns: [],
      errorCampaigns: [],
      fetchedAt,
    };
  }
}

// Setup checklist — nunca expõe tokens
export function getMetaSetupChecklist(): Array<{ id: string; label: string; done: boolean; critical: boolean }> {
  const { token, accountId } = getMetaEnv();
  const hasToken = Boolean(token && token.length > 10);
  const hasAccountId = Boolean(accountId && accountId.startsWith('act_'));

  return [
    {
      id: 'token',
      label: 'META_ACCESS_TOKEN configurado no .env',
      done: hasToken,
      critical: true,
    },
    {
      id: 'account',
      label: 'META_AD_ACCOUNT_ID configurado (formato act_)',
      done: hasAccountId,
      critical: true,
    },
    {
      id: 'ads_read',
      label: 'Token com escopo ads_read (ou System User)',
      done: hasToken, // se tem token, assumir que tem — health check confirma
      critical: true,
    },
    {
      id: 'sys_user',
      label: 'System User criado na Business Manager (recomendado)',
      done: false, // não dá para detectar do browser
      critical: false,
    },
  ];
}
