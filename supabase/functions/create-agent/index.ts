import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) throw new Error("Não autorizado");

    // Get caller's tenant
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!callerProfile?.tenant_id) throw new Error("Tenant não encontrado");

    // Check admin role
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("tenant_id", callerProfile.tenant_id)
      .maybeSingle();
    if (callerRole?.role !== "admin") throw new Error("Apenas admins podem gerenciar usuários");

    const body = await req.json();
    const { action = "create", userId, email, password, full_name, phone, role, avatar_url } = body;

    const tenantId = callerProfile.tenant_id;

    if (action === "update") {
      if (!userId) throw new Error("ID do usuário é obrigatório para atualização");

      // Check if user belongs to the same tenant
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      
      if (!targetProfile) throw new Error("Usuário não encontrado ou pertence a outro tenant");

      // Update Auth (Email and Metadata)
      const updateAuthData: any = {};
      if (email) updateAuthData.email = email;
      
      // Sync full_name and avatar_url to Auth metadata for consistency
      updateAuthData.user_metadata = { 
        full_name: full_name || undefined,
        avatar_url: avatar_url || undefined
      };
      
      const { error: authUpErr } = await supabase.auth.admin.updateUserById(userId, updateAuthData);
      if (authUpErr) throw authUpErr;

      // Update Profile Table
      const profileUpdates: any = {};
      if (full_name) profileUpdates.full_name = full_name;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profUpErr } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", userId)
          .eq("tenant_id", tenantId);
        if (profUpErr) throw profUpErr;
      }

      // Update Role Table
      if (role) {
        const { error: roleUpErr } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId)
          .eq("tenant_id", tenantId);
        if (roleUpErr) throw roleUpErr;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: Create action
    if (!email || !password) throw new Error("Email e senha são obrigatórios para novos usuários");
    if (password.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres");

    const validRoles = ["admin", "agent", "user"];
    const finalRole = validRoles.includes(role) ? role : "agent";

    // Create user via admin API
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: full_name || email,
        avatar_url: avatar_url || undefined
      },
    });
    if (createErr) throw createErr;

    const newUserId = newUser.user.id;

    // The handle_new_user trigger creates profile and role automatically,
    // but we need to update/verify them for the correct tenant context
    if (finalRole !== "user") {
      await supabase
        .from("user_roles")
        .update({ role: finalRole })
        .eq("user_id", newUserId)
        .eq("tenant_id", tenantId);
    }

    const initialProfileUpdates: any = { tenant_id: tenantId };
    if (phone) initialProfileUpdates.phone = phone;
    if (avatar_url) initialProfileUpdates.avatar_url = avatar_url;

    await supabase
      .from("profiles")
      .update(initialProfileUpdates)
      .eq("user_id", newUserId);

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-agent error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
