/**
 * Content Hub — Unified AI Generation Library
 * Combines MiniMax (media) + OmniRoute (LLM) for the ultimate real estate content generator.
 *
 * Capabilities:
 *  - Text: blog posts, social posts, ad copy, property descriptions
 *  - Image: AI-generated covers and visuals
 *  - Video: image-to-video clips
 *  - Audio: TTS voiceovers
 *  - Music: background music generation
 *  - Templates: Canvas API professional designs
 */

import { createMiniMaxClient, type MiniMaxConfig } from "@/integrations/minimax/client";
import { createOmniRouteClient, type PropertyContext } from "@/integrations/omniroute/client";

// ─── Types ────────────────────────────────────────────────────────────

export type ContentType =
  | "blog_post"
  | "social_post"
  | "story"
  | "video_script"
  | "voiceover"
  | "music"
  | "property_description"
  | "ad_copy";

export type Tone = "luxury" | "family" | "urgent" | "modern" | "professional";
export type Platform = "instagram" | "facebook" | "youtube" | "whatsapp" | "blog" | "all";
export type MediaFormat = "story" | "post" | "thumb" | "card" | "square" | "cover";

export interface PropertyDetails {
  id?: string;
  title: string;
  price: number;
  city: string;
  state?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  area?: number;
  type?: string;
  description?: string;
  images: string[];
  amenities?: string[];
  code?: string;
  contact?: string;
}

export interface ContentGenerationRequest {
  tenantId: string;
  authorId?: string;
  property?: PropertyDetails;
  contentTypes: ContentType[];
  tone?: Tone;
  platform?: Platform;
  customPrompt?: string;
  useOmniRoute?: boolean; // default true — OmniRoute routes to best LLM
}

export interface GeneratedText {
  title?: string;
  body?: string;
  caption?: string;
  hashtags?: string[];
  script?: string;
  adHeadline?: string;
  adBody?: string;
}

export interface GeneratedMedia {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  musicUrl?: string;
}

export interface GeneratedItem extends GeneratedText, GeneratedMedia {
  type: ContentType;
  prompt?: string; // image generation prompt
}

export interface ContentGenerationResult {
  ok: boolean;
  results: GeneratedItem[];
  provider: string;
  model?: string;
  tokens?: number;
  timeMs?: number;
  error?: string;
}

// ─── Prompt Builders ─────────────────────────────────────────────────

const TONE_DESCRIPTORS: Record<Tone, string> = {
  luxury: "Tom sofisticado e premium. Use palavras como 'exclusivo', 'privilegiado', 'único', 'refinado'. Foco em生活方式 e status.",
  family: "Tom acolhedor e familiar. Foco em espaço, segurança, comunidade, comodidades para crianças e vida em família.",
  urgent: "Tom urgente e persuasivo. Gatilhos de escassez: 'últimas unidades', 'oportunidade limitada', 'não perca'.",
  modern: "Tom moderno e minimalista. Design limpo, fotos em destaque, linguagem contemporânea.",
  professional: "Tom profissional e confiável. Descrição técnica clara, dados objetivos, credibilidade.",
};

function buildBlogPostSystemPrompt(tone: Tone): string {
  return `Você é um copywriter especialista em imóveis brasileiro de alto nível.
Gere conteúdo de blog SEO otimizado para imóveis.
REGRAS:
- Título impactante (max 60 caracteres) com hook emocional
- Introdução envolvente (2-3 frases)
- Corpo com 3-4 parágrafos:/features, localização, diferenciais
- Conclusão com CTA suave
- Use dados do imóvel quando disponíveis
- HTML leve permitido para formatação
- Responda em JSON: { title, body, hashtags }
Depressa com urgência.`;
}

function buildSocialPostSystemPrompt(tone: Tone, platform: Platform): string {
  const platformSpecs: Record<Platform, string> = {
    instagram: "Caption para Instagram: linha 1 hook (pergunta ou dado), linha 2 descrição, linha 3 CTA. Max 2200 caracteres. 5-10 hashtags.",
    facebook: "Post para Facebook: mais informal, conversacional. 2-3 parágrafos curtos. 3-5 hashtags.",
    youtube: "Descrição para YouTube: mais longa e detalhada. Estrutura: hook, overview, highlights, links. 5 hashtags.",
    whatsapp: "Mensagem para WhatsApp: curta e direta. Max 500 caracteres. Tom amigável. Sem hashtags.",
    blog: "Post de blog: formato longo, SEO, 3-5 parágrafos, CTA claro.",
    all: "Caption multi-plataforma: adaptável para Instagram/Facebook/WhatsApp.",
  };
  return `Você é um social media manager especialista em imóveis.
${platformSpecs[platform]}
Tom: ${TONE_DESCRIPTORS[tone]}
Responda em JSON: { caption, hashtags }
Depressa com urgência.`;
}

