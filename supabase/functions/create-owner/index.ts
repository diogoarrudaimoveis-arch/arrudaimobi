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

const onlyDigits = (value: unknown) => String(value || "").replace(/\D/g, "");
const cleanText = (value: unknown) => String(value || "").trim();

const createPortalToken = (ownerId: string) => {
  const random = crypto.getRandomValues(new Uint8Array(24));
  const randomPart = btoa(String.fromCharCode(...random)).replace(/[+/=]/g, "").slice(0, 24);
  return `${ownerId}.${randomPart}`;
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
    const name = cleanText(payload.name);
    const phone = onlyDigits(payload.phone);
    const email = cleanText(payload.email);
    const cpfCnpj = onlyDigits(payload.cpf_cnpj);
    const city = cleanText(payload.city);
    const propertyType = cleanText(payload.property_type);
    const intention = cleanText(payload.intention || payload.intent);
    const source = cleanText(payload.source || "captacao-imovel");
    const notes = cleanText(payload.notes);
    const tenantId = cleanText(payload.tenant_id) || DEFAULT_TENANT_ID;

    if (!name || !phone || !city || !propertyType || !intention) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ownerData = {
      tenant_id: tenantId,
      name,
      phone,
      email: email || null,
      cpf_cnpj: cpfCnpj || null,
      bank_name: "",
      bank_agency: "",
      bank_account: "",
      pix_key: "",
      signature_url: "",
    };

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from("owners")
      .insert(ownerData)
      .select("id, name, phone, email, cpf_cnpj, tenant_id, created_at")
      .single();

    if (ownerError || !owner?.id) {
      console.error("create-owner owners insert failed", { code: ownerError?.code, message: ownerError?.message });
      return json({ error: "Owner creation failed" }, 500);
    }

    const portalToken = createPortalToken(owner.id);

    // Optional table for richer owner portal/audit. Ignore if migration is not applied yet.
    const { error: proprietarioError } = await supabaseAdmin.from("proprietarios").insert({
      id: owner.id,
      nome: name,
      cpf_cnpj: cpfCnpj || null,
      email: email || null,
      whatsapp: phone,
      telefone: phone,
      cidade: city,
      status: "pending_review",
      portal_token: portalToken,
      notes: `Tipo: ${propertyType} | Intenção: ${intention} | Origem: ${source} | ${notes}`.trim(),
    });

    if (proprietarioError) {
      console.warn("create-owner proprietarios optional insert skipped", {
        code: proprietarioError.code,
        message: proprietarioError.message,
      });
    }

    return json({
      success: true,
      owner_id: owner.id,
      portal_token: portalToken,
      status: "pending_review",
      message: "Proprietário criado com sucesso",
    });
  } catch (error) {
    console.error("create-owner unexpected error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unexpected error" }, 500);
  }
});
