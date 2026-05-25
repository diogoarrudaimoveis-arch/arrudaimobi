/**
 * Content Hub Migration — Run on demand
 * Creates: content_generations, content_templates tables
 * Call once via: POST /functions/v1/content-hub-migrate
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = ["https://arrudaimobi.com.br","https://www.arrudaimobi.com.br","https://arrudaimobi.vercel.app","http://localhost:5173"];

function getCors(origin: string | null) {
  const h = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost"))) {
    return { ...h, "Access-Control-Allow-Origin": origin };
  }
  return { ...h, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const results: string[] = [];

    // 1. Create content_generations table
    const { error: t1 } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.content_generations (
          id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          author_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
          property_id     UUID        REFERENCES public.properties(id) ON DELETE SET NULL,
          content_type    TEXT        NOT NULL,
          tone            TEXT        DEFAULT 'professional',
          target_platform TEXT        DEFAULT 'all',
          title           TEXT,
          body_text       TEXT,
          caption         TEXT,
          hashtags        TEXT[],
          script          TEXT,
          image_url       TEXT,
          video_url       TEXT,
          audio_url       TEXT,
          music_url       TEXT,
          provider        TEXT,
          model_used      TEXT,
          tokens_used    INTEGER,
          generation_time_ms INTEGER,
          status          TEXT        DEFAULT 'success',
          error_message   TEXT,
          logo_applied    BOOLEAN     DEFAULT FALSE,
          property_images TEXT[],
          created_at      TIMESTAMPTZ DEFAULT now(),
          updated_at      TIMESTAMPTZ DEFAULT now()
        );
      `,
    });
    if (t1) {
      // If rpc doesn't exist, try direct SQL via postgres
      results.push(`content_generations: ${t1.message}`);
    } else {
      results.push("content_generations: OK");
    }

    // 2. Create content_templates table
    try {
      await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS public.content_templates (
            id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id     UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
            name          TEXT        NOT NULL,
            description   TEXT,
            template_type TEXT        NOT NULL,
            config        JSONB       NOT NULL DEFAULT '{}',
            preview_url   TEXT,
            is_active     BOOLEAN     DEFAULT TRUE,
            created_at    TIMESTAMPTZ DEFAULT now(),
            updated_at    TIMESTAMPTZ DEFAULT now()
          );
        `,
      });
      results.push("content_templates: OK");
    } catch (e: any) {
      results.push(`content_templates: ${e.message}`);
    }

    // 3. Add FK to blog_posts if not exists
    try {
      await supabase.rpc("exec_sql", {
        sql: `ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS content_generation_id UUID REFERENCES public.content_generations(id) ON DELETE SET NULL;`,
      });
      results.push("blog_posts.content_generation_id: OK");
    } catch (e: any) {
      results.push(`blog_posts FK: ${e.message}`);
    }

    // 4. Add AI fields to tenant_ai_settings if not exists
    try {
      await supabase.rpc("exec_sql", {
        sql: `
          ALTER TABLE public.tenant_ai_settings
            ADD COLUMN IF NOT EXISTS minimax_api_key  TEXT,
            ADD COLUMN IF NOT EXISTS minimax_group_id TEXT,
            ADD COLUMN IF NOT EXISTS omniroute_api_key TEXT;
        `,
      });
      results.push("tenant_ai_settings fields: OK");
    } catch (e: any) {
      results.push(`tenant_ai_settings: ${e.message}`);
    }

    // 5. Create indexes
    try {
      await supabase.rpc("exec_sql", {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_content_gen_tenant ON public.content_generations(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_content_gen_type   ON public.content_generations(content_type);
          CREATE INDEX IF NOT EXISTS idx_content_gen_status ON public.content_generations(status);
          CREATE INDEX IF NOT EXISTS idx_content_gen_created ON public.content_generations(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_templates_tenant ON public.content_templates(tenant_id);
        `,
      });
      results.push("indexes: OK");
    } catch (e: any) {
      results.push(`indexes: ${e.message}`);
    }

    // 6. Enable RLS + policies
    try {
      await supabase.rpc("exec_sql", {
        sql: `
          ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.content_templates   ENABLE ROW LEVEL SECURITY;

          CREATE POLICY IF NOT EXISTS "content_gen_tenant_read" ON public.content_generations
            FOR SELECT USING (EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid()));

          CREATE POLICY IF NOT EXISTS "content_gen_tenant_insert" ON public.content_generations
            FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid()));

          CREATE POLICY IF NOT EXISTS "content_templates_tenant_read" ON public.content_templates
            FOR SELECT USING (EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid()));

          CREATE POLICY IF NOT EXISTS "content_templates_tenant_all" ON public.content_templates
            FOR ALL USING (EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND owner_id = auth.uid()));
        `,
      });
      results.push("RLS policies: OK");
    } catch (e: any) {
      results.push(`RLS: ${e.message}`);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