function buildVideoScriptSystemPrompt(tone: Tone): string {
  return `Você é um roteirista de vídeos imobiliários profissionais.
Gere um roteiro de vídeo curto (60-90 segundos) para redes sociais.
Estrutura:
1. HOOK (5s): pergunta ou dado impactante
2. APRESENTAÇÃO (20s): nome do imóvel, tipo, localização
3. TOUR (40s): principais cômodos e features
4. ENCERRAMENTO (15s): preço, CTA, contato

Responda em JSON: { title, script, duration_estimate, hashtags }
Script em português brasileiro, linguagem natural de locução.`;
}

function buildVoiceoverSystemPrompt(tone: Tone): string {
  return `Você é um roteirista de narrções (voiceover) para vídeos imobiliários.
Gere um texto de narração curto (max 150 palavras) para locução.
Tom: ${TONE_DESCRIPTORS[tone]}
O texto deve ser falado em 30-45 segundos.
Sem hashtags. Sem emojis. Linguagem clara de locução profissional.
Responda APENAS com o texto de narração.`;
}

function buildAdCopySystemPrompt(tone: Tone): string {
  return `Você é um copywriter de anúncios pagos para imóveis.
Gere criativos para Meta Ads (Facebook/Instagram).
Formatos:
- Headline 1 (max 40 chars): benefício emocional
- Headline 2 (max 40 chars): benefício prático
- Description (max 25 chars): detalhe técnico
- CTA: "SAIBA MAIS" | "VISITE" | "AGENDE" | "LIGUE AGORA"

Responda em JSON: { headline1, headline2, description, cta }`;
}

function buildPropertyDescriptionSystemPrompt(tone: Tone): string {
  return `Você é um copywriter especialista em imóveis brasileiros.
Gere uma descrição profissional e persuasiva para o imóvel.
Tom: ${TONE_DESCRIPTORS[tone]}
Max 400 caracteres.
Inclua: tipo, bairro, diferenciais, metragem, preço por m² se relevante.
Responda APENAS com a descrição.`;
}

function buildImagePrompt(property: PropertyDetails, contentType: ContentType): string {
  const base = property.description || property.title;
  const specs: Record<ContentType, string> = {
    blog_post: `Professional real estate photography of ${base}. Bright, airy interior. Brazilian luxury property. High-end finishings, natural lighting. Editorial style, magazine quality. No text. No people.`,
    social_post: `Modern real estate visual for social media: ${base}. Clean composition, golden hour lighting. Instagram-worthy shot. Warm tones, inviting atmosphere. No text overlay. No people.`,
    story: `Vertical real estate story visual: ${base}. Bold composition, high contrast. Mobile-optimized framing. Vibrant yet tasteful. Eye-catching for 24h story. No text.`,
    video_script: `Cinematic real estate shot: ${base}. Smooth camera movement, professional lighting. Video production quality. Real estate showcase style. No text.`,
    voiceover: `Background visual for voiceover video: ${base}. Abstract real estate concept, soft focus. Elegant and calm. Minimalist composition. No text.`,
    music: `Atmospheric visual for music accompaniment: ${base}. Dreamy, ethereal quality. Soft gradients, warm colors. Abstract real estate concept art. No text.`,
    property_description: `Detailed real estate photograph: ${base}. Professional property photography. Bright, well-staged interior. Natural light from windows. No text.`,
    ad_copy: `High-conversion ad creative: ${base}. Bold, attention-grabbing composition. Commercial real estate photography style. Vibrant, emotional. No text.`,
  };
  return specs[contentType] || specs.social_post;
}

// ─── OmniRoute Text Generation ──────────────────────────────────────

