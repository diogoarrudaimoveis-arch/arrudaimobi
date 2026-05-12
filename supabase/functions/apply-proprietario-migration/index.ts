import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

interface MigrationResult {
  success: boolean;
  message: string;
  details?: string[];
  error?: string;
}

async function applyMigration(supabase: any): Promise<MigrationResult> {
  const results: string[] = [];
  const errors: string[] = [];

  // 1. Create proprietarios table
  try {
    const { error } = await supabase.rpc("exec", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.proprietarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
          nome TEXT NOT NULL,
          cpf_cnpj TEXT UNIQUE,
          email TEXT,
          whatsapp TEXT,
          telefone TEXT,
          cidade TEXT,
          estado TEXT DEFAULT 'MG' CHECK (estado IN ('MG', 'SP', 'RJ', 'ES', 'other')),
          tipo_imovel_interesse TEXT,
          intencao TEXT,
          status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'active', 'rejected', 'inactive')),
          portal_token TEXT,
          portal_token_expires_at TIMESTAMPTZ,
          source TEXT DEFAULT 'portal',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          created_by UUID
        );
      `
    });
    if (error) throw error;
    results.push("proprietarios table created");
  } catch (e: any) {
    errors.push(`proprietarios: ${e.message}`);
  }

  // 2. Add columns to properties
  try {
    const { error } = await supabase.rpc("exec", {
      sql: `ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS proprietario_id UUID;`
    });
    if (error) throw error;
    results.push("proprietario_id column added to properties");
  } catch (e: any) {
    errors.push(`proprietario_id: ${e.message}`);
  }

  try {
    const { error } = await supabase.rpc("exec", {
      sql: `ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected', 'inactive'));`
    });
    if (error) throw error;
    results.push("review_status column added to properties");
  } catch (e: any) {
    errors.push(`review_status: ${e.message}`);
  }

  // 3. Create tracking tables
  for (const table of ["property_views", "property_clicks", "property_leads"]) {
    try {
      const { error } = await supabase.rpc("exec", {
        sql: `CREATE TABLE IF NOT EXISTS public.${table} (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now());`
      });
      if (error && !error.message.includes("already exists")) throw error;
      results.push(`${table} table created/verified`);
    } catch (e: any) {
      errors.push(`${table}: ${e.message}`);
    }
  }

  // 4. Create index
  try {
    const { error } = await supabase.rpc("exec", {
      sql: `CREATE INDEX IF NOT EXISTS idx_properties_proprietario_id ON public.properties(proprietario_id);`
    });
    if (error) throw error;
    results.push("index idx_properties_proprietario_id created");
  } catch (e: any) {
    errors.push(`index: ${e.message}`);
  }

  // 5. Enable RLS
  for (const table of ["proprietarios", "property_views", "property_clicks", "property_leads"]) {
    try {
      const { error } = await supabase.rpc("exec", {
        sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
      });
      if (error && !error.message.includes("already enabled")) throw error;
      results.push(`RLS enabled on ${table}`);
    } catch (e: any) {
      errors.push(`RLS ${table}: ${e.message}`);
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? "Migration complete" : "Migration with errors",
    details: results,
    error: errors.length > 0 ? errors.join("; ") : undefined
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const result = await applyMigration(supabase);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
