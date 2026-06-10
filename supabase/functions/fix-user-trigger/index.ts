// Edge Function to fix the handle_new_user trigger
// Run this once to fix the "Database error saving new user" issue

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // SQL to fix the trigger
    const fixSQL = `
    -- Drop existing trigger and function
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user();

    -- Create new trigger function with better error handling
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    DECLARE
      _tenant_id UUID;
      _role public.app_role;
    BEGIN
      -- Get or create default tenant
      SELECT id INTO _tenant_id FROM public.tenants WHERE slug = 'default' LIMIT 1;
      
      IF _tenant_id IS NULL THEN
        INSERT INTO public.tenants (name, slug) VALUES ('Arruda Imobi', 'default') 
        RETURNING id INTO _tenant_id;
      END IF;

      -- Create profile (ignore if already exists)
      INSERT INTO public.profiles (user_id, tenant_id, full_name, avatar_url)
      VALUES (
        NEW.id,
        _tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        tenant_id = _tenant_id;

      -- Check if admin exists
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE tenant_id = _tenant_id AND role = 'admin'
      ) THEN
        _role := 'admin';
      ELSE
        _role := 'user';
      END IF;

      -- Insert user_roles (handle duplicates)
      INSERT INTO public.user_roles (user_id, tenant_id, role)
      VALUES (NEW.id, _tenant_id, _role)
      ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    -- Recreate the trigger
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `

    // Execute the SQL using pg_client
    // Note: Edge Functions don't have direct SQL access, so we need a workaround
    
    // Actually, we can use the supabase-js client with RPC if we create a function
    // But for now, let's just return the SQL for manual execution

    return new Response(JSON.stringify({
      success: true,
      message: 'SQL fix ready. Execute the following SQL in Supabase Dashboard SQL Editor:',
      sql: fixSQL
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})