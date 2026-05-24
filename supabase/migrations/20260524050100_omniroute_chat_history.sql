-- ============================================================
-- Migration: omniroute_chat_history — Chat history for OmniRoute LLM chatbot
-- Block 7a: Supabase Schema — Table Design
-- Created by JACK (Arruda Imobi 150% Builder)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.omni_route_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Session management
  session_id TEXT NOT NULL,
  visitor_ip TEXT,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  message_tokens INTEGER,
  
  -- OmniRoute metadata
  model_used TEXT,
  omniroute_request_id TEXT,
  latency_ms INTEGER,
  
  -- Property context (optional linkage)
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title TEXT,
  
  -- Feedback
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.omni_route_chat_history ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own chat messages (for writes from site)
CREATE POLICY "Anyone can insert chat messages"
  ON public.omni_route_chat_history FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view chat history for their tenant
CREATE POLICY "Tenant users can view chat history"
  ON public.omni_route_chat_history FOR SELECT
  TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Service role can do everything
CREATE POLICY "Service role full access to chat history"
  ON public.omni_route_chat_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_session
  ON public.omni_route_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_tenant
  ON public.omni_route_chat_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created
  ON public.omni_route_chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_property
  ON public.omni_route_chat_history(property_id)
  WHERE property_id IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_omni_route_chat_history_updated_at ON public.omni_route_chat_history;
CREATE TRIGGER update_omni_route_chat_history_updated_at
  BEFORE UPDATE ON public.omni_route_chat_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.omni_route_chat_history IS 'Chat history table for OmniRoute LLM chatbot. Created by JACK Block 7a (2026-05-24). Stores all chatbot conversations for audit, analytics, and model fine-tuning.';
