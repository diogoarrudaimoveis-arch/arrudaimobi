/**
 * Content Hub — Supabase Edge Function
 * Unified AI content generation: text, image, video, audio, music, templates
 *
 * Actions:
 *  - generate          → text generation (OmniRoute/MiniMax LLM)
 *  - generate-image    → image generation (MiniMax image-01)
 *  - generate-video    → video generation (MiniMax video-01)
 *  - generate-tts      → TTS voiceover (MiniMax TTS)
 *  - generate-music    → music generation (MiniMax music-01)
 *  - generate-all      → full pipeline: text + image + video + TTS + music
 *  - get-history       → fetch generation history from content_generations
 *  - health            → provider health check
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

// MiniMax API (user provided key)
const MINIMAX_API_KEY = Deno.env.get("MINIMAX_API_KEY") ||
  "sk-cp-hLJt2Kf0K8kHsNNjX5rIrIO6Tuh_xLdq1OfB48stoVH0hJeGAM8SlNW1wnDF-ppR-laECIuzS2TcfFPgMhWF4M3GMwZalwYQHi7_VxGYdZpXqZaVknHnfOM";
const MINIMAX_GROUP_ID = Deno.env.get("MINIMAX_GROUP_ID") || "248637582464993339";
const MINIMAX_BASE = "https://api.minimax.chat";

// OmniRoute (internal LLM router)
const OMNI_KEY = Deno.env.get("OMNIROUTE_API_KEY") || "sk-611d5b3c2cca0507-7a32b3-0e17b59f";
const OMNI_BASE = Deno.env.get("OMNIROUTE_BASE") || "http://206.183.129.200:20128/v1";

// ─── CORS ───────────────────────────────────────────────────────────────────

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

function parseJsonResponse(text: string): any {
  try {
    const match = text.match(/```json\n?([\s\S]*?)```/) ||
      text.match(/```\n?([\s\S]*?)```/) ||
      text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) return JSON.parse(match[1] || match[0]);
    return JSON.parse(text);
  } catch { return null; }
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// ─── OmniRoute LLM ─────────────────────────────────────────────────────────

async function omniChat(messages: { role: string; content: string }[], maxTokens = 2048): Promise<{ content: string; model: string; tokens: number }> {
  const start = Date.now();
  const res = await fetch(`${OMNI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNI_KEY}` },
    body: JSON.stringify({ model: "MiniMax-M2.7", messages, max_tokens: maxTokens, temperature: 0.72 }),
  });
  if (!res.ok) throw new Error(`OmniRoute error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return {
    content: json.choices?.[0]?.message?.content || "",
    model: json.model || "MiniMax-M2.7",
    tokens: (json.usage?.total_tokens || 0),
  };
}

// ─── MiniMax API ────────────────────────────────────────────────────────────

async function minimaxImage(prompt: string, width = 1280, height = 720): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE}/image_generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MINIMAX_API_KEY}` },
    body: JSON.stringify({
      model: "image-01",
      prompt,
      width,
      height,
      num_steps: 30,
      seed: Date.now() % 999999,
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`MiniMax image error ${json.code}: ${json.message}`);
  // image-01 is sync — returns base64 directly
  if (json.data?.image_base64) {
    return `data:image/jpeg;base64,${json.data.image_base64}`;
  }
  if (json.data?.images?.[0]) return json.data.images[0];
  throw new Error("No image returned from MiniMax");
}

async function minimaxVideo(imageUrls: string[], prompt: string): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE}/video_generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MINIMAX_API_KEY}` },
    body: JSON.stringify({
      model: "video-01",
      input_images: imageUrls,
      prompt: prompt || "smooth camera movement, cinematic lighting, real estate showcase",
      duration: 5,
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`MiniMax video error ${json.code}: ${json.message}`);
  return json.data?.video_url || "";
}

async function minimaxTTS(text: string, voiceId = "male-qn-qingse"): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE}/t2aPro`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MINIMAX_API_KEY}` },
    body: JSON.stringify({
      model: "speech-01",
      text: text.slice(0, 1000),
      voice_setting: { voice_id: voiceId, speed: 1.0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3" },
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`MiniMax TTS error ${json.code}: ${json.message}`);
  return json.data?.audio_file || "";
}

async function minimaxMusic(prompt: string): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE}/music_generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MINIMAX_API_KEY}` },
    body: JSON.stringify({ model: "music-01", prompt, genre: "ambient", mood: "calm" }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`MiniMax music error ${json.code}: ${json.message}`);
  return json.data?.audio_file || "";
}

async function minimaxText(prompt: string, system: string): Promise<string> {
  const { content } = await omniChat([
    { role: "system", content: system },
    { role: "user", content: prompt },
  ]);
  return content;
}

// ─── Prompt Builders ────────────────────────────────────────────────────────

const TONE_MAP: Record<string, string> = {
  luxury: "Tom sofisticado e premium. Use palavras como 'exclusivo', 'privilegiado', 'único', 'refinado'. Foco em lifestyle e status.",
  family: "Tom acolhedor e familiar. Foco em espaço, segurança, comunidade, comodidades para crianças.",
  urgent: "Tom urgente e persuasivo. Gatilhos de escassez: 'últimas unidades', 'oportunidade limitada'.",
  modern: "Tom moderno e minimalista. Design limpo, linguagem contemporânea.",
  professional: "Tom profissional e confiável. Descrição técnica clara, dados objetivos.",
};

const VOICE_MAP: Record<string, string> = {
  male_qn: "male-qn-qingse",
  female_br: "female-br-natalia",
  male_br: "male-br-jair",
  female_qn: "female-qn-jingxing",
};

function buildPropertyContext(property: any, propertyImages: string[]): string {
  if (!property) return "";
  const images = propertyImages?.length ? `\nFOTOS DO IMÓVEL: ${propertyImages.join(", ")}` : "";
  return [
    property.title && `TÍTULO: ${property.title}`,
    property.type && `TIPO: ${property.type}`,
    property.city && `CIDADE: ${property.city}`,
    property.neighborhood && `BAIRRO: ${property.neighborhood}`,
    property.price && `PREÇO: R$ ${Number(property.price).toLocaleString("pt-BR")}`,
    property.bedrooms && `DORMITÓRIOS: ${property.bedrooms}`,
    property.bathrooms && `BANHEIROS: ${property.bathrooms}`,
    property.garages && `VAGAS: ${property.garages}`,
    property.area && `ÁREA: ${property.area}m²`,
    property.description && `DESCRIÇÃO: ${property.description}`,
    property.amenities?.length && `COMODIDADES: ${property.amenities.join(", ")}`,
    images,
  ].filter(Boolean).join("\n");
}

// ─── Content-Type Handlers ─────────────────────────────────────────────────

async function generateBlogPost(property: any, propertyImages: string[], tone: string, customPrompt: string) {
  const ctx = buildPropertyContext(property, propertyImages);
  const system = `Você é um copywriter especialista em imóveis brasileiro de alto nível.
Gere conteúdo de blog SEO para imóveis.
REGRAS:
- Título impactante (max 60 caracteres) com hook emocional
- Introdução envolvente (2-3 frases)
- Corpo com 3-4 parágrafos: features, localização, diferenciais
- Conclusão com CTA suave
- Use dados do imóvel quando disponíveis
- HTML leve permitido para formatação
Responda em JSON: { "title": "...", "excerpt": "...", "content": "...", "hashtags": ["#tag1", ...] }
Depressa com urgência.`;
  const user = customPrompt ? `${ctx}\n\nINSTRUÇÕES ADICIONAIS: ${customPrompt}` : ctx;
  const raw = await minimaxText(user, system);
  const parsed = parseJsonResponse(raw);
  const imagePrompt = `Luxurious Brazilian real estate property, professional photography, bright interior, golden hour lighting, editorial style, no text, no people`;
  let imageUrl = "";
  try { imageUrl = await minimaxImage(imagePrompt, 1280, 720); } catch (e) { console.log("Image gen failed:", e.message); }
  return {
    type: "blog_post",
    title: parsed?.title || property?.title || "Blog Post",
    text: parsed?.excerpt || parsed?.content || raw.slice(0, 200),
    content: parsed?.content || `<p>${raw}</p>`,
    hashtags: parsed?.hashtags || [],
    imageUrl,
    prompt: imagePrompt,
  };
}

async function generateSocialPost(property: any, propertyImages: string[], tone: string, platform: string, customPrompt: string) {
  const ctx = buildPropertyContext(property, propertyImages);
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const platformDesc: Record<string, string> = {
    instagram: "Caption para Instagram: linha 1 hook, linha 2 descrição, linha 3 CTA. Max 2200 caracteres. 5-10 hashtags.",
    facebook: "Post para Facebook: mais informal, conversacional. 2-3 parágrafos curtos. 3-5 hashtags.",
    whatsapp: "Mensagem para WhatsApp: curta e direta. Max 500 caracteres. Sem hashtags.",
    all: "Caption multi-plataforma adaptável.",
  };
  const system = `Você é um social media manager especialista em imóveis.
${platformDesc[platform] || platformDesc.all}
Tom: ${toneDesc}
Responda em JSON: { "caption": "...", "hashtags": ["#tag1", ...] }`;
  const user = customPrompt ? `${ctx}\n\nINSTRUÇÕES: ${customPrompt}` : ctx;
  const raw = await minimaxText(user, system);
  const parsed = parseJsonResponse(raw);
  const imagePrompt = `Modern luxury real estate photo, Brazilian property, warm inviting interior, professional photography, Instagram-worthy, golden hour, no text, no people`;
  let imageUrl = "";
  try { imageUrl = await minimaxImage(imagePrompt, 1080, 1080); } catch (e) { console.log("Image gen failed:", e.message); }
  return {
    type: "social_post",
    platform,
    title: parsed?.caption?.slice(0, 60) || property?.title || "Social Post",
    text: parsed?.caption || raw.slice(0, 300),
    hashtags: parsed?.hashtags || [],
    imageUrl,
    prompt: imagePrompt,
  };
}

async function generateStory(property: any, propertyImages: string[], tone: string, customPrompt: string) {
  const ctx = buildPropertyContext(property, propertyImages);
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const system = `Você é um designer de carrossel Instagram para imóveis.
Crie carrossel de 6-8 slides. Slide 1: HOOK. Slides 2-5: features. Último: CTA.
Cada slide: headline (max 8 palavras) + body (max 20 palavras).
Use emojis estrategicamente.
Responda em JSON: { "slides": [{ "heading": "...", "body": "...", "imagePrompt": "english prompt for AI image" }], "caption": "...", "hashtags": [...] }`;
  const user = customPrompt ? `${ctx}\n\nINSTRUÇÕES: ${customPrompt}` : ctx;
  const raw = await minimaxText(user, system);
  const parsed = parseJsonResponse(raw);
  const slides = parsed?.slides || [];
  let slideImages: string[] = [];
  for (const slide of slides.slice(0, 4)) {
    try {
      const url = await minimaxImage(slide.imagePrompt || `Luxury real estate, ${slide.heading}`, 768, 1368);
      slideImages.push(url);
    } catch { /* skip failed slides */ }
  }
  return {
    type: "story",
    title: parsed?.title || "Story Carousel",
    slides,
    captions: parsed?.caption ? [parsed.caption] : [],
    hashtags: parsed?.hashtags || [],
    imageUrl: slideImages[0] || "",
    slideImages,
    prompt: slides[0]?.imagePrompt || "Luxury Brazilian real estate, professional photography",
  };
}

