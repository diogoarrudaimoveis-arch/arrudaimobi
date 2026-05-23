import { useState, useCallback } from "react";
import { createOmniRouteClient, type PropertyContext } from "@/integrations/omniroute/client";

/**
 * Hook for OmniRoute LLM integration
 * Used for: description generation, NLP search, property recommendations
 */
export function useOmniRoute(apiKey: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = createOmniRouteClient({ apiKey });

  const generateDescription = useCallback(
    async (property: PropertyContext, tone: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.generateDescription(property, tone, property);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const nlpSearch = useCallback(
    async (query: string): Promise<Partial<PropertyContext>> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.nlpSearch(query);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const recommendSimilar = useCallback(
    async (
      currentProperty: PropertyContext,
      allProperties: PropertyContext[]
    ): Promise<PropertyContext[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.recommendSimilar(currentProperty, allProperties);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return {
    generateDescription,
    nlpSearch,
    recommendSimilar,
    isLoading,
    error,
  };
}