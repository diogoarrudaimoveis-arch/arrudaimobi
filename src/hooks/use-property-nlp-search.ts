import { useState, useCallback } from "react";
import { createOmniRouteClient, type PropertyContext } from "@/integrations/omniroute/client";
import { SearchFilters } from "@/types/property";

const OMNIRoute_KEY = import.meta.env.VITE_OMNIRoute_API_KEY as string;

/**
 * Hook for AI-powered NLP property search via OmniRoute.
 * Converts natural language queries into structured SearchFilters.
 */
export function usePropertyNLPSearch() {
  const [isAILoading, setIsAILoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = createOmniRouteClient({ apiKey: OMNIRoute_KEY });

  const parseNaturalLanguage = useCallback(
    async (query: string): Promise<Partial<SearchFilters>> => {
      if (!query.trim()) return {};
      setIsAILoading(true);
      setError(null);
      try {
        const result = await client.nlpSearch(query);
        return result as Partial<SearchFilters>;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error("[usePropertyNLPSearch] NLP error:", msg);
        return {};
      } finally {
        setIsAILoading(false);
      }
    },
    [client]
  );

  return {
    parseNaturalLanguage,
    isAILoading,
    error,
  };
}