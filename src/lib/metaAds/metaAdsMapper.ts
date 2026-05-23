// Meta Ads Response Mapper — READ-ONLY
// Converte respostas brutas da Meta API para nossos tipos internos

import type {
  MetaAdAccount,
  MetaCampaign,
  MetaInsight,
  MetaCampaignWithInsights,
  MetaAction,
} from './metaAdsTypes';

// Mapeia status de conta
export function mapAccountStatus(status: number | null): string {
  if (status === 1) return 'ACTIVE';
  if (status === 2) return 'DISABLED';
  if (status === 3) return 'UNSETTLED';
  if (status === 5) return 'PENDING_RISK_REVIEW';
  if (status === 6) return 'PENDING_SETTLEMENT';
  if (status === 7) return 'IN_GRACE_PERIOD';
  if (status === 8) return 'CLOSED';
  if (status === 9) return 'ANY_ACTIVE';
  if (status === 10) return 'ANY_CLOSED';
  return 'UNKNOWN';
}

// Mapeia effective_status da campanha
export function mapCampaignStatus(status: string | null): string {
  const map: Record<string, string> = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    DELETED: 'DELETED',
    ARCHIVED: 'ARCHIVED',
    IN_PROCESS: 'IN_PROCESS',
    WITH_ISSUES: 'WITH_ISSUES',
    DISABLED: 'DISABLED',
    COMPLETED: 'COMPLETED',
    NOT_DELIVERING: 'NOT_DELIVERING',
    CAMPAIGN_PAUSED: 'PAUSED',
  };
  return map[status ?? ''] ?? status ?? 'UNKNOWN';
}

// Mapeia effective_status -> badge UI
export function statusToBadge(
  status: string | null
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PAUSED':
    case 'CAMPAIGN_PAUSED':
      return 'warning';
    case 'DISABLED':
    case 'DELETED':
    case 'ARCHIVED':
    case 'WITH_ISSUES':
      return 'danger';
    default:
      return 'neutral';
  }
}

// Extrai leads dos actions
export function extractLeads(actions: MetaAction[]): number {
  return actions
    .filter(
      (a) =>
        a.actionType === 'lead' ||
        a.actionType === 'lead_form_open' ||
        a.actionType === 'lead_form_submission'
    )
    .reduce((sum, a) => sum + (a.actionValue ?? 0), 0);
}

// Extrai compras dos actions
export function extractPurchases(actions: MetaAction[]): number {
  return actions
    .filter(
      (a) =>
        a.actionType === 'purchase' ||
        a.actionType === 'fb_purchase' ||
        a.actionType === 'conversions'
    )
    .reduce((sum, a) => sum + (a.actionValue ?? 0), 0);
}

// Extrai ROAS (return on ad spend) — Meta retorna como ratio
export function extractRoas(actions: MetaAction[]): number {
  const roasAction = actions.find(
    (a) =>
      a.actionType === 'purchase_roas' ||
      a.actionType === 'fb_purchase_roas'
  );
  return roasAction?.actionValue ?? 0;
}

// Mapeia resposta de account
export function mapAdAccount(raw: Record<string, unknown>): MetaAdAccount {
  return {
    id: String(raw.id ?? ''),
    name: (raw.name as string) ?? null,
    accountStatus: (raw.account_status as number) ?? null,
    currency: (raw.currency as string) ?? null,
    timezoneName: (raw.timezone_name as string) ?? null,
  };
}

// Mapeia item de campanha
export function mapCampaign(raw: Record<string, unknown>): MetaCampaign {
  return {
    id: String(raw.id ?? ''),
    name: (raw.name as string) ?? 'Sem nome',
    status: (raw.status as string) ?? 'UNKNOWN',
    effectiveStatus: (raw.effective_status as string) ?? 'UNKNOWN',
    objective: (raw.objective as string) ?? '',
    dailyBudget: raw.daily_budget
      ? String((Number(raw.daily_budget) / 1000000).toFixed(2))
      : null,
    lifetimeBudget: raw.lifetime_budget
      ? String((Number(raw.lifetime_budget) / 1000000).toFixed(2))
      : null,
    startTime: (raw.start_time as string) ?? null,
    stopTime: (raw.stop_time as string) ?? null,
  };
}

