import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
  "https://www.arrudaimobi.com.br"
];

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Private-Network": "true",
  };
  if (origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.includes("localhost") || 
    origin.includes("127.0.0.1") ||
    origin.endsWith(".vercel.app")
  )) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const method = req.method;
  const corsHeaders = getCorsHeaders(origin);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let tenantId: string | null = null;
  let settings: any = null;
  let aiSettings: any = null;

  const mask = (s: any): any => {
    if (s === null || s === undefined) return "null";
    if (Array.isArray(s)) return s.map(mask);
    if (typeof s === 'string') {
       if (s.length > 10) return `${s.slice(0, 5)}...${s.slice(-5)}`;
       return "***";
    }
    return s;
  };

  try {
    const body = await req.json();
    tenantId = body.tenant_id;
    console.log(`[INBOUND] Request for tenant: ${tenantId}`);
    const { tone, context, forced_provider } = body;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: settingsArray, error: settingsError } = await supabaseClient
      .from('tenant_ai_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (settingsError) throw new Error(`Query error: ${settingsError.message}`);
    settings = settingsArray && settingsArray.length > 0 ? settingsArray[0] : null;

    if (!settings) throw new Error("Configurações não encontradas para o tenant.");

    const parseKeys = (val: any): string[] => {
      if (Array.isArray(val)) return val.filter(k => typeof k === 'string' && k.trim() !== '');
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : (val.trim() ? [val] : []);
        } catch {
          return val.trim() ? [val] : [];
        }
      }
      return [];
    };

    aiSettings = {
      openai_keys: [...parseKeys(settings.openai_keys), ...parseKeys(settings.openai_key)],
      gemini_keys: [...parseKeys(settings.gemini_keys), ...parseKeys(settings.gemini_key)],
      groq_keys: [...parseKeys(settings.groq_keys), ...parseKeys(settings.groq_key)],
      primary_provider: settings.primary_provider || 'openai',
    };

    let apiErrors: any[] = [];

    const tryProvider = async (provider: string) => {
      const keys = aiSettings[`${provider}_keys` as keyof typeof aiSettings] as string[];
      if (!keys || keys.length === 0) {
        console.warn(`[WARN] No keys found for provider: ${provider}`);
        apiErrors.push({ provider, message: "Nenhuma chave configurada." });
        return null;
      }
      const key = keys[0];

      try {
        if (provider === 'gemini') {
          console.log(`[EXEC] Using Gemini (Key: ${mask(key)})`);
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${tone || ''}\n\nDescreva este imóvel de forma profissional e persuasiva: ${JSON.stringify(context)}` }] }] })
          });
          const json = await resp.json();
          if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
          return { content: json.candidates?.[0]?.content?.parts?.[0]?.text };
        }
        
        if (provider === 'groq') {
          console.log(`[EXEC] Using Groq (Key: ${mask(key)})`);
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              model: 'llama-3.1-8b-instant', 
              messages: [{ role: 'user', content: `Gere uma descrição profissional para este imóvel: ${JSON.stringify(context)}. Tom: ${tone}.` }] 
            })
          });
          const json = await resp.json();
          if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
          return { content: json.choices?.[0]?.message?.content };
        }

        if (provider === 'openai') {
          console.log(`[EXEC] Using OpenAI (Key: ${mask(key)})`);
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: `Gere uma descrição profissional para este imóvel: ${JSON.stringify(context)}. Tom: ${tone}.` }]
            })
          });
          const json = await resp.json();
          if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
          return { content: json.choices?.[0]?.message?.content };
        }
        return null;
      } catch (err: any) {
        console.error(`[ERROR] Provider ${provider} failed:`, err.message);
        apiErrors.push({ provider, message: err.message });
        return null; 
      }
    };

    let finalContent = null;
    let finalProvider = null;

    if (forced_provider && forced_provider !== 'auto') {
      const res = await tryProvider(forced_provider);
      if (res) { 
        finalContent = res.content; 
        finalProvider = forced_provider; 
      } else {
        throw new Error(`O provedor escolhido (${forced_provider.toUpperCase()}) falhou. Erro Interno API: ${JSON.stringify(apiErrors)}`);
      }
    } else {
      const primary = aiSettings.primary_provider;
      const providersOrder = [primary, ...['openai', 'gemini', 'groq'].filter(p => p !== primary)];
      console.log(`[FALLBACK] Order: ${providersOrder.join(' -> ')}`);

      for (const p of providersOrder) {
        const res = await tryProvider(p);
        if (res) { 
          finalContent = res.content; 
          finalProvider = p; 
          break; 
        }
      }
    }

    if (!finalContent) throw new Error(`Todas as tentativas falharam. Erros da API: ${JSON.stringify(apiErrors)}`);

    return new Response(JSON.stringify({ content: finalContent, provider: finalProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[CRITICAL] ${error.message}`);
    const maskStr = (s: any) => (typeof s === 'string' && s.length > 5) ? `${s.slice(0,3)}...` : '***';
    return new Response(JSON.stringify({ 
      error: error.message,
      debug: {
        tenant: tenantId,
        settings: settings ? Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, k.includes('key') ? maskStr(v) : v])) : null,
        counts: aiSettings ? {
          openai: aiSettings.openai_keys.length,
          gemini: aiSettings.gemini_keys.length,
          groq: aiSettings.groq_keys.length
        } : null
      }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
