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
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text); } catch { /* skip */ }
  // Try to strip markdown code blocks
  const stripped = text.replace(/^```json\s*/i, "").replace(/\s*```$/, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  if (stripped) {
    try { return JSON.parse(stripped); } catch { /* skip */ }
  }
  // Try to find JSON object in text
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* skip */ }
  }
  return null;
}

// ─── OmniRoute LLM (text generation) ────────────────────────────────────────

async function omniChat(messages: { role: string; content: string }[], maxTokens = 2048) {
  const omniBody = JSON.stringify({ model: "MiniMax-M2.7", messages, max_tokens: maxTokens, temperature: 0.75, stream: false });
  const res = await fetch(`${OMNI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNI_KEY}` },
    body: omniBody,
  });
  if (!res.ok) throw new Error(`OmniRoute ${res.status}: ${await res.text()}`);
  const body = await res.text();
  let json: any;
  try { json = JSON.parse(body); } catch { json = null; }
  if (!json) throw new Error("OmniRoute response is not valid JSON: " + body.slice(0, 100));
  return json.choices?.[0]?.message?.content || "";
}

// ─── Pollinations AI (free image generation) ────────────────────────────────

function pollinationsImage(prompt: string, width = 1024, height = 1024): string {
  const enc = encodeURIComponent(prompt.slice(0, 900));
  return `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&nologo=true&seed=${Date.now() % 9999}`;
}

// ─── Prompt Builders ────────────────────────────────────────────────────────

