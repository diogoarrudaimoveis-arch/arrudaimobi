/**
 * ZPRO Webhook Receiver — Supabase Edge Function
 * Block 6a: WhatsApp webhook receiver setup
 *
 * Receives incoming WhatsApp messages from ZPRO and:
 * 1. Logs them to the ZPRO webhook events table
 * 2. Triggers auto-reply based on keywords (Block 6b)
 *
 * ZPRO sends to:
 * https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741
 *
 * Supabase Edge Function URL (we use as intermediary):
 * https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/zpro-webhook
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://conv.techatende.com.br",
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
];

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zpro-signature",
    "Access-Control-Allow-Credentials": "true",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/** ZPRO webhook payload shape */
interface ZPROWebhookPayload {
  event?: "message" | "session_started" | "session_ended" | "status_update";
  phone?: string;
  from?: string;
  from_number?: string;
  message?: string;
  text?: string;
  body?: string;
  messageId?: string;
  id?: string;
  msg_id?: string;
  timestamp?: string;
  time?: string;
  created_at?: string;
  sessionId?: string;
  session_id?: string;
  contactName?: string;
  name?: string;
  contact_name?: string;
  source?: "whatsapp" | "web" | "api";
  mediaUrl?: string;
  [key: string]: unknown;
}

function normalizePhone(raw: string | undefined): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildAutoReply(message: string): string | null {
  const text = (message || "").toLowerCase().trim();

  if (text.includes("oi") || text.includes("olá") || text.includes("ola") || text === "hi" || text === "hey") {
    return (
      "Olá! 👋 Bem-vindo à *Arruda Imobi*!\n\n" +
      "Como posso ajudá-lo hoje?\n\n" +
      "🏠 *1* — Quero comprar ou alugar um imóvel\n" +
      "📋 *2* — Quero cadastrar meu imóvel\n" +
      "📅 *3* — Agendar uma visita\n" +
      "💬 *4* — Falar com um corretor"
    );
  }

  if (text === "1" || text.includes("comprar") || text.includes("alugar") || text.includes("imóvel") || text.includes("imovel")) {
    return (
      "Ótimo! 🏠\n\n" +
      "Temos diversos imóveis para você!\n\n" +
      "👉 https://www.arrudaimobi.com.br/imoveis\n\n" +
      "Use os filtros para encontrar o imóvel ideal. 😊"
    );
  }

  if (text === "2" || text.includes("cadastrar") || text.includes("vender") || text.includes("captar")) {
    return (
      "Quer vender ou alugar seu imóvel? 📈\n\n" +
      "É rápido e gratuito!\n\n" +
      "👉 https://www.arrudaimobi.com.br/captar-imovel\n\n" +
      "Nossa equipe entrará em contato em até 24h. 📞"
    );
  }

  if (text === "3" || text.includes("visita") || text.includes("agendar") || text.includes("horário")) {
    return (
      "Claro! 📅\n\n" +
      "Para agendar uma visita, acesse:\n" +
      "👉 https://www.arrudaimobi.com.br/contato\n\n" +
      "Ou ligue para nossa equipe: *(31) 99999-0000* 📞"
    );
  }

  if (text === "4" || text.includes("corretor") || text.includes("falar") || text.includes("atendente")) {
    return (
      "Nossos corretores estão prontos para ajudar! 👨‍💼\n\n" +
      "📞 *(31) 99999-0000*\n" +
      "💬 Ou responda aqui com sua dúvida!"
    );
  }

  if (text.includes("obrigad") || text.includes("valeu") || text.includes("thanks")) {
    return "Nós que agradecemos! 😊🧡\n\nQualquer dúvida, é só escrever novamente.";
  }

  if (text.includes("tchau") || text.includes("adeus") || text.includes("flw")) {
    return "Até logo! 👋🧡\n\nArruda Imobi — A sua imobiliária em Belo Horizonte.";
  }

  // Default: no keyword match
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let payload: ZPROWebhookPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabase();

    // Extract normalized fields
    const phone = normalizePhone(payload.phone || payload.from || payload.from_number);
    const message = String(payload.message || payload.text || payload.body || "");
    const messageId = String(
      payload.messageId || payload.id || payload.msg_id ||
      `zpro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    const event = payload.event || "message";
    const contactName = String(payload.contactName || payload.name || payload.contact_name || "");
    const sessionId = String(payload.sessionId || payload.session_id || "");
    const source = payload.source || "whatsapp";
    const mediaUrl = payload.mediaUrl as string | undefined;

    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find tenant (Arruda Imobi hardcoded for now)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", "arruda-imobi")
      .maybeSingle();

    const tenantId = tenant?.id || "00000000-0000-0000-0000-000000000000";

    // Upsert contact
    if (phone && contactName) {
      await supabase.from("contacts").upsert(
        {
          tenant_id: tenantId,
          phone,
          name: contactName,
          last_contact_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,phone" }
      ).select("id");
    }

    // Log webhook event to zpro_webhook_events table (idempotent — insert only if not exists by messageId)
    const { error: logError } = await supabase
      .from("zpro_webhook_events")
      .upsert(
        {
          tenant_id: tenantId,
          phone,
          contact_name: contactName || null,
          event_type: event,
          message_id: messageId,
          message: message || null,
          session_id: sessionId || null,
          source,
          media_url: mediaUrl || null,
          raw_payload: JSON.parse(rawBody),
          received_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_id,message_id",
          ignoreDuplicates: true,
        }
      );

    if (logError) {
      console.error("[zpro-webhook] Failed to log event:", logError.message);
    }

    // ── Auto-reply logic (Block 6b) ───────────────────────────────────────
    if (message && event === "message") {
      const replyText = buildAutoReply(message);

      if (replyText) {
        // Send reply via Evolution API (which is already configured in send-message function)
        const { data: config } = await supabase
          .from("evolution_config")
          .select("base_url, api_key, instance_name")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (config?.base_url && config?.api_key && config?.instance_name) {
          const baseUrl = config.base_url.replace(/\/+$/, "");
          const instanceName = config.instance_name;

          // Fire-and-forget — don't block the webhook response
          fetch(`${baseUrl}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: config.api_key,
            },
            body: JSON.stringify({
              number: phone,
              text: replyText,
            }),
          }).catch((err) => console.error("[zpro-webhook] Auto-reply failed:", err));
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, event, messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[zpro-webhook] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});