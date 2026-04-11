import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// Simple XOR-based obfuscation for password storage
function encryptPassword(plain: string): string {
  const key = SERVICE_ROLE_KEY.slice(0, 32);
  let result = "";
  for (let i = 0; i < plain.length; i++) {
    result += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
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

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUserTenantAndRole(authHeader: string) {
  if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");

  const userClient = createUserClient(authHeader);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();
  if (profileError || !profile?.tenant_id) throw new Error("Unauthorized");

  const { data: roleData, error: roleError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", profile.tenant_id)
    .single();
  if (roleError || !roleData) throw new Error("Unauthorized");
  if (roleData.role !== "admin") throw new Error("Forbidden: admin only");

  return { userId: user.id, tenantId: profile.tenant_id };
}

async function sendEmailViaSMTP(
  settings: any,
  password: string,
  to: string,
  subject: string,
  html: string,
) {
  const nodemailer = await import("npm:nodemailer@6.9.16");
  const port = Number(settings.port);
  const secure = settings.encryption === "ssl" || port === 465;
  const requireTLS = settings.encryption === "tls" && !secure;

  const transporter = nodemailer.default.createTransport({
    host: settings.host,
    port,
    secure,
    requireTLS,
    auth: { user: settings.username, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `${settings.sender_name} <${settings.sender_email}>`,
    to,
    subject,
    html,
  });

  transporter.close();
  return info;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createAdminClient();

    // ==========================================
    // PUBLIC ACTIONS (no auth required)
    // ==========================================

    if (action === "send-reset-email") {
      const { email } = body;

      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return new Response(JSON.stringify({ error: "Email inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";

      const { data: rateCheck } = await supabase.rpc("check_rate_limit", {
        _identifier: clientIp,
        _action_type: "auth-reset-password",
        _max_requests: 3,
        _window_seconds: 60,
        _block_seconds: 600,
      });

      if (rateCheck && !rateCheck.allowed) {
        return new Response(JSON.stringify({
          error: "Muitas tentativas. Aguarde antes de tentar novamente.",
          retry_after: rateCheck.retry_after,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retry_after) },
        });
      }

      const successResponse = () =>
        new Response(JSON.stringify({ success: true, message: "Se o email existir, um link de recuperação será enviado." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        console.error("Error listing users:", listErr);
        return successResponse();
      }

      const user = users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
      if (!user) return successResponse();

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.tenant_id) return successResponse();

      const { data: smtpSettings } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();

      if (!smtpSettings?.password_encrypted || !smtpSettings?.host) {
        console.log("No SMTP configured, falling back to native recovery email");
        return new Response(JSON.stringify({ success: true, fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("password_reset_tokens")
        .update({ used: true } as any)
        .eq("email", cleanEmail)
        .eq("used", false);

      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const { error: tokenErr } = await supabase
        .from("password_reset_tokens")
        .insert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          email: cleanEmail,
          token,
          expires_at: expiresAt.toISOString(),
        } as any);

      if (tokenErr) {
        console.error("Error creating token:", tokenErr);
        return new Response(JSON.stringify({ success: true, fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const originHeader = req.headers.get("origin");
      const referer = req.headers.get("referer");
      const origin = originHeader || (referer ? new URL(referer).origin : "");
      const resetUrl = `${origin}/#/reset-password?token=${token}`;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, settings")
        .eq("id", profile.tenant_id)
        .single();

      const tenantName = tenant?.name || "Sua Imobiliária";
      const tenantSettings = (tenant?.settings as any) || {};
      const primaryColor = tenantSettings.primary_color || "#2563EB";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: ${primaryColor}; margin-bottom: 8px; text-align: center;">🔑 Recuperação de Senha</h2>
            <p style="color: #374151; text-align: center; margin-bottom: 24px;">${tenantName}</p>
            <p style="color: #4b5563;">Olá,</p>
            <p style="color: #4b5563;">Recebemos uma solicitação para redefinir a senha da sua conta associada a este email.</p>
            <p style="color: #4b5563;">Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background-color: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Redefinir Minha Senha
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="color: ${primaryColor}; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">⏰ Este link expira em 30 minutos.</p>
            <p style="color: #9ca3af; font-size: 12px;">Se você não solicitou a redefinição de senha, ignore este email. Sua senha não será alterada.</p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">— ${tenantName}</p>
          </div>
        </body>
        </html>
      `;

      try {
        const smtpPassword = decryptPassword(smtpSettings.password_encrypted);
        await sendEmailViaSMTP(
          smtpSettings,
          smtpPassword,
          cleanEmail,
          `Recuperação de Senha - ${tenantName}`,
          emailHtml,
        );
        console.log("Password reset email sent", JSON.stringify({ email: cleanEmail, tenant_id: profile.tenant_id }));
        return successResponse();
      } catch (smtpErr) {
        console.error("SMTP send error:", smtpErr instanceof Error ? smtpErr.message : String(smtpErr));
        return new Response(JSON.stringify({ success: true, fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "verify-reset-token") {
      const { token } = body;

      if (!token || typeof token !== "string" || token.length !== 64) {
        return new Response(JSON.stringify({ valid: false, error: "Token inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenData } = await supabase
        .from("password_reset_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!tokenData) {
        return new Response(JSON.stringify({ valid: false, error: "Token inválido ou expirado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ valid: true, email: tokenData.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset-password") {
      const { token, password } = body;

      if (!token || typeof token !== "string" || token.length !== 64) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!password || typeof password !== "string" || password.length < 8) {
        return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";

      const { data: rateCheck } = await supabase.rpc("check_rate_limit", {
        _identifier: clientIp,
        _action_type: "reset-password-submit",
        _max_requests: 5,
        _window_seconds: 300,
        _block_seconds: 600,
      });

      if (rateCheck && !rateCheck.allowed) {
        return new Response(JSON.stringify({
          error: "Muitas tentativas. Aguarde antes de tentar novamente.",
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find and validate token
      const { data: tokenData } = await supabase
        .from("password_reset_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!tokenData) {
        return new Response(JSON.stringify({ error: "Token inválido ou expirado. Solicite um novo link." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update user password via admin API
      const { error: updateErr } = await supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { password },
      );

      if (updateErr) {
        console.error("Error updating password:", updateErr);
        return new Response(JSON.stringify({ error: "Erro ao redefinir senha. Tente novamente." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as used
      await supabase
        .from("password_reset_tokens")
        .update({ used: true } as any)
        .eq("id", tokenData.id);

      // Invalidate all other tokens for this email
      await supabase
        .from("password_reset_tokens")
        .update({ used: true } as any)
        .eq("email", tokenData.email)
        .eq("used", false);

      return new Response(JSON.stringify({ success: true, message: "Senha redefinida com sucesso!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // AUTHENTICATED ACTIONS (admin only)
    // ==========================================

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const { tenantId, userId } = await getUserTenantAndRole(authHeader);

    if (action === "load") {
      const { data, error } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        return new Response(JSON.stringify({
          ...data,
          password_encrypted: undefined,
          has_password: !!data.password_encrypted,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const {
        host, port, username, password, encryption,
        sender_email, sender_name,
        product_email_subject, product_email_html,
      } = body;

      if (!host || !port || !username || !sender_email || !sender_name) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const upsertData: Record<string, unknown> = {
        tenant_id: tenantId,
        host,
        port: Number(port),
        username,
        encryption: encryption || "tls",
        sender_email,
        sender_name,
        product_email_subject: product_email_subject || null,
        product_email_html: product_email_html || null,
        updated_at: new Date().toISOString(),
      };

      if (password && password.trim() !== "") {
        upsertData.password_encrypted = encryptPassword(password);
      }

      const { data: existing } = await supabase
        .from("smtp_settings")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("smtp_settings")
          .update(upsertData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        if (!password || password.trim() === "") {
          return new Response(JSON.stringify({ error: "Senha SMTP é obrigatória na primeira configuração" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        upsertData.password_encrypted = encryptPassword(password);
        const { error } = await supabase
          .from("smtp_settings")
          .insert(upsertData);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentTests, error: rlError } = await supabase
        .from("smtp_test_rate_limits")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("sent_at", fiveMinAgo);

      if (rlError) console.error("Rate limit check error:", rlError);

      if (recentTests && recentTests.length >= 3) {
        return new Response(JSON.stringify({
          error: "Limite atingido: máximo 3 e-mails de teste a cada 5 minutos. Tente novamente em breve.",
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!settings || !settings.password_encrypted) {
        return new Response(JSON.stringify({ error: "Salve as configurações SMTP primeiro" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const smtpPassword = decryptPassword(settings.password_encrypted);
      const testEmail = body.test_email || settings.sender_email;

      try {
        await sendEmailViaSMTP(
          settings,
          smtpPassword,
          testEmail,
          "E-mail de Teste - Configuração SMTP",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563EB;">✅ Configuração SMTP Funcionando!</h2>
              <p>Este é um e-mail de teste enviado pelo seu sistema.</p>
              <p>Se você recebeu este e-mail, sua configuração SMTP está correta.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Servidor: ${settings.host}:${settings.port} (${settings.encryption})</p>
            </div>
          `,
        );

        await supabase.from("smtp_test_rate_limits").insert({
          tenant_id: tenantId,
          user_id: userId,
        });

        return new Response(JSON.stringify({ success: true, message: `E-mail de teste enviado para ${testEmail}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (smtpError: unknown) {
        const errMsg = smtpError instanceof Error ? smtpError.message : String(smtpError);
        return new Response(JSON.stringify({ error: `Falha na conexão SMTP: ${errMsg}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    const status = message === "Unauthorized" || message === "Forbidden: admin only" ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
