import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIKeyEntry {
  value: string;
  status: "active" | "pending";
}

export interface AISettings {
  tenant_id: string;
  // Legacy single-key fields (kept for backward compat)
  openai_key: string | null;
  gemini_key: string | null;
  groq_key: string | null;
  // New multi-key JSONB arrays
  openai_keys: string[];
  gemini_keys: string[];
  groq_keys: string[];
  primary_provider: string;
  rotation_strategy: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: Omit<AISettings, "tenant_id"> = {
  openai_key: null,
  gemini_key: null,
  groq_key: null,
  openai_keys: [],
  gemini_keys: [],
  groq_keys: [],
  primary_provider: "openai",
  rotation_strategy: "fallback",
};

// ─── Helper: parse JSONB array returned from Supabase ──────────────────────

function parseKeys(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((k) => typeof k === "string" && k.trim() !== "");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw.trim() ? [raw] : [];
    }
  }
  return [];
}

// ─── Util: Round-Robin key picker ─────────────────────────────────────────

const keyCounters: Record<string, number> = {};

/**
 * Returns the next key for a given provider using round-robin rotation.
 * Falls back to random if counter overflows.
 */
export function getNextAvailableKey(
  provider: "openai" | "gemini" | "groq",
  keys: string[]
): string | null {
  const validKeys = keys.filter((k) => k.trim() !== "");
  if (validKeys.length === 0) return null;
  if (validKeys.length === 1) return validKeys[0];

  keyCounters[provider] = ((keyCounters[provider] ?? -1) + 1) % validKeys.length;
  return validKeys[keyCounters[provider]];
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export const useAISettings = () => {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ["ai-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_ai_settings")
        .select("*")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return { ...DEFAULT_SETTINGS, tenant_id: tenantId ?? "" } as AISettings;

      return {
        ...data,
        openai_keys: parseKeys(data.openai_keys),
        gemini_keys: parseKeys(data.gemini_keys),
        groq_keys: parseKeys(data.groq_keys),
      } as AISettings;
    },
    enabled: !!tenantId,
  });
};

export const useUpdateAISettingsMutation = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (
      updates: Partial<Pick<AISettings, "openai_keys" | "gemini_keys" | "groq_keys" | "primary_provider" | "rotation_strategy">>
    ) => {
      const payload = {
        tenant_id: tenantId,
        ...updates,
        // JSON arrays must be sent as proper arrays (Supabase handles JSONB serialization)
        openai_keys: updates.openai_keys ?? [],
        gemini_keys: updates.gemini_keys ?? [],
        groq_keys: updates.groq_keys ?? [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("tenant_ai_settings")
        .upsert(payload, { onConflict: "tenant_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings", tenantId] });
      toast.success("Configurações de IA salvas com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });
};