async function generateTextViaOmniRoute(
  contentType: ContentType,
  property: PropertyDetails | undefined,
  tone: Tone,
  platform: Platform,
  customPrompt: string,
  apiKey: string
): Promise<GeneratedText> {
  const client = createOmniRouteClient({ apiKey });

  const propDetails = property
    ? `IMÓVEL:\nTipo: ${property.type || "N/A"}\nTítulo: ${property.title}\nCidade: ${property.city}${property.neighborhood ? `, ${property.neighborhood}` : ""}\nPreço: R$ ${Number(property.price).toLocaleString("pt-BR")}\nDormitórios: ${property.bedrooms || "N/A"}\nBanheiros: ${property.bathrooms || "N/A"}\nVagas: ${property.garages || "N/A"}\nÁrea: ${property.area ? `${property.area}m²` : "N/A"}\nComodidades: ${property.amenities?.join(", ") || "N/A"}\nDescrição atual: ${property.description || "N/A"}\n`
    : "";

  const userPrompt = customPrompt
    ? `INSTRUÇÕES ADICIONAIS: ${customPrompt}\n\n${propDetails}`
    : propDetails;

  let systemPrompt: string;
  switch (contentType) {
    case "blog_post":
      systemPrompt = buildBlogPostSystemPrompt(tone);
      break;
    case "social_post":
      systemPrompt = buildSocialPostSystemPrompt(tone, platform);
      break;
    case "video_script":
      systemPrompt = buildVideoScriptSystemPrompt(tone);
      break;
    case "voiceover":
      systemPrompt = buildVoiceoverSystemPrompt(tone);
      break;
    case "ad_copy":
      systemPrompt = buildAdCopySystemPrompt(tone);
      break;
    case "property_description":
      systemPrompt = buildPropertyDescriptionSystemPrompt(tone);
      break;
    default:
      systemPrompt = buildSocialPostSystemPrompt(tone, platform);
  }

  const result = await client.chat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 1500,
  });

  const raw = result.choices[0]?.message?.content?.trim() || "{}";

  // Extract JSON from response (handles markdown code blocks)
  let parsed: any = {};
  try {
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)```/) || raw.match(/```\n?([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      parsed = JSON.parse(raw);
    }
  } catch {
    // If not JSON, return as body text
    return { body: raw };
  }

  return parsed as GeneratedText;
}

// ─── MiniMax Media Generation ──────────────────────────────────────

async function generateImageViaMiniMax(
  prompt: string,
  config: MiniMaxConfig
): Promise<string> {
  const client = createMiniMaxClient(config);

  // Use Flux model for best quality real estate images
  const imageUrl = await client.generateImage({
    prompt,
    model: "image-01",
    width: 1280,
    height: 720,
    steps: 30,
  });

  return imageUrl;
}

async function generateVideoViaMiniMax(
  imageUrls: string[],
  prompt: string,
  config: MiniMaxConfig
): Promise<string> {
  const client = createMiniMaxClient(config);
  const videoUrl = await client.generateVideo({
    images: imageUrls,
    prompt: prompt || "smooth camera pan, cinematic lighting, real estate showcase",
    duration: 5,
  });
  return videoUrl;
}

async function generateTTSViaMiniMax(
  text: string,
  voice: string,
  config: MiniMaxConfig
): Promise<string> {
  const client = createMiniMaxClient(config);
  const audioUrl = await client.textToSpeech({
    text,
    voice,
    speed: 1.0,
  });
  return audioUrl;
}

async function generateMusicViaMiniMax(
  prompt: string,
  config: MiniMaxConfig
): Promise<string> {
  const client = createMiniMaxClient(config);
  const musicUrl = await client.generateMusic({
    prompt,
    genre: "ambient",
    mood: "calm",
  });
  return musicUrl;
}

// ─── Main Content Generator ───────────────────────────────────────

