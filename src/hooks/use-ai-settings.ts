import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AISettings {
  tenant_id: string;
  openai_key: string | null;
  gemini_key: string | null;
  groq_key: string | null;
  primary_provider: string;
  rotation_strategy: string;
}

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
      
      // If none exists, return defaults
      if (!data) {
        return {
          openai_key: "",
          gemini_key: "",
          groq_key: "",
          primary_provider: "openai",
          rotation_strategy: "fallback",
        } as AISettings;
      }
      
      return data as AISettings;
    },
    enabled: !!tenantId,
  });
};

export const useUpdateAISettingsMutation = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<AISettings>) => {
      const { data, error } = await supabase
        .from("tenant_ai_settings")
        .upsert({ tenant_id: tenantId, ...updates })
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
