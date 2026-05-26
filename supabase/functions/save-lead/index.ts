// Edge Function: save-lead
// Block 7d: Supabase Schema — Edge Functions for API
// Saves a CRM lead from website forms, Meta Ads, WhatsApp, etc.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost"))) {
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

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
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
    const body = await req.json();

    const {
      name,
      email,
      phone,
      property_id,
      property_title,
      interest_type,
      source,
      notes,
      budget_min,
      budget_max,
      assigned_agent_id,
      meta_ad_campaign_id,
      meta_ad_set_id,
      meta_ad_id,
      tenant_id,
    } = body;

    // Validate required fields
    if (!name || !phone) {
      return new Response(JSON.stringify({ error: "name and phone are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedTenantId = tenant_id || getTenantId();
    const phoneSanitized = sanitizePhone(phone);

    // Check for existing lead by phone within same tenant (to avoid duplicates)
    const { data: existingLead } = await supabase
      .from("crm_leads")
      .select("id, stage")
      .eq("tenant_id", resolvedTenantId)
      .eq("phone_sanitized", phoneSanitized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadData: Record<string, unknown>;

    if (existingLead) {
      // Update existing lead — move to "new" stage if it was closed
      const { data, error } = await supabase
        .from("crm_leads")
        .update({
          name,
          email: email || null,
          property_id: property_id || null,
          property_title: property_title || null,
          interest_type: interest_type || null,
          notes: notes ? `${existingLead.notes || ""}\n---\n${notes}` : null,
          stage: existingLead.stage.startsWith("closed_") ? "new" : existingLead.stage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id)
        .select()
        .single();

      if (error) throw error;
      leadData = data;
    } else {
      // Insert new lead
      const { data, error } = await supabase
        .from("crm_leads")
        .insert({
          tenant_id: resolvedTenantId,
          tenant_name: "Arruda Imobi",
          name,
          email: email || null,
          phone,
          phone_sanitized: phoneSanitized,
          property_id: property_id || null,
          property_title: property_title || null,
          interest_type: interest_type || null,
          source: source || "website",
          stage: "new",
          notes: notes || null,
          budget_min: budget_min || null,
          budget_max: budget_max || null,
          assigned_agent_id: assigned_agent_id || null,
          meta_ad_campaign_id: meta_ad_campaign_id || null,
          meta_ad_set_id: meta_ad_set_id || null,
          meta_ad_id: meta_ad_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      leadData = data;
    }

    // Log to crm_lead_events if that table exists
    try {
      await supabase
        .from("crm_lead_events")
        .insert({
          lead_id: leadData.id,
          event_type: existingLead ? "updated" : "created",
          payload: { source, property_id, property_title },
          actor: "system",
        });
    } catch (e) {
      // Non-fatal — just log
      console.warn("Could not log lead event:", e);
    }

    return new Response(JSON.stringify({ success: true, lead: leadData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("save-lead error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});