async function generateVideoScript(property: any, propertyImages: string[], tone: string, customPrompt: string) {
  const ctx = buildPropertyContext(property, propertyImages);
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const system = `Você é um roteirista de vídeos imobiliários profissionais.
Gere um roteiro de vídeo curto (60-90 segundos) para redes sociais.
Estrutura:
1. HOOK (5s): pergunta ou dado impactante
2. APRESENTAÇÃO (20s): nome do imóvel, tipo, localização
3. TOUR (40s): principais cômodos e features
4. ENCERRAMENTO (15s): preço, CTA, contato
Responda em JSON: { "title": "...", "script": "...", "duration_estimate": 75, "hashtags": [...] }`;
  const user = customPrompt ? `${ctx}\n\nINSTRUÇÕES: ${customPrompt}` : ctx;
  const raw = await minimaxText(user, system);
  const parsed = parseJsonResponse(raw);
  let videoUrl = "";
  if (propertyImages?.length) {
    try { videoUrl = await minimaxVideo(propertyImages.slice(0, 4), `Real estate showcase: ${property?.title || ""}`); } catch (e) { console.log("Video gen failed:", e.message); }
  }
  return {
    type: "video_script",
    title: parsed?.title || property?.title || "Video Script",
    script: parsed?.script || raw,
    hashtags: parsed?.hashtags || [],
    videoUrl,
    duration: parsed?.duration_estimate || 60,
    imageUrl: propertyImages?.[0] || "",
  };
}

