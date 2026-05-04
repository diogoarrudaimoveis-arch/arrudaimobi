/**
 * useIntegrationHealth — React hook para polling de healthcheck
 */
import { useQuery } from '@tanstack/react-query'
import { checkAllIntegrations } from './index'
import type { IntegrationHealth } from './index'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useIntegrationHealth(supabase: SupabaseClient, refetchInterval = 60_000) {
  return useQuery<IntegrationHealth>({
    queryKey: ['integration-health'],
    queryFn: () => checkAllIntegrations(supabase),
    refetchInterval,
    staleTime: 30_000,
    retry: 1,
  })
}
