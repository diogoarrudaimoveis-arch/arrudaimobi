-- Migration: AI Configuration & Usage Logging
-- Supports OpenAI, Gemini, and Groq with fallback logic

-- 1. AI Settings Table
CREATE TABLE IF NOT EXISTS public.tenant_ai_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  openai_key TEXT,
  gemini_key TEXT,
  groq_key TEXT,
  primary_provider TEXT DEFAULT 'openai',
  rotation_strategy TEXT DEFAULT 'fallback', -- 'primary_only', 'rotation', 'fallback'
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. AI Usage Logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  feature_used TEXT, -- e.g., 'property_description'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE public.tenant_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy for settings: only the tenant can access their own keys
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenants can manage their own AI settings') THEN
        CREATE POLICY "Tenants can manage their own AI settings" ON public.tenant_ai_settings
          FOR ALL TO authenticated
          USING (tenant_id = public.get_user_tenant_id(auth.uid()))
          WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
    END IF;
END $$;

-- Policy for logs: tenants can see their own usage
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenants can view their own AI usage logs') THEN
        CREATE POLICY "Tenants can view their own AI usage logs" ON public.ai_usage_logs
          FOR SELECT TO authenticated
          USING (tenant_id = public.get_user_tenant_id(auth.uid()));
    END IF;
END $$;

-- Policy for inserting logs: authenticated users can insert (via services/edge functions)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert AI usage logs') THEN
        CREATE POLICY "Authenticated users can insert AI usage logs" ON public.ai_usage_logs
          FOR INSERT TO authenticated
          WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
    END IF;
END $$;

-- Enable helper function or indexes if needed
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant ON public.ai_usage_logs(tenant_id);