const TONE_MAP: Record<string, string> = {
  luxury: `Você é um Diretor de Criação de uma agência de marketing premium brasileira.
Linguagem: cinematográfica, aspiracional, emocional, sensorial.
Estilo: arquitetura de luxo, lifestyle de sucesso, exclusividade, sonho.
Evocações permitted: golden hour, drone shot, slow motion, volumétrica, iluminação cinematográfica.
Consistência: SEMPRE respeite a arquitetura, cores, estilo e mood do imóvel fotografado.
Nunca invente móveis, paisagem ou elementos que não existam na propriedade.
Tom: sofisticado, elegante, persuasivo, emocional. O cliente está comprando um ESTILO DE VIDA, não um imóvel.`,
  family: `Você é copywriter premium para famílias exigentes.
Linguagem: acolhedora, segura, calorosa, aspiracional.
Foco: espaço para crescer, segurança, comunidade, momentos em família.
Estilo: lifestyle familiar de alto padrão, área externa kids-friendly, integração ambiente interno/externo.
Nunca mencione segurança de forma genérica — seja sensorial e específica.`,
  urgent: `Você é copywriter de alta conversão para urgência real.
Linguagem: impacto imediato, escassez genuína, oportunidade inegável.
Estilo: copywriting de precisão — urgência real, não artificial.
Jamais use "última chance" genérico. Identifique o MOTIVO real da urgência.`,
  modern: `Você é copywriter de design de interiores premium.
Linguagem: clean, contemporânea, técnica precisa, minimalista.
Foco: arquitetura contemporânea, materiais nobres, linhas limpas, design internacional.
Tom: confiança discreta, expertise, sofisticação sem ostentação.`,
  professional: `Você é copywriter institucional de alto padrão para público corporativo e investidores.
Linguagem: técnica, objetiva, dados de mercado, ROI, investimento seguro.
Tom: credibilidade, solidez, retorno, patrimonial.`,
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
  const sys = `Você é Diretor de Criação de uma agência premium brasileira — tom cinematográfico e aspiracional.
GERE UM ARTIGO DE BLOG SEO DE ALTA QUALIDADE para imóvel de luxo.
Estrutura:
1. TÍTULO (max 60 chars): headline emocional + hook poderoso. Exemplo: "Onde o Pôr do Sol Merece Ser Morado" ou "O Endereço Queothers只Sonham"
2. EXCERPT (150 chars): síntese sensorial e emocional do imóvel
3. CONTEÚDO: 3-4 parágrafos cinematográficos — use描写 sensorial (iluminação, texturas, paisagem, texturas)
4. HASHTAGS: 8 hashtags de luxo + localização

REGRAS ABSOLUTAS:
- NUNCA use frases genéricas ("óximo à praia", "comodidades completas")
- use描写 específica: "varanda gourmet com pôr do sol dourado sobre a skyline", "piscina infinita que se dissolve no horizonte"
- O artigo deve fazer o leitor SENTIR o imóvel, não apenas ler especificações
- Respeite o estilo arquitetônico e cores do imóvel (dados fornecidos)

Responda APENAS JSON válido:
{ "title": "...", "excerpt": "...", "content": "...html...", "hashtags": ["#tag1", "#tag2"] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\nDIRETRIZ CRIATIVA: ${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const imgPrompt = `Ultra realistic, 8K cinematic photography. Brazilian luxury penthouse interior at golden hour. Volumetric light rays streaming through floor-to-ceiling windows. Warm ambient interior lighting, leather sofas, contemporary design, marble floors, curated art. Wide angle lens, shallow depth of field, architectural photography. No text, no people, no watermarks.`;
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
  const t = TONE_MAP[tone] || TONE_MAP.luxury;
  const specs: Record<string, string> = {
    instagram: `LEGEND PARA INSTAGRAM PREMIUM — formato:
LINHA 1 (HOOK): uma frase cinematográfica que парализу o scroll. Evocação sensorial ou pergunta provocativa.
LINHA 2-3 (CORPO): 2-3 linhas que constroem o lifestyle. Use描写 sensorial — não liste cômodos.
LINHA 4 (CTA): convite elegante para ação. Max 2200 caracteres total. 8-12 hashtags de luxo.`,
    facebook: `POST FACEBOOK elegante: 2-3 parágrafos curtos. Tom cinematográfico e conversacional. 3-5 hashtags de marca. Integração com lifestyle.`,
    whatsapp: `MENSAGEM WHATSAPP: curta e impactante. Max 500 caracteres. Tom VIP, quase sussurrado — exclusividade. Sem hashtags. Pergunta que gera curiosidade.`,
    all: `Multi-plataforma adaptável com linguagem cinematográfica premium.`,
  };
  const sys = `DIRETOR DE CRIAÇÃO PREMIUM para marketing imobiliário brasileiro de alto padrão.
${specs[platform] || specs.all}

${t}

REGRAS DE OURO:
- HOOK deve парализовать o scroll — primeira linha é TUDO
- NUNCA liste "3 suítes, 2 vagas" — isso é especificações, não lifestyle
- Use描写: iluminação dourada, texturas, sensações, paisagem, aroma de madeira, som da água
- O imóvel é um CAPÍTULO DE VIDA, não um produto
- hashtag de localização: sempre inclua a cidade/região em português

Responda JSON: { "caption": "...", "hashtags": [...] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\nDIRETRIZ: ${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const imgPrompt = `Professional luxury real estate photography. Cinematic golden hour interior. Warm volumetric lighting, Brazilian modern architecture. Living room with floor-to-ceiling windows overlooking city skyline. Designer furniture, natural materials, marble countertops. Shallow depth of field, editorial quality. Instagram-worthy, aspirational lifestyle. No text, no people, no watermarks.`;
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
  const sys = `DIRETOR DE CRIAÇÃO PREMIUM — designer de carrossel Instagram para imóveis de luxo.
CINEMA EM 6-8 SLIDES:
Slide 1 — HOOK: headline cinematográfico que парализу o espectador. Máximo 7 palavras. Evocação sensorial ou pergunta que queima.
Slide 2 — APRESENTAÇÃO: nome do imóvel/endereço + tagline aspiracional. Máximo 8 palavras.
Slides 3-6 — TOUR SENSORIAL: cada slide = 1 cômodo/espaço. Headline poético (5 palavras) + body感官 (15 palavras). Evocações: "luz dourada que entra pela janela", "mármore que reflete o pôr do sol", "varanda onde o tempo para".
Slide 7 — DADOS DE IMPACTO: preço, metragem, diferenciais — apresentado de forma cinematográfica, não tabular.
Slide 8 — CTA: convite elegante para ação. DM, link, contato.

CADA SLIDE PRECISA DE:
- headline cinematográfica (max 8 palavras, linguagem poetic, não descritiva)
- body感官 (max 20 palavras,描写 sensorial do espaço)
- imgPrompt: PROMPT ULTRA-DETALHADO em inglês para IA de imagem (estilo Freepik/Magnific AI)
  → Formato: "tipo de foto, iluminação, ângulo, estilo, cores dominantes, mood, detalhes arquitetônicos, qualidade"
  → Exemplo: "Luxury penthouse terrace at sunset, drone shot, golden hour volumetric lighting, tropical plants, infinity pool merging with ocean horizon, wide angle, 8k, cinematic color grading, no text, no people"
  → IMPORTANTE: imgPrompt deve refletir O ESTILO DO IMÓVEL real (moderno, clássico, industrial, etc.)

Responda JSON: { "slides": [{ "heading": "...", "body": "...", "imgPrompt": "..." }], "caption": "...", "hashtags": [...] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\nDIRETRIZ: ${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const slides = j?.slides || [];
  const firstPrompt = slides[0]?.imgPrompt || `Luxury Brazilian real estate, drone shot, golden hour, cinematic, volumetric lighting, professional photography, 8k`;
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

// ─── MiniMax Hailuo Image-to-Video Prompt Builder ─────────────────────────────────

/**
 * Constrói um prompt perfeito para MiniMax Hailuo Image-to-Video.
 * Template: cinematográfico premium, estilo Architectural Digest + Netflix doc.
 * Regras: first-frame da foto real, câmera cinematográfica 8-12s,
 *         golden hour, movimento sutil, mood aspiracional.
 */
function buildHailuoVideoPrompt(p: any, refImg: string): string {
  const type = (p as any).type || "luxury property";
  const neighborhood = (p as any).neighborhood || "";
  const city = (p as any).city || "Rio de Janeiro";
  const style = (p as any).style || (p as any).architecture || "modern luxury";

  const hasPool = (p as any).amenities?.some((a: string) =>
    /piscina|pool|aquecimento|heated|infinity/i.test(a)
  );
  const hasGarden = (p as any).amenities?.some((a: string) =>
    /jardim|garden|área verde|verde|park/i.test(a)
  );
  const hasOcean = /mar|oceano|praia|beach|rio|baía/i.test(`${neighborhood} ${city}`);

  // First frame
  const firstFrame = refImg
    ? `First frame: ${refImg} — stunning high-resolution architectural photograph of a luxurious ${style} ${type} in ${neighborhood}, ${city}${hasPool ? " with infinity pool" : ""}${hasOcean ? " and ocean view" : ""}.`
    : `First frame: stunning high-resolution architectural photograph of a luxurious ${style} ${type} in ${neighborhood}, ${city}${hasPool ? " with infinity pool" : ""}${hasOcean ? " and ocean view" : ""}.`;

  // Camera choreography — conditionally adjust based on amenities
  const poolShot = hasPool
    ? "Smooth circular orbit around the infinity pool showcasing beautiful reflections."
    : "Smooth circular orbit around the terrace area showcasing golden light reflections.";

  const cameraChoreography = [
    `1. Slow ascending drone shot revealing the full ${type}${hasPool ? ", infinity pool" : ""} and ${hasOcean ? "breathtaking ocean view" : "city view"} at golden hour.`,
    "2. Elegant slow push-in through large glass windows into the sophisticated living room.",
    `3. ${poolShot}`,
    "4. Parallax tracking shot gliding through the open terrace, highlighting seamless indoor-outdoor connection.",
    `5. Graceful drone pull-back shot embracing the entire property against the ${hasOcean ? "vibrant Rio skyline at sunset" : "city skyline at golden hour"}.`
  ].join("\n");

  // Atmospheric motion — conditional
  const motionLines: string[] = [];
  if (hasPool) motionLines.push("- Crystal clear pool water with soft, mesmerizing ripples reflecting golden sunlight.");
  if (hasGarden) motionLines.push("- Palm leaves and lush tropical foliage swaying gently in the breeze.");
  if (hasOcean) motionLines.push("- Distant ocean shimmering with natural wave movement.");
  motionLines.push("- Sheer white curtains flowing elegantly with the wind inside the property.");
  motionLines.push("- Warm golden sunlight slowly moving across polished marble floors and glass surfaces.");
  motionLines.push("- Delicate dust particles floating in volumetric god rays.");

  const motionBlock = motionLines.join("\n");

  const lightingBlock = [
    "- Magical golden hour lighting with strong volumetric god rays and warm amber highlights.",
    "- Soft cinematic shadows, subtle lens flares, dreamy atmosphere.",
    "- Cinematic color grading: rich teal shadows and warm orange/golden highlights, filmic look."
  ].join("\n");

  const techBlock = [
    "- 8K photorealistic, hyper-detailed, impeccable architectural photography.",
    "- Subtle film grain, anamorphic lens characteristics, shallow depth of field, beautiful bokeh.",
    "- Volumetric lighting, light bloom, cinematic color grading.",
    "- Ultra smooth camera movements with Hollywood-level cinematography."
  ].join("\n");

  const styleRefs = [
    "Architectural Digest",
    "Luxe Interiors",
    "Roger Deakins lighting",
    "Yann Arthus-Bertrand aerial photography",
    "Denis Villeneuve cinematic style",
    "Netflix luxury real estate documentaries"
  ].join(", ");

  return [
    "Cinematic luxury real estate video for MiniMax Hailuo Image-to-Video.",
    "",
    firstFrame,
    "",
    "Camera choreography (smooth, emotional and cinematic, 8-12 seconds total):",
    cameraChoreography,
    "",
    "Atmosphere & subtle motion:",
    motionBlock,
    "",
    "Lighting & mood:",
    lightingBlock,
    "",
    "Technical specifications:",
    techBlock,
    "",
    `Style references: ${styleRefs}.`,
    "",
    "Mood: aspirational, serene, luxurious, emotional, sophisticated, dreamlike.",
    "",
    "No people, no text, no logos, no watermarks. Perfect seamless loop possible.",
    "",
    "Masterpiece, best quality, ultra realistic, award-winning cinematography."
  ].join("\n");
}

// ─── Video Script Generator ───────────────────────────────────────────────────

async function genVideoScript(p: any, imgs: string[], tone: string, custom: string) {
  const ctx = propContext(p, imgs);
  const sys = `ROTEIRISTA CINEMATOGRÁFICO PREMIUM para vídeos imobiliários de alto padrão.
Você escreve roteiros para filmes de arquitetura de luxo — não vídeos de corretores.

ESTRUTURA DRAMÁTICA (60-90 segundos):

[HOOK — 0-8s]
Abertura em BLACK. Som ambiente: vento, água, cidade silenciosa.
Primeira imagem: detalhe arquitetônico (maçaneta, luz, textura) + texto poético narração.
Câmera: close-up → establishing shot (slow motion, 2 segundos de silêncio antes do nome).

[APRESENTAÇÃO — 8-25s]
Nome do imóvel + bairro icônico. Drone shot cinematográfico.
Narração: "Este não é apenas um endereço. É uma declaração."
Cut para: living room com iluminação volumétrica dourada.

[TOUR SENSORIAL — 25-65s]
Cada câmera vai a um espaço. Narração descreve SENSações, não metros.
- "A luz que entra pela varanda às 17h... transforma a sala em ouro líquido"
- "A cozinha onde o Chef mora — mármore que guarda o calor do sol"
都用描写 sensorial. Câmera: slow motion, rack focus.

[CTA — 65-90s]
Preço apresentado de forma cinematográfica (não tabular).
Narração: "Alguns endereços não estão à venda. Estão à espera."
Cut final: pôr do sol pela janela + fade to logo.

REGRAS:
- Narração em português, voz em OFF (sempre no presente do subjuntivo poético)
- Duração estimada: 75 segundos
- videoPrompt: Use a função buildHailuoVideoPrompt para gerar o prompt de Image-to-Video

Responda JSON: { "title": "...", "script": "...", "duration_estimate": 75, "hashtags": [...] }`;
  const raw = await omniChat([
    { role: "system", content: sys },
    { role: "user", content: custom ? `${ctx}\n\n${custom}` : ctx },
  ]);
  const j = parseJson(raw);
  const refImg = imgs?.[0] || "";
  const videoPrompt = buildHailuoVideoPrompt(p, refImg);
  return {
    type: "video_script",
    title: j?.title || p?.title || "Roteiro de Vídeo",
    script: j?.script || raw,
    hashtags: j?.hashtags || [],
    duration: j?.duration_estimate || 60,
    imageUrl: refImg || pollinationsImage(`Luxury Brazilian ${(p as any)?.type || "property"} at golden hour, volumetric lighting, cinematic`, 1280, 720),
    videoPrompt,
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
            case "social_post":
            case "instagram_post":
            case "facebook_post":
            case "whatsapp_post": result = await genSocialPost(propData, property_images || [], tone || "professional", platform || "instagram", custom_prompt || ""); break;
            case "story": result = await genStory(propData, property_images || [], tone || "professional", custom_prompt || ""); break;
            case "video_script":
            case "video": result = await genVideoScript(propData, property_images || [], tone || "professional", custom_prompt || ""); break;
            case "voiceover": result = await genVoiceover(propData, tone || "professional"); break;
            case "music": result = await genMusic(propData, tone || "professional"); break;
            case "property_description":
            case "description": result = await genPropertyDescription(propData, tone || "professional"); break;
            case "ad_copy":
            case "ad": result = await genAdCopy(propData, tone || "professional"); break;
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