export async function generateContentHub(
  request: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  const start = Date.now();
  const {
    tenantId,
    authorId,
    property,
    contentTypes,
    tone = "professional",
    platform = "all",
    customPrompt,
    useOmniRoute = true,
  } = request;

  // Determine API keys from environment / tenant settings
  const minimaxApiKey = import.meta.env.VITE_MINIMAX_API_KEY || "";
  const minimaxGroupId = import.meta.env.VITE_MINIMAX_GROUP_ID || "";
  const omnirouteApiKey = import.meta.env.VITE_OMNIROUTE_API_KEY || "";

  const results: GeneratedItem[] = [];
  let providerUsed = "omniroute";

  const minimaxConfig: MiniMaxConfig = {
    apiKey: minimaxApiKey,
    groupId: minimaxGroupId,
  };

  for (const contentType of contentTypes) {
    try {
      const item: GeneratedItem = { type: contentType };

      // ── TEXT GENERATION ──────────────────────────────────────────
      if (["blog_post", "social_post", "video_script", "voiceover", "ad_copy", "property_description"].includes(contentType)) {
        if (useOmniRoute && omnirouteApiKey) {
          const textResult = await generateTextViaOmniRoute(
            contentType,
            property,
            tone,
            platform,
            customPrompt || "",
            omnirouteApiKey
          );
          Object.assign(item, textResult);
        } else if (minimaxApiKey) {
          // Fallback: use MiniMax text model via chat
          const response = await fetch("https://api.minimax.chat/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${minimaxApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "MiniMax-Text-01",
              messages: [
                { role: "system", content: `Você é um copywriter especialista em imóveis. Tom: ${TONE_DESCRIPTORS[tone]}. Responda em JSON.` },
                { role: "user", content: `Gere conteúdo tipo ${contentType} para imóvel: ${JSON.stringify(property || {})}. Prompt adicional: ${customPrompt || ""}` },
              ],
              max_tokens: 1000,
            }),
          });
          const json = await response.json();
          const raw = json.choices?.[0]?.message?.content || "{}";
          try {
            const parsed = JSON.parse(raw.includes("{") ? raw.match(/\{[\s\S]*\}/)?.[0] || raw : raw);
            Object.assign(item, parsed);
          } catch {
            item.body = raw;
          }
          providerUsed = "minimax";
        }
      }

      // ── IMAGE GENERATION ─────────────────────────────────────────
      if (["blog_post", "social_post", "story", "ad_copy", "property_description"].includes(contentType)) {
        if (minimaxApiKey) {
          const imagePrompt = buildImagePrompt(property || { title: customPrompt || "Luxury real estate property", price: 0, city: "Brazil", images: [] }, contentType);
          item.prompt = imagePrompt;
          item.imageUrl = await generateImageViaMiniMax(imagePrompt, minimaxConfig);
        }
      }

      // ── VIDEO GENERATION ─────────────────────────────────────────
      if (contentType === "video_script" && property?.images?.length && minimaxApiKey) {
        item.videoUrl = await generateVideoViaMiniMax(
          property.images.slice(0, 4),
          `Real estate showcase video: ${property.title}`,
          minimaxConfig
        );
      }

      // ── TTS VOICEOVER ─────────────────────────────────────────────
      if (contentType === "voiceover" && item.script && minimaxApiKey) {
        item.audioUrl = await generateTTSViaMiniMax(
          item.script.slice(0, 500),
          "female-br-natalia", // Brazilian Portuguese female voice
          minimaxConfig
        );
      }

      // ── MUSIC GENERATION ─────────────────────────────────────────
      if (contentType === "music" && minimaxApiKey) {
        const musicPrompt = `Calm, elegant ambient music for luxury real estate video. Soft piano, subtle strings, peaceful atmosphere. ${property?.description || ""}`;
        item.musicUrl = await generateMusicViaMiniMax(musicPrompt, minimaxConfig);
      }

      // ── FALLBACK: use property image for posts ───────────────────
      if (contentType === "blog_post" && !item.imageUrl && property?.images?.length) {
        item.imageUrl = property.images[0];
      }

      results.push(item);
    } catch (err: any) {
      results.push({
        type: contentType,
        body: "",
        error: err.message,
      } as GeneratedItem);
    }
  }

  return {
    ok: true,
    results,
    provider: providerUsed,
    timeMs: Date.now() - start,
  };
}

// ─── Utility: Composite logo onto image ────────────────────────────

export async function compositeImageWithLogo(
  imageUrl: string,
  logoUrl: string,
  position: "bottom-right" | "bottom-left" | "top-right" = "bottom-right"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas not supported")); return; }

    const img = new Image();
    const logo = new Image();
    let loaded = 0;

    const checkDone = () => {
      if (++loaded === 2) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const maxLogoW = canvas.width * 0.18;
        const ratio = logo.naturalWidth / logo.naturalHeight;
        const logoW = Math.min(maxLogoW, logo.naturalWidth);
        const logoH = logoW / ratio;

        let lx: number, ly: number;
        switch (position) {
          case "bottom-left":  lx = 16; ly = canvas.height - logoH - 16; break;
          case "top-right":    lx = canvas.width - logoW - 16; ly = 16; break;
          default:             lx = canvas.width - logoW - 16; ly = canvas.height - logoH - 16; break;
        }

        // White rounded rect behind logo
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        roundRect(ctx, lx - 8, ly - 8, logoW + 16, logoH + 16, 8);
        ctx.fill();

        ctx.drawImage(logo, lx, ly, logoW, logoH);
        resolve(canvas.toDataURL("image/png"));
      }
    };

    img.crossOrigin = "anonymous";
    logo.crossOrigin = "anonymous";
    img.onload = checkDone;
    logo.onload = checkDone;
    img.onerror = () => { loaded++; checkDone(); };
    logo.onerror = () => { loaded++; checkDone(); };
    img.src = imageUrl;
    logo.src = logoUrl;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
