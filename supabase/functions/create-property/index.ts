import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const DEFAULT_TENANT_ID = "9b4b048e-7d09-48a7-aebb-8376cc443695";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanText = (value: unknown) => String(value || "").trim();
const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isValidPortalToken = (ownerId: string, token: string) => {
  if (!ownerId || !token) return false;
  if (!token.startsWith(`${ownerId}.`)) return false;
  return token.length >= ownerId.length + 12;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Server configuration missing" }, 500);
    }

    const payload = await req.json();
    const ownerId = cleanText(payload.owner_id);
    const portalToken = cleanText(payload.portal_token || payload.token);
    const title = cleanText(payload.title);
    const city = cleanText(payload.city);
    const state = cleanText(payload.state || "MG");
    const propertyType = cleanText(payload.property_type);
    const purpose = cleanText(payload.purpose || "sale");
    const description = cleanText(payload.description);
    const neighborhood = cleanText(payload.neighborhood);
    const tenantId = cleanText(payload.tenant_id) || DEFAULT_TENANT_ID;
    const price = toNumber(payload.price);

    if (!ownerId || !isValidPortalToken(ownerId, portalToken)) {
      return json({ error: "Invalid portal token" }, 401);
    }

    if (!title || !city || !propertyType) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from("owners")
      .select("id")
      .eq("id", ownerId)
      .maybeSingle();

    if (ownerError || !owner?.id) {
      console.error("create-property owner check failed", { code: ownerError?.code, message: ownerError?.message });
      return json({ error: "Owner not found" }, 404);
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from("properties")
      .insert({
        owner_id: ownerId,
        title,
        city,
        state,
        neighborhood: neighborhood || null,
        price,
        type_id: null,
        purpose,
        description: description || "",
        status: "pending",
        tenant_id: tenantId,
        featured: false,
      })
      .select("id, owner_id, title, status, featured, created_at")
      .single();

    if (propertyError || !property?.id) {
      console.error("create-property insert failed", { code: propertyError?.code, message: propertyError?.message });
      return json({ error: "Property creation failed" }, 500);
    }

    return json({
      success: true,
      property_id: property.id,
      owner_id: ownerId,
      status: property.status,
      review_status: "pending_review",
      published: false,
      message: "Imóvel cadastrado para revisão",
    });
  } catch (error) {
    console.error("create-property unexpected error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unexpected error" }, 500);
  }
});