async function generateVoiceover(property: any, propertyImages: string[], tone: string, voiceId: string, customPrompt: string) {
  const ctx = buildPropertyContext(property, propertyImages);
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const system = `Você é um roteirista de narrações (voiceover) para vídeos imobiliários.
Gere um texto de narração curto (max 150 palavras) para locução.
Tom: ${toneDesc}
O texto deve ser falado em 30-45 segundos.
Sem hashtags. Sem emojis. Linguagem clara de locução profissional.
Responda APENAS com o texto de narração.`;
  const user = customPrompt ? `${ctx}\n\nINSTRUÇÕES: ${customPrompt}` : ctx;
  const script = await minimaxText(user, system);
  let audioUrl = "";
  try {
    audioUrl = await minimaxTTS(script.slice(0, 500), VOICE_MAP[voiceId] || VOICE_MAP.female_br);
  } catch (e) { console.log("TTS gen failed:", e.message); }
  return {
    type: "voiceover",
    title: property?.title ? `Voiceover: ${property.title}` : "Voiceover",
    script,
    audioUrl,
  };
}

async function generateMusic(property: any, tone: string, customPrompt: string) {
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const musicPrompt = `${toneDesc} Ambient music for luxury real estate video. Soft piano, subtle strings, peaceful atmosphere. ${property?.description || ""} ${customPrompt || ""}`;
  let musicUrl = "";
  try { musicUrl = await minimaxMusic(musicPrompt); } catch (e) { console.log("Music gen failed:", e.message); }
  return {
    type: "music",
    title: "Background Music",
    musicUrl,
    prompt: musicPrompt,
  };
}