// Mapeia insight
export function mapInsight(
  raw: Record<string, unknown>,
  campaignId: string,
  campaignName: string
): MetaInsight {
  const actions = ((raw.actions as MetaAction[]) ?? []).map((a) => ({
    actionType: a.actionType ?? '',
    actionValue: Number(a.actionValue ?? 0),
  }));

  const spend = Number(raw.spend ?? 0);
  const impressions = Number(raw.impressions ?? 0);
  const clicks = Number(raw.clicks ?? 0);
  const purchases = extractPurchases(actions);

  return {
    campaignId,
    campaignName,
    spend: Number(spend.toFixed(2)),
    impressions: Number(impressions),
    clicks: Number(clicks),
    cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    reach: Number(raw.reach ?? 0),
    actions,
    purchases,
    leads: extractLeads(actions),
    costPerPurchase: purchases > 0 ? Number((spend / purchases).toFixed(2)) : 0,
    costPerLead: extractLeads(actions) > 0
      ? Number((spend / extractLeads(actions)).toFixed(2))
      : 0,
    roas: extractRoas(actions),
  };
}

// Combina campanha + insight
export function mapCampaignWithInsights(
  campaign: MetaCampaign,
  insightRaw: Record<string, unknown> | null
): MetaCampaignWithInsights {
  return {
    ...campaign,
    insights: insightRaw
      ? mapInsight(insightRaw, campaign.id, campaign.name)
      : null,
  };
}

// Ordena campanhas: TOP = maior ROAS ou maior spend se sem ROAS
export function sortTopCampaigns(
  campaigns: MetaCampaignWithInsights[]
): MetaCampaignWithInsights[] {
  return [...campaigns]
    .filter((c) => c.insights && c.insights.spend > 0)
    .sort((a, b) => {
      const roasA = a.insights?.roas ?? 0;
      const roasB = b.insights?.roas ?? 0;
      const spendA = a.insights?.spend ?? 0;
      const spendB = b.insights?.spend ?? 0;
      // Prioriza ROAS; se ROAS=0, usa spend como proxy
      if (roasB !== roasA) return roasB - roasA;
      return spendB - spendA;
    })
    .slice(0, 5);
}

export function sortWorstCampaigns(
  campaigns: MetaCampaignWithInsights[]
): MetaCampaignWithInsights[] {
  return [...campaigns]
    .filter((c) => c.insights && c.insights.spend > 0)
    .sort((a, b) => {
      const roasA = a.insights?.roas ?? 0;
      const roasB = b.insights?.roas ?? 0;
      // Piores = menor ROAS ou ROAS negativo (gastou sem conversão)
      if (roasB !== roasA) return roasA - roasB;
      return (a.insights?.spend ?? 0) - (b.insights?.spend ?? 0);
    })
    .slice(0, 5);
}

export function filterNoDelivery(
  campaigns: MetaCampaignWithInsights[]
): MetaCampaignWithInsights[] {
  return campaigns.filter(
    (c) =>
      c.effectiveStatus === 'NOT_DELIVERING' ||
      c.effectiveStatus === 'DISABLED' ||
      c.effectiveStatus === 'WITH_ISSUES' ||
      (c.insights && c.insights.spend > 0 && c.insights.clicks === 0)
  );
}

export function filterPaused(
  campaigns: MetaCampaignWithInsights[]
): MetaCampaignWithInsights[] {
  return campaigns.filter(
    (c) =>
      c.effectiveStatus === 'PAUSED' ||
      c.effectiveStatus === 'CAMPAIGN_PAUSED'
  );
}

export function filterWithErrors(
  campaigns: MetaCampaignWithInsights[]
): MetaCampaignWithInsights[] {
  return campaigns.filter(
    (c) =>
      c.effectiveStatus === 'WITH_ISSUES' ||
      c.effectiveStatus === 'DISABLED'
  );
}
