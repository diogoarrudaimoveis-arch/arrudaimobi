import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, preferences, consent_version, action } = await req.json();

    if (!session_id || !preferences) {
      return new Response(
        JSON.stringify({ error: "session_id and preferences are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 10 consent saves per IP per minute
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const { data: rateCheck } = await supabaseAdmin.rpc("check_rate_limit", {
      _identifier: clientIp,
      _action_type: "save-consent",
      _max_requests: 10,
      _window_seconds: 60,
      _block_seconds: 120,
    });
    if (rateCheck && !rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capture IP from headers
    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Extract user_id from auth token if present
    let user_id: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) user_id = user.id;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("cookie_consents").insert({
      user_id,
      session_id,
      ip_address,
      preferences,
      consent_version: consent_version || "1.0",
      action: action || "save",
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-consent error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
