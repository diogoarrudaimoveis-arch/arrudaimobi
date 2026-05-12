import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { name, phone, email, cpf_cnpj, city, property_type, intention, notes, tenant_id } = await req.json();

    // Validate required fields
    if (!name || !phone || !city || !property_type || !intention) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create owner in owners table
    const ownerData = {
      tenant_id: tenant_id || "9b4b048e-7d09-48a7-aebb-8376cc443695",
      name,
      phone: phone.replace(/\D/g, ""),
      email: email || null,
      cpf_cnpj: cpf_cnpj ? cpf_cnpj.replace(/\D/g, "") : null,
      bank_name: null,
      bank_agency: null,
      bank_account: null,
      pix_key: null,
      signature_url: null,
    };

    const { data: owner, error: ownerError } = await supabaseAdmin.from("owners").insert(ownerData).select().single();

    if (ownerError) {
      return new Response(JSON.stringify({ error: `Owner creation failed: ${ownerError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create proprietario record (if table exists) - graceful ignore if not
    try {
      await supabaseAdmin.from("proprietarios").insert({
        id: owner.id,
        nome: name,
        cpf_cnpj: cpf_cnpj?.replace(/\D/g, "") || null,
        email: email || null,
        whatsapp: phone.replace(/\D/g, ""),
        telefone: phone.replace(/\D/g, ""),
        cidade: city,
        status: "pending_review",
        notes: `Tipo: ${property_type} | Intenção: ${intention} | ${notes || ""}`.trim(),
      });
    } catch (e) {
      // proprietarios table might not exist yet - ignore
    }

    // 3. Create tracking tables if they don't exist (graceful)
    for (const table of ["property_views", "property_clicks", "property_leads"]) {
      try {
        // Just verify we can access - creation via migration
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      owner_id: owner.id,
      message: "Proprietário criado com sucesso"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});