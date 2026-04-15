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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }

  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function createAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function decryptPassword(encrypted: string): string {
  const key = SERVICE_ROLE_KEY.slice(0, 32);
  const decoded = atob(encrypted);
  let result = "";
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

async function getUserTenantAndRole(authHeader: string) {
  if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");

  const userClient = createUserClient(authHeader);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const { data: profile } = await userClient
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();
  if (!profile?.tenant_id) throw new Error("Unauthorized");

  const { data: roleData } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", profile.tenant_id)
    .single();
  if (!roleData || roleData.role !== "admin") throw new Error("Forbidden: admin only");

  return { userId: user.id, tenantId: profile.tenant_id };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const { tenantId, userId } = await getUserTenantAndRole(authHeader);
    const body = await req.json();
    const { action } = body;
    const supabase = createAdminClient();

    // === SEND: Create campaign and send emails ===
    if (action === "send") {
      const { subject, html_body, contact_ids } = body;

      if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Assunto é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!html_body || typeof html_body !== "string" || html_body.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Corpo do e-mail é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
        return new Response(JSON.stringify({ error: "Selecione ao menos um contato" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (contact_ids.length > 500) {
        return new Response(JSON.stringify({ error: "Máximo de 500 destinatários por envio" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load SMTP settings
      const { data: smtpSettings } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!smtpSettings || !smtpSettings.password_encrypted) {
        return new Response(JSON.stringify({ error: "Configure o SMTP antes de enviar e-mails" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch contacts
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id, name, email")
        .eq("tenant_id", tenantId)
        .in("id", contact_ids)
        .not("email", "is", null);

      if (contactsError) throw contactsError;
      if (!contacts || contacts.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum contato válido com e-mail encontrado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("email_campaigns")
        .insert({
          tenant_id: tenantId,
          subject,
          html_body,
          status: "sending",
          total_recipients: contacts.length,
          created_by: userId,
        })
        .select("id")
        .single();

      if (campaignError) throw campaignError;

      // Create recipients
      const recipients = contacts.map((c) => ({
        campaign_id: campaign.id,
        contact_id: c.id,
        email: c.email!,
        name: c.name,
        status: "pending",
      }));

      const { error: recipError } = await supabase
        .from("email_campaign_recipients")
        .insert(recipients);

      if (recipError) throw recipError;

      // Send emails via SMTP
      const password = decryptPassword(smtpSettings.password_encrypted);
      const nodemailer = await import("npm:nodemailer@6.9.16");

      const port = Number(smtpSettings.port);
      const secure = smtpSettings.encryption === "ssl" || port === 465;
      const requireTLS = smtpSettings.encryption === "tls" && !secure;

      const transporter = nodemailer.default.createTransport({
        host: smtpSettings.host,
        port,
        secure,
        requireTLS,
        auth: { user: smtpSettings.username, pass: password },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });

      let sentCount = 0;
      let failedCount = 0;

      for (const contact of contacts) {
        const personalizedHtml = html_body
          .replace(/\{\{nome_cliente\}\}/g, contact.name || "Cliente")
          .replace(/\{\{email_cliente\}\}/g, contact.email || "");

        try {
          await transporter.sendMail({
            from: `${smtpSettings.sender_name} <${smtpSettings.sender_email}>`,
            to: contact.email!,
            subject,
            html: personalizedHtml,
          });

          await supabase
            .from("email_campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("campaign_id", campaign.id)
            .eq("contact_id", contact.id);

          sentCount++;
        } catch (sendErr: unknown) {
          const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          await supabase
            .from("email_campaign_recipients")
            .update({ status: "failed", error_message: errMsg.slice(0, 500) })
            .eq("campaign_id", campaign.id)
            .eq("contact_id", contact.id);

          failedCount++;
        }
      }

      transporter.close();

      // Update campaign status
      await supabase
        .from("email_campaigns")
        .update({
          status: failedCount === contacts.length ? "failed" : "sent",
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq("id", campaign.id);

      return new Response(JSON.stringify({
        success: true,
        campaign_id: campaign.id,
        sent: sentCount,
        failed: failedCount,
        total: contacts.length,
        message: `Envio concluído: ${sentCount} enviados, ${failedCount} falhas de ${contacts.length} total.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === HISTORY: List campaigns ===
    if (action === "history") {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === RECIPIENTS: List recipients of a campaign ===
    if (action === "recipients") {
      const { campaign_id } = body;
      if (!campaign_id) {
        return new Response(JSON.stringify({ error: "campaign_id obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify campaign belongs to tenant
      const { data: camp } = await supabase
        .from("email_campaigns")
        .select("id")
        .eq("id", campaign_id)
        .eq("tenant_id", tenantId)
        .single();

      if (!camp) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("email_campaign_recipients")
        .select("*")
        .eq("campaign_id", campaign_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === CLEAR HISTORY: Delete all campaigns for tenant ===
    if (action === "clear_history") {
      // Recipients are cascade-deleted via FK
      const { error } = await supabase
        .from("email_campaigns")
        .delete()
        .eq("tenant_id", tenantId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Histórico limpo com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    const status = message === "Unauthorized" || message === "Forbidden: admin only" ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