async function generatePropertyDescription(property: any, tone: string) {
  const ctx = buildPropertyContext(property, []);
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const system = `Você é um copywriter especialista em imóveis brasileiros.
Gere uma descrição profissional e persuasiva para o imóvel.
Tom: ${toneDesc}
Max 400 caracteres.
Inclua: tipo, bairro, diferenciais, metragem, preço por m² se relevante.
Responda APENAS com a descrição.`;
  const raw = await minimaxText(ctx, system);
  let imageUrl = "";
  try {
    imageUrl = await minimaxImage(
      `Professional real estate photo: ${property?.title || "luxury property"}, Brazilian interior, bright and airy, professional staging, natural light, no text, no people`,
      1024, 1024
    );
  } catch {}
  return {
    type: "property_description",
    title: property?.title || "Property Description",
    text: raw.slice(0, 400),
    imageUrl,
  };
}

async function generateAdCopy(property: any, tone: string) {
  const ctx = buildPropertyContext(property, []);
  const toneDesc = TONE_MAP[tone] || TONE_MAP.professional;
  const system = `Você é um copywriter de anúncios pagos para imóveis.
Gere criativos para Meta Ads (Facebook/Instagram).
Formatos:
- Headline 1 (max 40 chars): benefício emocional
- Headline 2 (max 40 chars): benefício prático
- Description (max 25 chars): detalhe técnico
- CTA: "SAIBA MAIS" | "VISITE" | "AGENDE" | "LIGUE AGORA"
Responda em JSON: { "headline1": "...", "headline2": "...", "description": "...", "cta": "..." }`;
  const raw = await minimaxText(ctx, system);
  const parsed = parseJsonResponse(raw);
  let imageUrl = "";
  try {
    imageUrl = await minimaxImage(
      `High-conversion real estate ad creative, luxury Brazilian property, bold vibrant colors, commercial photography style, emotional, no text, no people`,
      1200, 628
    );
  } catch {}
  return {
    type: "ad_copy",
    title: parsed?.headline1 || property?.title || "Ad Copy",
    text: [parsed?.headline1, parsed?.headline2, parsed?.description].filter(Boolean).join(" | "),
    hashtags: [],
    imageUrl,
    headline1: parsed?.headline1,
    headline2: parsed?.headline2,
    description: parsed?.description,
    cta: parsed?.cta || "SAIBA MAIS",
  };
}

// ─── Save to Database ────────────────────────────────────────────────────────

async function saveGeneration(supabase: any, data: {
  tenantId: string; authorId?: string; propertyId?: string;
  contentType: string; tone: string; platform: string;
  result: any; provider: string; model?: string;
}) {
  const { data: saved, error } = await supabase.from("content_generations").insert({
    tenant_id: data.tenantId,
    author_id: data.authorId || null,
    property_id: data.propertyId || null,
    content_type: data.contentType,
    tone: data.tone,
    target_platform: data.platform,
    title: data.result.title,
    body_text: data.result.text || data.result.script || null,
    caption: data.result.caption || data.result.captions?.[0] || null,
    hashtags: data.result.hashtags || [],
    script: data.result.script || null,
    image_url: data.result.imageUrl || null,
    video_url: data.result.videoUrl || null,
    audio_url: data.result.audioUrl || null,
    music_url: data.result.musicUrl || null,
    provider: data.provider,
    model_used: data.model,
    status: "success",
  }).select("id").single();

  if (error) console.error("Save error:", error.message);
  return saved;
}

