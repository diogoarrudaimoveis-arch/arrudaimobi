import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const ALLOWED_ORIGINS = [
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
  // Remove all non-numeric chars
  let digits = phone.replace(/\D/g, "");

  // If starts with +55, it was already included
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return { valid: true, sanitized: digits };
  }

  // 10 or 11 digits = DDD + number, add 55
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
    return { valid: true, sanitized: digits };
  }

  // Already 12 or 13 digits starting with 55
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return { valid: true, sanitized: digits };
  }

  return {
    valid: false,
    sanitized: digits,
    error: `Número inválido após sanitização: ${digits} (${digits.length} dígitos). Esperado: 12 ou 13 dígitos com DDI 55.`,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get tenant
    const { data: tenantId } = await supabase.rpc("get_user_tenant_id", { _user_id: user.id });
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Tenant não encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get evolution config
    const { data: config } = await supabase
      .from("evolution_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (action === "list-instances") {
      if (!config?.base_url || !config?.api_key) {
        return new Response(JSON.stringify({ error: "Evolution API não configurada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseUrl = config.base_url.replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
        headers: { apikey: config.api_key },
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Erro ao listar instâncias: ${errText}` }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const instances = await res.json();
      return new Response(JSON.stringify(instances), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-message") {
      const body = await req.json();
      const { phone, message, contact_id } = body;

      if (!phone || !message) {
        return new Response(JSON.stringify({ error: "Telefone e mensagem são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!config?.base_url || !config?.api_key || !config?.instance_name) {
        return new Response(JSON.stringify({ error: "Evolution API não configurada completamente" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sanitize phone
      const sanitized = sanitizePhoneNumber(phone);
      if (!sanitized.valid) {
        // Log failed attempt
        await supabase.from("messages").insert({
          tenant_id: tenantId,
          contact_id: contact_id || null,
          phone_raw: phone,
          phone_sanitized: sanitized.sanitized,
          message,
          status: "failed",
          error_message: sanitized.error,
          sent_by: user.id,
        });

        return new Response(JSON.stringify({ error: sanitized.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send via Evolution API
      const baseUrl = config.base_url.replace(/\/+$/, "");
      const instanceName = config.instance_name;

      let status = "sent";
      let errorMessage: string | null = null;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          const res = await fetch(
            `${baseUrl}/message/sendText/${instanceName}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: config.api_key,
              },
              body: JSON.stringify({
                number: sanitized.sanitized,
                text: message,
              }),
            }
          );

          if (res.ok) {
            status = "sent";
            errorMessage = null;
            break;
          } else {
            const errText = await res.text();
            status = "failed";
            errorMessage = `HTTP ${res.status}: ${errText}`;
            retries++;
            if (retries <= maxRetries) {
              await new Promise((r) => setTimeout(r, 1000 * retries));
            }
          }
        } catch (e) {
          status = "failed";
          errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
          retries++;
          if (retries <= maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * retries));
          }
        }
      }

      // Log message
      const { data: msgData, error: insertErr } = await supabase.from("messages").insert({
        tenant_id: tenantId,
        contact_id: contact_id || null,
        phone_raw: phone,
        phone_sanitized: sanitized.sanitized,
        message,
        status,
        error_message: errorMessage,
        sent_by: user.id,
      }).select("id").single();

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        id: msgData.id,
        status,
        phone_sanitized: sanitized.sanitized,
        error: errorMessage,
      }), {
        status: status === "sent" ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "clear-history") {
      // Check admin role
      const { data: isAdmin } = await supabase.rpc("has_tenant_role", {
        _user_id: user.id,
        _tenant_id: tenantId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores podem limpar o histórico" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await serviceClient
        .from("messages")
        .delete()
        .eq("tenant_id", tenantId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Histórico limpo com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
