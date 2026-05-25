-- ============================================================
-- Arruda Imobi — Content Hub Database Schema
-- Gerador de Conteúdo IA completo: texto, imagem, vídeo,
-- áudio, música, templates Canvas para imobiliária
-- ============================================================

-- ─── 1. content_generations ───────────────────────────────────
-- Histórico de todas as gerações de conteúdo por tenant
CREATE TABLE IF NOT EXISTS public.content_generations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What was requested
  content_type TEXT       NOT NULL, -- 'blog_post' | 'social_post' | 'story' | 'video_script' | 'voiceover' | 'music' | 'property_description' | 'ad_copy'
  prompt_text  TEXT,
  property_id  UUID        REFERENCES public.properties(id) ON DELETE SET NULL,
  tone         TEXT        DEFAULT 'professional', -- 'luxury' | 'family' | 'urgent' | 'modern' | 'professional'
  target_platform TEXT     DEFAULT 'all', -- 'instagram' | 'facebook' | 'youtube' | 'whatsapp' | 'blog' | 'all'

  -- Generated outputs
  title        TEXT,
  body_text    TEXT,
  caption      TEXT,
  hashtags     TEXT[],
  script       TEXT,  -- for video/voiceover
  image_url    TEXT,  -- AI-generated image
  video_url    TEXT,  -- AI-generated video
  audio_url    TEXT,  -- TTS voiceover
  music_url    TEXT,  -- generated background music

  -- Template renderer outputs (Canvas API)
  template_story_url  TEXT,
  template_post_url   TEXT,
  template_thumb_url  TEXT,
  template_card_url   TEXT,
  template_square_url TEXT,
  template_cover_url  TEXT,

  -- AI provider tracking
  provider     TEXT,  -- 'minimax' | 'omniroute' | 'openai' | 'gemini' | 'groq'
  model_used   TEXT,
  tokens_used  INTEGER,
  generation_time_ms INTEGER,

  -- Status
  status       TEXT    DEFAULT 'success', -- 'success' | 'failed' | 'pending'
  error_message TEXT,

  -- Compositing
  logo_applied     BOOLEAN DEFAULT FALSE,
  property_images  TEXT[], -- source property images used

  -- Timestamps
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for content_generations
CREATE INDEX IF NOT EXISTS idx_content_gen_tenant ON public.content_generations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_gen_type   ON public.content_generations(content_type);
CREATE INDEX IF NOT EXISTS idx_content_gen_status ON public.content_generations(status);
CREATE INDEX IF NOT EXISTS idx_content_gen_created ON public.content_generations(created_at DESC);

-- ─── 2. content_templates ────────────────────────────────────
-- Template presets salvos por tenant (designs favoritos)
CREATE TABLE IF NOT EXISTS public.content_templates (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name         TEXT        NOT NULL,
  description  TEXT,
  template_type TEXT       NOT NULL, -- 'story' | 'post' | 'thumb' | 'card' | 'square' | 'cover'

  -- Canvas config snapshot
  config       JSONB       NOT NULL DEFAULT '{}',

  -- Preview
  preview_url  TEXT,

  is_active    BOOLEAN     DEFAULT TRUE,

  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant ON public.content_templates(tenant_id);

-- ─── 3. blog_posts — add content_generation_id FK ────────────
ALTER TABLE public.blog_posts
  DROP COLUMN IF EXISTS content_generation_id;

ALTER TABLE public.blog_posts
  ADD COLUMN  content_generation_id UUID REFERENCES public.content_generations(id) ON DELETE SET NULL;

-- ─── 4. tenant_ai_settings — add MiniMax fields ───────────────
ALTER TABLE public.tenant_ai_settings
  ADD COLUMN IF NOT EXISTS minimax_api_key   TEXT,
  ADD COLUMN IF NOT EXISTS minimax_group_id  TEXT,
  ADD COLUMN IF NOT EXISTS omniroute_api_key TEXT;

-- ─── 5. RLS policies ──────────────────────────────────────────
ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates   ENABLE ROW LEVEL SECURITY;

-- Tenant users see only their tenant's content
CREATE POLICY "content_gen_tenant_read" ON public.content_generations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid())
  );

CREATE POLICY "content_gen_tenant_insert" ON public.content_generations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid())
  );

CREATE POLICY "content_templates_tenant_read" ON public.content_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid())
  );

CREATE POLICY "content_templates_tenant_all" ON public.content_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid())
  );