// ─── Main Server ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const { action } = body;

  try {
    // ── Health Check ──────────────────────────────────────────────
    if (action === "health") {
      const checks: any = { timestamp: new Date().toISOString() };
      try {
        await omniChat([{ role: "user", content: "Hi" }], 10);
        checks.omniroute = "ok";
      } catch (e) { checks.omniroute = `error: ${e.message}`; }
      try {
        await minimaxImage("a beautiful house", 256, 256);
        checks.minimax_image = "ok";
      } catch (e) { checks.minimax_image = `error: ${e.message}`; }
      return new Response(JSON.stringify({ ok: true, checks }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate: Text + optional media ──────────────────────────
    if (action === "generate") {
      const { tenant_id, author_id, property_id, property: propertyData, property_images,
        content_types, tone, platform, voice_id, custom_prompt, save_to_db } = body;

      if (!tenant_id) throw new Error("tenant_id obrigatório");
      if (!content_types?.length) throw new Error("content_types obrigatório (array)");

      const supabase = getSupabase();
      const results: any[] = [];
      const genStart = Date.now();

      for (const ct of content_types) {
        const genItem = async () => {
          switch (ct) {
            case "blog_post": return generateBlogPost(propertyData, property_images || [], tone || "professional", custom_prompt || "");
            case "social_post": return generateSocialPost(propertyData, property_images || [], tone || "professional", platform || "instagram", custom_prompt || "");
            case "story": return generateStory(propertyData, property_images || [], tone || "professional", custom_prompt || "");
            case "video_script": return generateVideoScript(propertyData, property_images || [], tone || "professional", custom_prompt || "");
            case "voiceover": return generateVoiceover(propertyData, property_images || [], tone || "professional", voice_id || "female_br", custom_prompt || "");
            case "music": return generateMusic(propertyData, tone || "professional", custom_prompt || "");
            case "property_description": return generatePropertyDescription(propertyData, tone || "professional");
            case "ad_copy": return generateAdCopy(propertyData, tone || "professional");
            default: return { type: ct, text: "Tipo não suportado", error: "unsupported_type" };
          }
        };

        let result: any;
        try {
          result = await genItem();
        } catch (e: any) {
          result = { type: ct, text: `Erro: ${e.message}`, error: e.message };
        }

        results.push(result);

        // Save to DB
        if (save_to_db !== false && result && !result.error) {
          await saveGeneration(supabase, {
            tenantId: tenant_id,
            authorId: author_id,
            propertyId: property_id,
            contentType: ct,
            tone: tone || "professional",
            platform: platform || "all",
            result,
            provider: "minimax+omniroute",
            model: "MiniMax-M2.7",
          });
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        data: {
          results,
          timeMs: Date.now() - genStart,
          provider: "minimax+omniroute",
          model: "MiniMax-M2.7",
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Generate Image ──────────────────────────────────────────
    if (action === "generate-image") {
      const { prompt, width, height } = body;
      if (!prompt) throw new Error("prompt obrigatório");
      const imageUrl = await minimaxImage(prompt, width || 1280, height || 720);
      return new Response(JSON.stringify({ ok: true, data: { image_url: imageUrl, width: width || 1280, height: height || 720 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate Video ──────────────────────────────────────────
    if (action === "generate-video") {
      const { image_urls, prompt } = body;
      if (!image_urls?.length) throw new Error("image_urls obrigatório (array)");
      const videoUrl = await minimaxVideo(image_urls, prompt || "");
      return new Response(JSON.stringify({ ok: true, data: { video_url: videoUrl } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate TTS ────────────────────────────────────────────
    if (action === "generate-tts") {
      const { text, voice_id } = body;
      if (!text) throw new Error("text obrigatório");
      const audioUrl = await minimaxTTS(text, VOICE_MAP[voice_id] || VOICE_MAP.female_br);
      return new Response(JSON.stringify({ ok: true, data: { audio_url: audioUrl } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate Music ──────────────────────────────────────────
    if (action === "generate-music") {
      const { prompt } = body;
      if (!prompt) throw new Error("prompt obrigatório");
      const musicUrl = await minimaxMusic(prompt);
      return new Response(JSON.stringify({ ok: true, data: { music_url: musicUrl } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get History ─────────────────────────────────────────────
    if (action === "get-history") {
      const { tenant_id, content_type, limit } = body;
      if (!tenant_id) throw new Error("tenant_id obrigatório");
      const supabase = getSupabase();
      let query = supabase
        .from("content_generations")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false })
        .limit(limit || 20);
      if (content_type) query = query.eq("content_type", content_type);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ ok: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(`[content-hub] ${action || "unknown"} error:`, err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
