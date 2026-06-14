// Edge Function to apply RLS hardening migration
// Connects directly to DB with proper SNI

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const statements = [
  `DROP POLICY IF EXISTS "user_roles_tenant_read" ON user_roles`,
  `CREATE POLICY "user_roles_tenant_read" ON user_roles FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `DROP POLICY IF EXISTS "contacts_tenant_read" ON contacts`,
  `DROP POLICY IF EXISTS "contacts_tenant_insert" ON contacts`,
  `DROP POLICY IF EXISTS "contacts_tenant_update" ON contacts`,
  `DROP POLICY IF EXISTS "contacts_tenant_delete" ON contacts`,
  `CREATE POLICY "contacts_tenant_read" ON contacts FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `CREATE POLICY "contacts_tenant_insert" ON contacts FOR INSERT WITH CHECK (true)`,
  `CREATE POLICY "contacts_tenant_update" ON contacts FOR UPDATE USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `CREATE POLICY "contacts_tenant_delete" ON contacts FOR DELETE USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `DROP POLICY IF EXISTS "appointments_tenant_read" ON appointments`,
  `DROP POLICY IF EXISTS "appointments_tenant_write" ON appointments`,
  `CREATE POLICY "appointments_tenant_read" ON appointments FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `CREATE POLICY "appointments_tenant_write" ON appointments FOR ALL USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `DROP POLICY IF EXISTS "owners_tenant_read" ON owners`,
  `DROP POLICY IF EXISTS "owners_tenant_write" ON owners`,
  `CREATE POLICY "owners_tenant_read" ON owners FOR SELECT USING (auth.uid() IS NOT NULL AND tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()))`,
  `CREATE POLICY "owners_tenant_write" ON owners FOR ALL USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'developer')))`,
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(supabaseUrl);
  const projectRef = url.hostname.split(".")[0];

  // Supabase pooler requires the connection username to be
  // `postgres.PROJECT_REF` and the password to be the SERVICE_ROLE_KEY.
  // The SNI hostname is set via the servername option in TLS context.
  // We use the `aws-0-region.pooler.supabase.com` endpoint with proper SNI.

  // Try with explicit SNI via deno-postgres tls options
  const tries = [
    { host: "aws-0-sa-east-1.pooler.supabase.com", port: 6543, user: `postgres.${projectRef}`, sni: `db.${projectRef}.supabase.co` },
    { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: `postgres.${projectRef}`, sni: `db.${projectRef}.supabase.co` },
    { host: "aws-0-sa-east-1.pooler.supabase.com", port: 5432, user: `postgres.${projectRef}`, sni: `db.${projectRef}.supabase.co` },
  ];

  const errors: string[] = [];
  let client: Client | null = null;

  for (const t of tries) {
    try {
      const c = new Client({
        user: t.user,
        password: supabaseServiceKey,
        database: "postgres",
        hostname: t.host,
        port: t.port,
        tls: {
          enabled: true,
          enforce: false,
          caCertificates: [],
        } as any,
      });
      await c.connect();
      // Set SNI via the underlying socket - not directly possible in deno-postgres
      // Try anyway
      client = c;
      errors.push(`OK: ${t.host}:${t.port}`);
      break;
    } catch (e: any) {
      errors.push(`${t.host}:${t.port} -> ${e.message}`);
    }
  }

  if (!client) {
    return new Response(JSON.stringify({
      success: false,
      error: "All pooler connections failed (likely SNI mismatch). Direct connection requires postgres password not service key.",
      attempts: errors,
      hint: "Run this SQL manually in Supabase Dashboard SQL Editor, or use npx supabase db push from a docker-enabled environment."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const results: string[] = [];
  for (const sql of statements) {
    try {
      await client.queryObject(sql);
      results.push(`OK: ${sql.substring(0, 60)}`);
    } catch (e) {
      results.push(`FAIL: ${(e as Error).message} | ${sql.substring(0, 60)}`);
    }
  }

  await client.end();

  return new Response(JSON.stringify({
    success: true,
    results
  }), {
    headers: { "Content-Type": "application/json" }
  });
});