// Meta Ads READ-ONLY types — nunca expõe token

export type MetaHealthStatus =
  | 'CONNECTED'      // token válido + permissões OK + API respondendo
  | 'DEGRADED'       // token OK mas API retornou erro parcial
  | 'NO_PERMISSION'  // token existe mas sem ads_read/ads_management
  | 'TOKEN_INVALID'  // token malformado ou expirado
  | 'RATE_LIMIT'     // 429 from Meta API
  | 'API_ERROR'      // erro inesperado
  | 'NOT_CONFIGURED'; // token nem definido

export interface MetaAdAccount {
  id: string;
  name: string | null;
  accountStatus: number | null;
  currency: string | null;
  timezoneName: string | null;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  objective: string;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  startTime: string | null;
  stopTime: string | null;
}

export interface MetaInsight {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  reach: number;
  actions: MetaAction[];
  purchases: number;
  leads: number;
  costPerPurchase: number;
  costPerLead: number;
  roas: number;
}

export interface MetaAction {
  actionType: string;
  actionValue: number;
}

export interface MetaCampaignWithInsights extends MetaCampaign {
  insights: MetaInsight | null;
}

export interface MetaAdsHealth {
  status: MetaHealthStatus;
  accountId: string | null;
  accountName: string | null;
  accountStatus: number | null;
  canReadAds: boolean;
  canManageAds: boolean;
  tokenExpiresAt: string | null;
  apiVersion: string;
  checkedAt: string;
  errorCode: number | null;
  errorMessage: string | null;
}

export interface MetaAdsOverview {
  health: MetaAdsHealth;
  account: MetaAdAccount | null;
  campaigns: MetaCampaignWithInsights[];
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCpc: number;
  avgCpm: number;
  avgCtr: number;
  totalPurchases: number;
  totalLeads: number;
  avgRoas: number;
  topCampaigns: MetaCampaignWithInsights[];
  worstCampaigns: MetaCampaignWithInsights[];
  noDeliveryCampaigns: MetaCampaignWithInsights[];
  pausedCampaigns: MetaCampaignWithInsights[];
  errorCampaigns: MetaCampaignWithInsights[];
  fetchedAt: string;
}

// Cards da UI
export interface MetaAdsMetricCardData {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  icon: string;
  status: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  trend?: 'up' | 'down' | 'stable';
  detail?: string;
}

export interface MetaAdsSetupChecklist {
  id: string;
  label: string;
  done: boolean;
  critical: boolean;
}
