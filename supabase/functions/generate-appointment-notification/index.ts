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

interface AppointmentPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: any;
  old_record: any | null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: AppointmentPayload = await req.json();
    const appointment = payload.record;

    // 1. Fetch broker info
    const { data: broker } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", appointment.assigned_to)
      .single();

    if (!broker || !broker.phone) {
      console.log("Broker phone not found, skipping notification.");
      return new Response(JSON.stringify({ message: "No broker phone" }), { status: 200 });
    }

    // 2. Fetch property info if any
    let propertyCode = "";
    if (appointment.property_id) {
       const { data: prop } = await supabase
        .from("properties")
        .select("property_code")
        .eq("id", appointment.property_id)
        .single();
       if (prop) propertyCode = prop.property_code;
    }

    // 3. Format Message
    const startTime = new Date(appointment.start_time).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isUpdate = payload.type === 'UPDATE';
    const actionLabel = isUpdate ? "ALTERADO" : "CRIADO";

    const message = `🔔 *AGENDAMENTO ${actionLabel}*\n\nOlá ${broker.full_name}, você tem um compromisso:\n\n📌 *Tipo:* ${appointment.type}\n📝 *Título:* ${appointment.title}\n📅 *Data/Hora:* ${startTime}\n🏠 *Imóvel:* ${propertyCode || "N/A"}\n🎯 *Prioridade:* ${appointment.priority}\n\n📍 Verifique os detalhes no painel Administrativo.`;

    // 4. Send to Evolution API
    // Note: Assuming Evolution API credentials are in env or tenant settings.
    // Here we use a generic internal fetch pattern.
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (EVOLUTION_API_URL && EVOLUTION_API_KEY && INSTANCE_NAME) {
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: broker.phone.replace(/\D/g, ""), // Clean non-digits
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: false,
          },
          textMessage: {
            text: message,
          },
        }),
      });

      const result = await response.json();
      console.log("Evolution API Result:", result);
    } else {
      console.warn("Evolution API credentials missing. Notification message generated but not sent.");
      console.log("Message Content:", message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing appointment notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
