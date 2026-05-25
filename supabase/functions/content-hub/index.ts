/**
 * Content Hub — Supabase Edge Function v2
 * All working APIs: OmniRoute (LLM) + Pollinations AI (images) + Browser TTS
 *
 * Actions:
 *  - generate          → text + images via OmniRoute + Pollinations
 *  - generate-image    → Pollinations AI image URL
 *  - get-history       → content_generations table
 *  - health            → provider status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Config ──────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
];

// OmniRoute — internal LLM router (works for text)
const OMNI_KEY = Deno.env.get("OMNIROUTE_API_KEY") || "sk-611d5b3c2cca0507-7a32b3-0e17b59f";
const OMNI_BASE = Deno.env.get("OMNIROUTE_BASE") || "http://206.183.129.200:20128/v1";

// ─── CORS ───────────────────────────────────────────────────────────────────

function getCors(origin: string | null) {
  const h = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...h, "Access-Control-Allow-Origin": origin };
  }
  return { ...h, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
}

function getSupabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// ─── JSON Parser ───────────────────────────────────────────────────────────

function parseJson(text: string): any {
  try {
    const m = text.match(/```json\n?([\s\S]*?)```/) || text.match(/```\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    return JSON.parse(m ? m[1] || m[0] : text);
  } catch { return null; }
}

// ─── OmniRoute LLM (text generation) ────────────────────────────────────────

async function omniChat(messages: { role: string; content: string }[], maxTokens = 2048) {
  const res = await fetch(`${OMNI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNI_KEY}` },
    body: JSON.stringify({ model: "MiniMax-M2.7", messages, max_tokens: maxTokens, temperature: 0.75 }),
  });
  if (!res.ok) throw new Error(`OmniRoute ${res.status}: ${await res.text()}`);
  const body = await res.text();
  const json = parseJson(body);
  if (!json) throw new Error("Empty response from OmniRoute");
  return json.choices?.[0]?.message?.content || "";
}

// ─── Pollinations AI (free image generation) ────────────────────────────────

function pollinationsImage(prompt: string, width = 1024, height = 1024): string {
  const enc = encodeURIComponent(prompt.slice(0, 900));
  return `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&nologo=true&seed=${Date.now() % 9999}`;
}

// ─── Prompt Builders ────────────────────────────────────────────────────────

const TONE_MAP: Record<string, string> = {
  professional: "Descrição técnica clara e dados objetivos. Tom confiável e profissional.",
  luxury: "Tom sofisticado e premium. Palavras: exclusivo, privilégio, único, refinado.",
  family: "Tom acolhedor e familiar. Espaço, segurança, comunidade, vida em família.",
  urgent: "Tom urgente e persuasivo. Escassez, oportunidade única, última chance, não perca.",
  modern: "Tom moderno e minimalista. Design limpo, linguagem contemporânea.",
};

function propContext(p: any, imgs: string[]): string {
  if (!p) return "";
  const im = imgs?.length ? `\nFOTOS: ${imgs.join(", ")}` : "";
  return [
    p.title && `TÍTULO: ${p.title}`,
    p.type && `TIPO: ${p.type}`,
    p.city && `CIDADE: ${p.city}`,
    p.neighborhood && `BAIRRO: ${p.neighborhood}`,
    p.price && `PREÇO: R$ ${Number(p.price).toLocaleString("pt-BR")}`,
    p.bedrooms && `DORMITÓRIOS: ${p.bedrooms}`,
    p.bathrooms && `BANHEIROS: ${p.bathrooms}`,
    p.garages && `VAGAS: ${p.garages}`,
    p.area && `ÁREA: ${p.area}m²`,
    p.description && `DESCRIÇÃO: ${p.description}`,
    p.amenities?.length && `COMODIDADES: ${p.amenities.join(", ")}`,
    im,
  ].filter(Boolean).join("\n");
}

// ─── Content Generators ────────────────────────────────────────────────────

async function genBlogPost(p: any, imgs: string[], tone: string, custom: string) {
  const ctx = propContext(p, imgs);
  const sys = `Você é copywriter especialista em imóveis brasileiro. Gere artigo de blog SEO.
Regras: título max 60 chars com hook emocional, 3-4 parágrafos (features, localização, diferenciais), CTA suave, HTML leve.
Responda JSON: { "title": "...", "excerpt": "...", "content": "...", "hashtags": ["#tag"] }
Urgente.`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\nINSTRUÇÕES: ${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const imgPrompt = `Luxury Brazilian real estate, modern interior, bright living room, professional photography, golden hour lighting, no text, no people`;
  return {
    type: "blog_post",
    title: j?.title || p?.title || "Blog Post",
    text: j?.excerpt || j?.content || raw.slice(0, 200),
    content: j?.content || `<p>${raw}</p>`,
    hashtags: j?.hashtags || [],
    imageUrl: pollinationsImage(imgPrompt, 1280, 720),
    prompt: imgPrompt,
  };
}

async function genSocialPost(p: any, imgs: string[], tone: string, platform: string, custom: string) {
  const ctx = propContext(p, imgs);
  const t = TONE_MAP[tone] || TONE_MAP.professional;
  const specs: Record<string, string> = {
    instagram: "Caption Instagram: hook linha 1, descrição linha 2, CTA linha 3. Max 2200 chars. 5-10 hashtags.",
    facebook: "Post Facebook: informal, conversacional, 2-3 parágrafos curtos. 3-5 hashtags.",
    whatsapp: "WhatsApp: curta e direta, max 500 chars, sem hashtags.",
    all: "Multi-plataforma adaptável.",
  };
  const sys = `Social media manager especialista em imóveis. ${specs[platform] || specs.all}\nTom: ${t}\nResponda JSON: { "caption": "...", "hashtags": [...] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\n${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const imgPrompt = `Modern luxury Brazilian home, warm inviting interior, professional real estate photo, Instagram-worthy, golden hour, no text, no people`;
  return {
    type: "social_post",
    platform,
    title: j?.caption?.slice(0, 60) || p?.title || "Post",
    text: j?.caption || raw.slice(0, 300),
    hashtags: j?.hashtags || [],
    imageUrl: pollinationsImage(imgPrompt, 1080, 1080),
    prompt: imgPrompt,
  };
}

async function genStory(p: any, imgs: string[], tone: string, custom: string) {
  const ctx = propContext(p, imgs);
  const sys = `Designer de carrossel Instagram para imóveis. 6-8 slides: HOOK → features → CTA.
Cada slide: headline max 8 palavras, body max 20 palavras. Use emojis.
Responda JSON: { "slides": [{ "heading": "...", "body": "...", "imgPrompt": "english for AI" }], "caption": "...", "hashtags": [...] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\n${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const slides = j?.slides || [];
  const firstPrompt = slides[0]?.imgPrompt || `Luxury Brazilian real estate, professional photography, vibrant colors`;
  return {
    type: "story",
    title: "Story Carrossel",
    slides,
    captions: j?.caption ? [j.caption] : [],
    hashtags: j?.hashtags || [],
    imageUrl: pollinationsImage(firstPrompt, 768, 1368),
    prompt: firstPrompt,
    slidePrompts: slides.map((s: any) => s.imgPrompt).filter(Boolean),
  };
}

async function genVideoScript(p: any, imgs: string[], tone: string, custom: string) {
  const ctx = propContext(p, imgs);
  const sys = `Roteirista de vídeos imobiliários profissionais. Roteiro 60-90s:
1. HOOK 5s: pergunta ou dado impactante
2. APRESENTAÇÃO 20s: imóvel, tipo, localização
3. TOUR 40s: principais cômodos
4. ENCERRAMENTO 15s: preço + CTA
Responda JSON: { "title": "...", "script": "...", "duration_estimate": 75, "hashtags": [...] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\n${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  return {
    type: "video_script",
    title: j?.title || p?.title || "Roteiro de Vídeo",
    script: j?.script || raw,
    hashtags: j?.hashtags || [],
    duration: j?.duration_estimate || 60,
    imageUrl: imgs?.[0] || pollinationsImage(`Real estate video thumbnail: ${p?.title || "luxury property"}`, 1280, 720),
    videoPrompt: `Cinematic real estate showcase: ${p?.title || ""}`,
  };
}

async function genPropertyDescription(p: any, tone: string) {
  const ctx = propContext(p, []);
  const sys = `Copywriter especialista em imóveis brasileiros. Descrição profissional e persuasiva. Max 400 caracteres. Tom: ${TONE_MAP[tone] || TONE_MAP.professional}. Inclua tipo, bairro, diferenciais, metragem. Responda apenas a descrição.`;
  const raw = await omniChat([{ role: "system", content: sys }, { role: "user", content: ctx }]);
  const imgPrompt = `Professional real estate photo: ${p?.title || "luxury property"}, Brazilian interior, bright and airy, natural light, professional staging, no text, no people`;
  return {
    type: "property_description",
    title: p?.title || "Descrição",
    text: raw.slice(0, 400),
    imageUrl: pollinationsImage(imgPrompt, 1024, 1024),
    prompt: imgPrompt,
  };
}

async function genAdCopy(p: any, tone: string) {
  const ctx = propContext(p, []);
  const sys = `Copywriter de anúncios pagos para imóveis. Meta Ads (Facebook/Instagram).
- Headline 1 (max 40 chars): benefício emocional
- Headline 2 (max 40 chars): benefício prático
- Description (max 25 chars): detalhe técnico
- CTA: "SAIBA MAIS" | "VISITE" | "AGENDE" | "LIGUE AGORA"
Responda JSON: { "headline1": "...", "headline2": "...", "description": "...", "cta": "..." }`;
  const raw = await omniChat([{ role: "system", content: sys }, { role: "user", content: ctx }]);
  const j = parseJson(raw);
  const imgPrompt = `High-conversion real estate ad creative, luxury Brazilian property, bold vibrant colors, commercial photography, emotional appeal, no text, no people`;
  return {
    type: "ad_copy",
    title: j?.headline1 || p?.title || "Anúncio",
    text: [j?.headline1, j?.headline2, j?.description].filter(Boolean).join(" | "),
    hashtags: [],
    imageUrl: pollinationsImage(imgPrompt, 1200, 628),
    prompt: imgPrompt,
    headline1: j?.headline1,
    headline2: j?.headline2,
    description: j?.description,
    cta: j?.cta || "SAIBA MAIS",
  };
}

async function genVoiceover(p: any, tone: string) {
  const ctx = propContext(p, []);
  const sys = `Roteirista de narrações para vídeos imobiliários. Texto max 150 palavras, falado em 30-45s. Tom: ${TONE_MAP[tone] || TONE_MAP.professional}. Sem hashtags. Linguagem clara de locução profissional. Responda apenas o texto.`;
  const script = await omniChat([{ role: "system", content: sys }, { role: "user", content: ctx }]);
  // TTS will be done client-side via Web Speech API
  return {
    type: "voiceover",
    title: `Narração: ${p?.title || "Imóvel"}`,
    script,
    // audioUrl will be generated client-side
    imageUrl: p?.images?.[0] || null,
  };
}

async function genMusic(p: any, tone: string) {
  const t = TONE_MAP[tone] || TONE_MAP.professional;
  const sys = `Composer de músicas para vídeos imobiliários. Descreva a música em 50 palavras: estilo, instrumentos, mood, BPM aproximado. Responda apenas a descrição musical.`;
  const raw = await omniChat([{ role: "system", content: sys }, { role: "user", content: `Imóvel: ${p?.title || ""}. ${p?.description || ""}. Tom: ${t}` }]);
  return {
    type: "music",
    title: "Música de Fundo",
    musicPrompt: raw.slice(0, 200),
    text: `Descrição musical: ${raw.slice(0, 200)}`, // Client can use this for music gen
  };
}

// ─── Save to DB ────────────────────────────────────────────────────────────

async function saveGen(supabase: any, d: {
  tenantId: string; authorId?: string; propertyId?: string;
  contentType: string; tone: string; platform: string; result: any; provider: string;
}) {
  const { data, error } = await supabase.from("content_generations").insert({
    tenant_id: d.tenantId,
    author_id: d.authorId || null,
    property_id: d.propertyId || null,
    content_type: d.contentType,
    tone: d.tone,
    target_platform: d.platform,
    title: d.result.title,
    body_text: d.result.text || d.result.script || null,
    caption: Array.isArray(d.result.captions) ? d.result.captions[0] : d.result.captions || null,
    hashtags: d.result.hashtags || [],
    script: d.result.script || null,
    image_url: d.result.imageUrl || null,
    video_url: d.result.videoUrl || null,
    audio_url: d.result.audioUrl || null,
    music_url: d.result.musicUrl || null,
    provider: d.provider,
    status: "success",
  }).select("id").single();
  if (error) console.error("Save error:", error.message);
  return data;
}

// ─── Main Server ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const { action } = body;

  try {
    // ── Health ──────────────────────────────────────────────
    if (action === "health") {
      const checks: any = { timestamp: new Date().toISOString() };
      try {
        await omniChat([{ role: "user", content: "hi" }], 5);
        checks.omniroute = "ok";
      } catch (e) { checks.omniroute = `error: ${e.message}`; }
      checks.pollinations = "ok (free, no key)";
      return new Response(JSON.stringify({ ok: true, checks }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Generate ───────────────────────────────────────────
    if (action === "generate") {
      const {
        tenant_id, author_id, property_id, property: propData, property_images,
        content_types, tone, platform, custom_prompt, save_to_db,
      } = body;

      if (!tenant_id) throw new Error("tenant_id obrigatório");
      if (!content_types?.length) throw new Error("content_types obrigatório");

      const supabase = getSupabase();
      const results: any[] = [];
      const t0 = Date.now();

      for (const ct of content_types) {
        let result: any;
        try {
          switch (ct) {
            case "blog_post": result = await genBlogPost(propData, property_images || [], tone || "professional", custom_prompt || ""); break;
            case "social_post": result = await genSocialPost(propData, property_images || [], tone || "professional", platform || "instagram", custom_prompt || ""); break;
            case "story": result = await genStory(propData, property_images || [], tone || "professional", custom_prompt || ""); break;
            case "video_script": result = await genVideoScript(propData, property_images || [], tone || "professional", custom_prompt || ""); break;
            case "voiceover": result = await genVoiceover(propData, tone || "professional"); break;
            case "music": result = await genMusic(propData, tone || "professional"); break;
            case "property_description": result = await genPropertyDescription(propData, tone || "professional"); break;
            case "ad_copy": result = await genAdCopy(propData, tone || "professional"); break;
            default: result = { type: ct, text: "Tipo não suportado" };
          }
        } catch (e: any) {
          result = { type: ct, text: `Erro: ${e.message}`, error: e.message };
        }
        results.push(result);
        if (save_to_db !== false && result && !result.error) {
          await saveGen(supabase, { tenantId: tenant_id, authorId: author_id, propertyId: property_id, contentType: ct, tone: tone || "professional", platform: platform || "all", result, provider: "omniroute+Pollinations" });
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        data: { results, timeMs: Date.now() - t0, provider: "OmniRoute (LLM) + Pollinations AI (images)" },
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Image URL ──────────────────────────────────────────
    if (action === "generate-image") {
      const { prompt, width, height } = body;
      if (!prompt) throw new Error("prompt obrigatório");
      return new Response(JSON.stringify({
        ok: true,
        data: { image_url: pollinationsImage(prompt, width || 1280, height || 720), width: width || 1280, height: height || 720 },
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── History ────────────────────────────────────────────
    if (action === "get-history") {
      const { tenant_id, content_type, limit } = body;
      if (!tenant_id) throw new Error("tenant_id obrigatório");
      const supabase = getSupabase();
      let q = supabase.from("content_generations").select("*").eq("tenant_id", tenant_id).order("created_at", { ascending: false }).limit(limit || 30);
      if (content_type) q = q.eq("content_type", content_type);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ ok: true, data }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(`[content-hub] ${action} error:`, err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
