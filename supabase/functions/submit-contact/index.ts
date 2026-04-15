import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173"
];

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }

  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

function sanitizePhoneNumber(phone: string): { valid: boolean; sanitized: string; error?: string } {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return { valid: true, sanitized: digits };
  }
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
    return { valid: true, sanitized: digits };
  }
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return { valid: true, sanitized: digits };
  }
  return { valid: false, sanitized: digits, error: `Número inválido: ${digits}` };
}

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const isPost = req.method === "POST";
  if (!isPost && req.method !== "OPTIONS") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting by IP for public endpoints
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    if (action === "submit-contact") {
      const { data: rateCheck } = await supabase.rpc("check_rate_limit", {
        _identifier: clientIp,
        _action_type: "submit-contact",
        _max_requests: 5,
        _window_seconds: 60,
        _block_seconds: 300,
      });

      if (rateCheck && !rateCheck.allowed) {
        return new Response(JSON.stringify({
          error: "Muitas tentativas. Tente novamente em alguns minutos.",
          retry_after: rateCheck.retry_after,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retry_after) },
        });
      }
    }

    let result: any;

    switch (action) {
      case "check-auth-rate-limit": {
        const { auth_action } = body;
        if (!auth_action) {
          return new Response(JSON.stringify({ error: "auth_action required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const limits: Record<string, { max: number; window: number; block: number }> = {
          login: { max: 5, window: 60, block: 300 },
          register: { max: 3, window: 60, block: 600 },
          "reset-password": { max: 3, window: 60, block: 600 },
        };

        const limit = limits[auth_action];
        if (!limit) {
          return new Response(JSON.stringify({ error: "invalid auth_action" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: authRate } = await supabase.rpc("check_rate_limit", {
          _identifier: clientIp,
          _action_type: `auth-${auth_action}`,
          _max_requests: limit.max,
          _window_seconds: limit.window,
          _block_seconds: limit.block,
        });

        if (authRate && !authRate.allowed) {
          return new Response(JSON.stringify({
            allowed: false,
            retry_after: authRate.retry_after,
            error: "Muitas tentativas. Aguarde antes de tentar novamente.",
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(authRate.retry_after) },
          });
        }

        result = { allowed: true };
        break;
      }

      case "submit-contact": {
        const { name, email, phone, message, property_id, agent_id, tenant_id, is_external_lead, external_source } = body;

        if (!name || name.trim().length < 2) {
          return new Response(JSON.stringify({ error: "Nome é obrigatório (mínimo 2 caracteres)" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!tenant_id) {
          return new Response(JSON.stringify({ error: "tenant_id é obrigatório" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!phone) {
          return new Response(JSON.stringify({ error: "Telefone é obrigatório" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!email && !phone) {
          return new Response(JSON.stringify({ error: "Informe email ou telefone" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase.from("contacts").insert({
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          message: message?.trim() || null,
          property_id: property_id || null,
          agent_id: agent_id || null,
          tenant_id,
          status: "new",
          is_external_lead: is_external_lead ?? false,
          external_source: external_source ?? null,
        }).select().single();

        if (error) throw error;

        // Try to send WhatsApp message via Evolution API
        let whatsappStatus = "not_configured";
        try {
          const { data: config } = await supabase
            .from("evolution_config")
            .select("*")
            .eq("tenant_id", tenant_id)
            .maybeSingle();

          if (config?.base_url && config?.api_key && config?.instance_name) {
            const sanitized = sanitizePhoneNumber(phone);
            if (sanitized.valid) {
              const baseUrl = config.base_url.replace(/\/+$/, "");

              // Get tenant name for personalized message
              const { data: tenantData } = await supabase
                .from("tenants")
                .select("name, settings")
                .eq("id", tenant_id)
                .single();
              const companyName = tenantData?.name || "nossa imobiliária";
              const tenantSettings = (tenantData?.settings as any) || {};

              // Get property title if available
              let propertyTitle = "";
              if (property_id) {
                const { data: propData } = await supabase
                  .from("properties")
                  .select("title")
                  .eq("id", property_id)
                  .single();
                if (propData?.title) {
                  propertyTitle = propData.title;
                }
              }

              // Build message from template or default
              let fullMessage: string;
              const customTemplate = tenantSettings.whatsapp_template;

              if (customTemplate && customTemplate.trim()) {
                fullMessage = customTemplate
                  .replace(/\{\{nome\}\}/g, name.trim())
                  .replace(/\{\{imovel\}\}/g, propertyTitle || "um de nossos imóveis")
                  .replace(/\{\{empresa\}\}/g, companyName)
                  .replace(/\{\{telefone\}\}/g, phone.trim())
                  .replace(/\{\{email\}\}/g, email?.trim() || "");
              } else {
                const propertyInfo = propertyTitle ? ` sobre o imóvel *${propertyTitle}*` : "";
                fullMessage = `Olá, ${name.trim()}! 👋\n\nRecebemos seu contato${propertyInfo} e ficamos muito felizes com seu interesse!\n\nEm breve, um de nossos especialistas entrará em contato para te ajudar.\n\nAtenciosamente,\n*${companyName}*`;
              }

              const res = await fetch(
                `${baseUrl}/message/sendText/${config.instance_name}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: config.api_key,
                  },
                  body: JSON.stringify({
                    number: sanitized.sanitized,
                    text: fullMessage,
                  }),
                }
              );

              whatsappStatus = res.ok ? "sent" : "failed";
            } else {
              whatsappStatus = "invalid_phone";
            }
          }
        } catch (e) {
          console.error("Evolution API error:", e);
          whatsappStatus = "error";
        }

        result = { success: true, id: data.id, whatsapp: whatsappStatus };
        break;
      }

      case "seed-defaults": {
        const { tenant_id } = body;
        if (!tenant_id) {
          return new Response(JSON.stringify({ error: "tenant_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Rate limit seed-defaults: 1 request every 10 seconds to prevent React Strict Mode duplicate inserts
        const { data: seedRateCheck } = await supabase.rpc("check_rate_limit", {
          _identifier: `seed-${tenant_id}`,
          _action_type: "seed-defaults",
          _max_requests: 1,
          _window_seconds: 10,
          _block_seconds: 10,
        });

        if (seedRateCheck && !seedRateCheck.allowed) {
          return new Response(JSON.stringify({ success: true, message: "Seed já executado recentemente" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify tenant exists
        const { data: tenantExists } = await supabase
          .from("tenants")
          .select("id")
          .eq("id", tenant_id)
          .maybeSingle();
        if (!tenantExists) {
          return new Response(JSON.stringify({ error: "Tenant inválido" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { count: typeCount, error: typeError } = await supabase
          .from("property_types")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant_id);

        if (typeError) throw typeError;

        if (typeCount === 0) {
          const types = [
            { name: "Apartamento", icon: "Building2", tenant_id, active: true },
            { name: "Casa", icon: "Home", tenant_id, active: true },
            { name: "Sala Comercial", icon: "Briefcase", tenant_id, active: true },
            { name: "Terreno", icon: "Map", tenant_id, active: true },
            { name: "Galpão", icon: "Warehouse", tenant_id, active: true },
            { name: "Cobertura", icon: "Building", tenant_id, active: true },
            { name: "Kitnet", icon: "DoorOpen", tenant_id, active: true },
            { name: "Chácara", icon: "Trees", tenant_id, active: true },
          ];
          const { error } = await supabase.from("property_types").insert(types);
          if (error) throw error;
        }

        const { count: amenityCount, error: amenityError } = await supabase
          .from("amenities")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant_id);

        if (amenityError) throw amenityError;

        if (amenityCount === 0) {
          const amenities = [
            { name: "Piscina", icon: "Waves", tenant_id },
            { name: "Academia", icon: "Dumbbell", tenant_id },
            { name: "Churrasqueira", icon: "Flame", tenant_id },
            { name: "Salão de Festas", icon: "PartyPopper", tenant_id },
            { name: "Playground", icon: "Baby", tenant_id },
            { name: "Sauna", icon: "Thermometer", tenant_id },
            { name: "Portaria 24h", icon: "Shield", tenant_id },
            { name: "Elevador", icon: "ArrowUpDown", tenant_id },
            { name: "Ar Condicionado", icon: "Snowflake", tenant_id },
            { name: "Garagem Coberta", icon: "Car", tenant_id },
            { name: "Jardim", icon: "TreePine", tenant_id },
            { name: "Lavanderia", icon: "WashingMachine", tenant_id },
            { name: "Coworking", icon: "Monitor", tenant_id },
            { name: "Bicicletário", icon: "Bike", tenant_id },
            { name: "Segurança 24h", icon: "ShieldCheck", tenant_id },
            { name: "Home Theater", icon: "Tv", tenant_id },
            { name: "Spa", icon: "Sparkles", tenant_id },
            { name: "Área Verde", icon: "Leaf", tenant_id },
          ];
          const { error } = await supabase.from("amenities").insert(amenities);
          if (error) throw error;
        }

        result = { success: true, message: "Dados padrão criados" };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("submit-contact error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
