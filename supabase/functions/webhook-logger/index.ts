// Edge Function: webhook-logger
// Block 7d: Supabase Schema — Edge Functions for API
// Logs any external webhook (N8N, ZPRO, Meta, etc.) for audit/debugging

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const KNOWN_WEBHOOK_SOURCES = ["n8n", "zpro", "meta", "vercel", "unknown"];

function getCorsHeaders(origin: string | null) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-source",
    "Access-Control-Allow-Credentials": "true",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

function getTenantId(): string {
  return Deno.env.get("ARRUDA_TENANT_ID") || "00000000-0000-0000-0000-000000000000";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const tenantId = getTenantId();
    const webhookSource = req.headers.get("x-webhook-source") || "unknown";
    const source = KNOWN_WEBHOOK_SOURCES.includes(webhookSource) ? webhookSource : "unknown";

    // Parse body — may be JSON or text
    let rawPayload: Record<string, unknown>;
    let message = "";
    let messageId = "";
    let phone = "";

    try {
      rawPayload = await req.json();
    } catch {
      const text = await req.text();
      rawPayload = { raw: text };
      message = text.substring(0, 500);
    }

    // Extract common fields if present
    if (rawPayload?.entry?.[0]?.changes?.[0]?.value) {
      // WhatsApp/Meta webhook format
      const value = rawPayload.entry[0].changes[0].value;
      messageId = rawPayload.entry[0].changes[0].value?.messages?.[0]?.id || "";
      phone = rawPayload.entry[0].changes[0].value?.messages?.[0]?.from || rawPayload.entry[0].changes[0].value?.statuses?.[0]?.recipient_id || "";
      message = rawPayload.entry[0].changes[0].value?.messages?.[0]?.text?.body || rawPayload.entry[0].changes[0].value?.statuses?.[0]?.status || "";
    } else if (rawPayload?.message?.text) {
      // ZPRO format
      messageId = rawPayload.message.id || rawPayload.message.message_id || "";
      phone = rawPayload.message.from || rawPayload.contact?.phone || "";
      message = rawPayload.message.text;
    } else {
      messageId = rawPayload.id || rawPayload.message_id || `ts-${Date.now()}`;
      phone = rawPayload.phone || rawPayload.from || "";
      message = typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload).substring(0, 500);
    }

    const { data, error } = await supabase
      .from("zpro_webhook_events")
      .insert({
        tenant_id: tenantId,
        phone,
        contact_name: rawPayload?.contact?.name || rawPayload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || null,
        event_type: rawPayload?.event_type || source,
        message_id: messageId,
        message: message.substring(0, 2000),
        session_id: rawPayload.session_id || rawPayload.conversation_id || null,
        source,
        media_url: rawPayload.media_url || rawPayload.url || null,
        raw_payload: rawPayload,
      })
      .select()
      .single();

    if (error) {
      console.error("webhook-logger insert error:", error);
      // Don't fail the webhook — just log
      return new Response(JSON.stringify({ logged: false, error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ logged: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook-logger exception:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});