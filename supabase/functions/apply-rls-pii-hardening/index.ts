// Final fix for owners and user_roles recursion
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const sqlCommands = [
  // Drop the recursive owners policy
  `DROP POLICY IF EXISTS "owners_tenant_modify" ON public.owners`,
  // Drop the recursive user_roles admin policy
  `DROP POLICY IF EXISTS "user_roles_admin_modify" ON public.user_roles`,
  // Recreate using SECURITY DEFINER function (no recursion)
  // For user_roles admin operations, we need to check user's role WITHOUT recursing
  // Use a SECURITY DEFINER function that bypasses RLS
  `CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$ SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1 $$`,
  // Now user_roles admin: user must be admin/developer (using get_my_role)
  `CREATE POLICY "user_roles_admin_modify" ON public.user_roles FOR ALL USING (auth.uid() IS NOT NULL AND public.get_my_role() IN ('admin', 'developer'))`,
  // owners modify: must be admin/developer of same tenant
  `CREATE POLICY "owners_tenant_modify" ON public.owners FOR ALL USING (auth.uid() IS NOT NULL AND tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'developer'))`,
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!databaseUrl) {
    return new Response(JSON.stringify({ success: false, error: "No SUPABASE_DB_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let client: Client;
  try {
    client = new Client(databaseUrl);
    await client.connect();
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: string[] = [];
  for (const sql of sqlCommands) {
    try {
      await client.queryObject(sql);
      results.push(`OK: ${sql.substring(0, 70)}`);
    } catch (e) {
      results.push(`FAIL: ${(e as Error).message} | ${sql.substring(0, 70)}`);
    }
  }

  await client.end();

  return new Response(JSON.stringify({ success: true, results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});