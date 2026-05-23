// Meta Ads Health Checker — READ-ONLY
// Nunca expõe tokens ou payloads sensíveis

import type { MetaAdsHealth, MetaHealthStatus } from './metaAdsTypes';

const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getMetaEnv() {
  // Lê variáveis de ambiente — fallback seguro
  const token = import.meta.env.VITE_META_ACCESS_TOKEN as string | undefined;
  const accountId = import.meta.env.VITE_META_AD_ACCOUNT_ID as string | undefined;
  const systemToken = import.meta.env.VITE_META_SYSTEM_USER_TOKEN as string | undefined;
  // System user token tem prioridade
  return {
    token: systemToken && systemToken.length > 10 ? systemToken : token,
    accountId,
  };
}

function mapErrorToStatus(code: number | null, message: string | null): MetaHealthStatus {
  if (!code) return 'API_ERROR';
  if (code === 190) return 'TOKEN_INVALID';
  if (code === 200 || code === 298) return 'NO_PERMISSION';
  if (code === 429) return 'RATE_LIMIT';
  if (message?.includes('declarable')) return 'NO_PERMISSION';
  return 'API_ERROR';
}

export async function checkMetaHealth(): Promise<MetaAdsHealth> {
  const { token, accountId } = getMetaEnv();
  const checkedAt = new Date().toISOString();

  // Sem token definido
  if (!token || token.length < 10) {
    return {
      status: 'NOT_CONFIGURED',
      accountId: accountId ?? null,
      accountName: null,
      accountStatus: null,
      canReadAds: false,
      canManageAds: false,
      tokenExpiresAt: null,
      apiVersion: API_VERSION,
      checkedAt,
      errorCode: null,
      errorMessage: 'META_ACCESS_TOKEN não definido',
    };
  }

  // Testar token com /me
  try {
    const meRes = await fetch(`${BASE_URL}/me?access_token=${token}`);
    const meData = await meRes.json();

    if (!meRes.ok || meData.error) {
      const err = meData.error ?? {};
      return {
        status: mapErrorToStatus(err.code, err.message),
        accountId,
        accountName: null,
        accountStatus: null,
        canReadAds: false,
        canManageAds: false,
        tokenExpiresAt: null,
        apiVersion: API_VERSION,
        checkedAt,
        errorCode: err.code ?? meRes.status,
        errorMessage: err.message ?? 'Erro ao validar token',
      };
    }

    // Testar /debug_token para ver escopos
    const debugRes = await fetch(
      `${BASE_URL}/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugRes.json();
    const scopes: string[] = debugData.data?.scopes ?? [];
    const canRead = scopes.includes('ads_read');
    const canManage = scopes.includes('ads_management');

    if (!canRead) {
      return {
        status: 'NO_PERMISSION',
        accountId,
        accountName: meData.name ?? null,
        accountStatus: null,
        canReadAds: false,
        canManageAds: canManage,
        tokenExpiresAt: debugData.data?.expires_at
          ? new Date(debugData.data.expires_at * 1000).toISOString()
          : null,
        apiVersion: API_VERSION,
        checkedAt,
        errorCode: 200,
        errorMessage: 'Token sem escopo ads_read — configure System User com permissões de Marketing API',
      };
    }

    // Testar acesso à conta de anúncios
    if (accountId) {
      const accountRes = await fetch(
        `${BASE_URL}/${accountId}?fields=name,account_status&access_token=${token}`
      );
      const accountData = await accountRes.json();

      if (!accountRes.ok || accountData.error) {
        return {
          status: 'DEGRADED',
          accountId,
          accountName: null,
          accountStatus: null,
          canReadAds: false,
          canManageAds: canManage,
          tokenExpiresAt: debugData.data?.expires_at
            ? new Date(debugData.data.expires_at * 1000).toISOString()
            : null,
          apiVersion: API_VERSION,
          checkedAt,
          errorCode: accountData.error?.code ?? null,
          errorMessage: accountData.error?.message ?? 'Erro ao acessar conta',
        };
      }

      return {
        status: 'CONNECTED',
        accountId,
        accountName: accountData.name ?? meData.name ?? null,
        accountStatus: accountData.account_status ?? null,
        canReadAds: true,
        canManageAds: canManage,
        tokenExpiresAt: debugData.data?.expires_at
          ? new Date(debugData.data.expires_at * 1000).toISOString()
          : null,
        apiVersion: API_VERSION,
        checkedAt,
        errorCode: null,
        errorMessage: null,
      };
    }

    return {
      status: 'CONNECTED',
      accountId,
      accountName: meData.name ?? null,
      accountStatus: null,
      canReadAds: true,
      canManageAds: canManage,
      tokenExpiresAt: debugData.data?.expires_at
        ? new Date(debugData.data.expires_at * 1000).toISOString()
        : null,
      apiVersion: API_VERSION,
      checkedAt,
      errorCode: null,
      errorMessage: null,
    };
  } catch (err) {
    return {
      status: 'API_ERROR',
      accountId: accountId ?? null,
      accountName: null,
      accountStatus: null,
      canReadAds: false,
      canManageAds: false,
      tokenExpiresAt: null,
      apiVersion: API_VERSION,
      checkedAt,
      errorCode: null,
      errorMessage: String(err),
    };
  }
}
