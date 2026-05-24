// Edge Function: save-chat-message
// Block 7d: Supabase Schema — Edge Functions for API
// Saves a chat message from OmniRoute chatbot to omni_route_chat_history

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const ARRUDA_TENANT_ID = "00000000-0000-0000-0000-000000000000"; // Placeholder — set via env

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function getTenantId(): string {
  return Deno.env.get("ARRUDA_TENANT_ID") || ARRUDA_TENANT_ID;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      session_id,
      role,
      message,
      visitor_ip,
      property_id,
      property_title,
      model_used,
      omniroute_request_id,
      latency_ms,
      rating,
      feedback_text,
      tenant_id,
    } = body;

    // Validate required fields
    if (!session_id || !role || !message) {
      return new Response(JSON.stringify({ error: "session_id, role, and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["user", "assistant", "system"].includes(role)) {
      return new Response(JSON.stringify({ error: "role must be 'user', 'assistant', or 'system'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedTenantId = tenant_id || getTenantId();

    const { data, error } = await supabase
      .from("omni_route_chat_history")
      .insert({
        tenant_id: resolvedTenantId,
        session_id,
        role,
        message,
        visitor_ip: visitor_ip || null,
        property_id: property_id || null,
        property_title: property_title || null,
        model_used: model_used || null,
        omniroute_request_id: omniroute_request_id || null,
        latency_ms: latency_ms || null,
        rating: rating || null,
        feedback_text: feedback_text || null,
      })
      .select()
      .single();

    if (error) {
      console.error("save-chat-message error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("save-chat-message exception:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});