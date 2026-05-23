import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const ARRUDA_TENANT = "Arruda Imobi";

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

// Verify the request is from an authenticated admin
async function verifyAdminAuth(req: Request, supabase: ReturnType<typeof getSupabaseAdmin>): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return false;

    // Check if user has a profile with admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return false;

    // Check if user has admin role in user_roles
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return role?.role === "admin";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify admin auth
    const isAdmin = await verifyAdminAuth(req, supabase);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized. Admin access required." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get stages
    const { data: stages, error: stagesError } = await supabase
      .from("crm_pipeline_stages")
      .select("id, slug, name, sort_order, emoji, color, is_default, is_active")
      .eq("is_active", true)
      .order("sort_order");

    if (stagesError) {
      console.error("stages error:", stagesError);
      throw stagesError;
    }

    // Get leads for Arruda Imobi tenant
    const { data: leads, error: leadsError } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("tenant_name", ARRUDA_TENANT)
      .order("updated_at", { ascending: false });

    if (leadsError) {
      console.error("leads error:", leadsError);
      throw leadsError;
    }

    // Build counts
    const total = leads?.length ?? 0;
    const countsByStage: Record<string, number> = {};
    const leadsByStage: Record<string, any[]> = {};

    if (leads) {
      for (const lead of leads) {
        const slug = lead.stage_slug || "novos_leads_ia";
        if (!leadsByStage[slug]) {
          leadsByStage[slug] = [];
          countsByStage[slug] = 0;
        }
        leadsByStage[slug].push(lead);
        countsByStage[slug]++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stages: stages || [],
      leads: leads || [],
      leadsByStage,
      countsByStage,
      total,
      source: "crm_leads",
      synced_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("crm-admin-read error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
EOF

echo "Edge function with auth created"