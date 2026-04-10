import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's tenant_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    // In this multi-tenant app, it's safer to get the tenant_id through a function
    const { data: tenantId } = await supabaseClient.rpc('get_user_tenant_id', { user_id: user.id });

    // Fetch AI Settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('tenant_ai_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (settingsError || !settings) {
      throw new Error("Configurações de IA não encontradas para esta imobiliária.");
    }

    const { prompt, context, feature } = await req.json();

    const providersOrder = ['openai', 'gemini', 'groq'];
    // Reorder based on primary provider
    const primary = settings.primary_provider || 'openai';
    const sortedProviders = [primary, ...providersOrder.filter(p => p !== primary)];

    let result = null;
    let usedProvider = null;

    for (const provider of sortedProviders) {
      const key = settings[`${provider}_key`];
      if (!key) continue;

      try {
        if (provider === 'openai') {
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'system', content: 'Você é um corretor de imóveis especialista em marketing.' }, { role: 'user', content: `${prompt}\nContexto: ${JSON.stringify(context)}` }],
              max_tokens: 1000,
            }),
          });
          const data = await resp.json();
          if (data.choices?.[0]?.message?.content) {
            result = data.choices[0].message.content;
            usedProvider = 'openai';
            // Log usage
            await supabaseClient.from('ai_usage_logs').insert({
                tenant_id: tenantId,
                provider: 'openai',
                prompt_tokens: data.usage?.prompt_tokens,
                completion_tokens: data.usage?.completion_tokens,
                total_tokens: data.usage?.total_tokens,
                feature_used: feature || 'unknown'
            });
            break;
          }
        } 
        
        if (provider === 'gemini') {
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${prompt}\nContexto: ${JSON.stringify(context)}` }] }],
            }),
          });
          const data = await resp.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            result = data.candidates[0].content.parts[0].text;
            usedProvider = 'gemini';
             await supabaseClient.from('ai_usage_logs').insert({
                tenant_id: tenantId,
                provider: 'gemini',
                feature_used: feature || 'unknown'
            });
            break;
          }
        }

        if (provider === 'groq') {
           const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama3-8b-8192',
              messages: [{ role: 'user', content: `${prompt}\nContexto: ${JSON.stringify(context)}` }],
            }),
          });
          const data = await resp.json();
          if (data.choices?.[0]?.message?.content) {
            result = data.choices[0].message.content;
            usedProvider = 'groq';
             await supabaseClient.from('ai_usage_logs').insert({
                tenant_id: tenantId,
                provider: 'groq',
                prompt_tokens: data.usage?.prompt_tokens,
                completion_tokens: data.usage?.completion_tokens,
                total_tokens: data.usage?.total_tokens,
                feature_used: feature || 'unknown'
            });
            break;
          }
        }
      } catch (err) {
        console.error(`Error with provider ${provider}:`, err);
        continue;
      }
    }

    if (!result) {
      throw new Error("Nenhum provedor de IA disponível ou configurado corretamente.");
    }

    return new Response(JSON.stringify({ content: result, provider: usedProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
