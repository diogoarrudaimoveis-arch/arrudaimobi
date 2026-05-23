/**
 * Creative Automation Pipeline
 * Generates: Carousels, Stories, Videos for paid traffic (Meta Ads)
 * Uses: OmniRoute (LLM) + MiniMax (video/image/music) + OpenAI/Gemini (layout)
 */

import type { PropertyContext } from "@/integrations/omniroute/client";
import { createMiniMaxClient, type MiniMaxConfig } from "@/integrations/minimax/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CarouselSlide {
  imageUrl: string;
  headline: string;
  subheadline?: string;
  cta?: string;
  backgroundColor?: string;
}

export interface CarouselOutput {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  format: "instagram" | "facebook" | "stories" | "tiktok";
}

export interface StorySlide {
  imageUrl: string;
  text: string;
  duration: number; // seconds (3-10)
  animation?: "fade" | "slide-up" | "zoom-in" | "typewriter";
  backgroundColor?: string;
}

export interface StoryOutput {
  slides: StorySlide[];
  audioUrl?: string;
  totalDuration: number;
  platform: "instagram" | "tiktok" | "whatsapp";
}

export interface VideoOutput {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  caption: string;
  hashtags: string[];
  musicUrl?: string;
}

export interface CreativeRequest {
  property: PropertyContext;
  photos: string[]; // URLs of property images
  format: "carousel" | "story" | "video" | "all";
  tone: "luxury" | "family" | "modern" | "urgent" | "premium";
  platform: "instagram" | "facebook" | "tiktok" | "all";
  includeVoiceover?: boolean;
  includeMusic?: boolean;
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

function buildCarouselSystemPrompt(tone: string): string {
  const tones = {
    luxury: "Você é um designer de anúncios premium para imóveis de luxo. Crie carrosséis sofisticados com copywriting de alto impacto.",
    family: "Você é um especialista em marketing para famílias. Foco em espaço, segurança e comunidade.",
    modern: "Design minimalista e moderno. Wireframes limpos, fotos em destaque.",
    urgent: "Gatilho de urgência: ofertas por tempo limitado, últimas unidades.",
    premium: "Tom sofisticado, palavras como 'exclusivo', 'privilegiado', 'único'.",
  };
  return tones[tone as keyof typeof tones] ?? tones.premium;
}

function buildCarouselUserPrompt(property: PropertyContext, slideCount: number): string {
  return `Gere um carrossel de ${slideCount} slides para anúncio imobiliário.

IMMÓVEL:
${formatPropertyDetails(property)}

REGRAS:
- Slide 1: Hook (pergunta ou dado impactante) + foto principal
- Slides 2-${slideCount - 1}: Features do imóvel com fotos
- Último slide: CTA + contato
- Cada slide: headline (máx 8 palavras) + subheadline (máx 15 palavras)
- Use emojis strategically
- CTA: "SAIBA MAIS", "VISITE", "AGENDE VISITA"

Responda em JSON com este formato:
{
  "slides": [
    {
      "headline": "texto",
      "subheadline": "texto",
      "cta": "texto",
      "image_prompt": "detailed prompt for image generation"
    }
  ],
  "caption": "legenda completa do carrossel",
  "hashtags": ["#tag1", "#tag2"]
}`;
}

// ─── Carousel Generator ──────────────────────────────────────────────────────

export async function generateCarousel(
  request: CreativeRequest,
  miniMaxConfig: MiniMaxConfig,
  apiKey: string // OmniRoute API key
): Promise<CarouselOutput> {
  const slideCount = request.photos.length >= 4 ? 5 : Math.max(3, request.photos.length);

  // 1. LLM generates slide structure
  const llmResponse = await fetch("http://localhost:20128/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "antigravity/gemini-3-flash-agent",
      messages: [
        { role: "system", content: buildCarouselSystemPrompt(request.tone) },
        { role: "user", content: buildCarouselUserPrompt(request.property, slideCount) },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    }),
  });

  const llmData = await llmResponse.json();
  const content = llmData.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

  const miniMax = createMiniMaxClient(miniMaxConfig);

  // 2. Generate images for slides without photos
  const slides = await Promise.all(
    (parsed.slides ?? []).map(async (slide: { headline: string; subheadline?: string; cta?: string; image_prompt?: string }, i: number) => {
      const imageUrl = request.photos[i]
        ?? (slide.image_prompt ? await miniMax.generateImage({ prompt: slide.image_prompt, width: 1080, height: 1080 })
          : "");

      return {
        imageUrl,
        headline: slide.headline ?? "",
        subheadline: slide.subheadline ?? "",
        cta: slide.cta ?? "SAIBA MAIS",
      } satisfies CarouselSlide;
    })
  );

  return {
    slides,
    caption: parsed.caption ?? "",
    hashtags: parsed.hashtags ?? [],
    format: "instagram",
  };
}

// ─── Story Generator ────────────────────────────────────────────────────────

export async function generateStory(
  request: CreativeRequest,
  miniMaxConfig: MiniMaxConfig,
  apiKey: string
): Promise<StoryOutput> {
  const slideCount = 5;

  const storyPrompt = `Gere uma story de ${slideCount} telas (1080x1920) para anúncio imobiliário.

IMMÓVEL: ${formatPropertyDetails(request.property)}
TOM: ${request.tone}
PLATFORM: ${request.platform}

REGRAS:
- Tela 1: Hook impactante (texto grande, fundo chamativo)
- Tela 2: Foto principal + dado interessante
- Tela 3: Features principais (ícones + texto curto)
- Tela 4: Depoimento ou social proof
- Tela 5: CTA final (whatsapp/contato)
- Cada tela: texto máx 10 palavras, duração 4s
- Animações: fade, zoom-in, slide-up, typewriter

Responda JSON:
{
  "slides": [
    {
      "text": "texto da tela",
      "duration": 4,
      "animation": "fade",
      "backgroundColor": "#hex",
      "image_prompt": "prompt para imagem"
    }
  ]
}`;

  const llmResponse = await fetch("http://localhost:20128/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "antigravity/gemini-3-flash-agent",
      messages: [
        { role: "system", content: "Você é um roteirista de stories para anúncios imobiliários." },
        { role: "user", content: storyPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    }),
  });

  const llmData = await llmResponse.json();
  const content = llmData.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

  const miniMax = createMiniMaxClient(miniMaxConfig);

  const slides = await Promise.all(
    (parsed.slides ?? []).map(async (slide: { text: string; duration?: number; animation?: string; backgroundColor?: string; image_prompt?: string }, i: number) => {
      const imageUrl = request.photos[i]
        ?? (slide.image_prompt ? await miniMax.generateImage({ prompt: slide.image_prompt, width: 1080, height: 1920 })
          : "");

      return {
        imageUrl,
        text: slide.text ?? "",
        duration: slide.duration ?? 4,
        animation: slide.animation ?? "fade",
        backgroundColor: slide.backgroundColor ?? "#1a1a2e",
      } satisfies StorySlide;
    })
  );

  return {
    slides,
    totalDuration: slides.reduce((sum, s) => sum + s.duration, 0),
    platform: request.platform as "instagram" | "tiktok" | "whatsapp",
  };
}

// ─── Video Generator ─────────────────────────────────────────────────────────

export async function generateVideo(
  request: CreativeRequest,
  miniMaxConfig: MiniMaxConfig,
  apiKey: string
): Promise<VideoOutput> {
  const miniMax = createMiniMaxClient(miniMaxConfig);

  // 1. Enhance property images
  const enhancedImages = await Promise.all(
    request.photos.slice(0, 5).map((url) =>
      miniMax.generateImage({
        prompt: `professional real estate photo enhancement, HDR, enhanced lighting, ${url}`,
        width: 1280,
        height: 720,
      })
    )
  );

  // 2. Generate narration script
  const narrPrompt = `Gere um roteiro de narração para vídeo imobiliário (máx 30 segundos).

IMÓVEL: ${formatPropertyDetails(request.property)}
TOM: ${request.tone}

Responda APENAS com o texto da narração (máx 80 palavras).`;

  const llmResponse = await fetch("http://localhost:20128/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "antigravity/gemini-3-flash-agent",
      messages: [
        { role: "system", content: "Você é um roteirista de vídeos para marketing imobiliário." },
        { role: "user", content: narrPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  const llmData = await llmResponse.json();
  const narration = llmData.choices?.[0]?.message?.content?.trim() ?? "";

  // 3. TTS narration
  let audioUrl = "";
  if (narration && request.includeVoiceover !== false) {
    audioUrl = await miniMax.textToSpeech({
      text: narration,
      voice: "male-qn-qingse",
      speed: 1.0,
    });
  }

  // 4. Generate video
  const videoUrl = await miniMax.generateVideo({
    images: enhancedImages,
    prompt: "smooth cinematic camera movement, drone shots, professional real estate walkthrough",
    duration: 5,
  });

  // 5. Generate caption + hashtags
  const capPrompt = `Gere legenda e hashtags para reels de imóvel.

IMÓVEL: ${formatPropertyDetails(request.property)}

Máx 30 palavras de legenda + 10 hashtags. Responda JSON: {"caption": "", "hashtags": []}`;

  const capResponse = await fetch("http://localhost:20128/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "antigravity/gemini-3-flash-agent",
      messages: [
        { role: "system", content: "Você é um copywriter de reels para marketing imobiliário." },
        { role: "user", content: capPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  const capData = await capResponse.json();
  const capContent = capData.choices?.[0]?.message?.content ?? "{}";
  const capParsed = JSON.parse(capContent.match(/\{[\s\S]*\}/)?.[0] ?? '{"caption":"","hashtags":[]}');

  return {
    videoUrl,
    thumbnailUrl: enhancedImages[0] ?? "",
    duration: 5,
    caption: capParsed.caption ?? "",
    hashtags: capParsed.hashtags ?? [],
    musicUrl: request.includeMusic ? await miniMax.generateMusic({ prompt: "upbeat modern real estate background music", genre: "ambient", mood: "upbeat" }) : undefined,
  };
}

// ─── Full Pipeline ──────────────────────────────────────────────────────────────

export async function generateCreativeAll(
  request: CreativeRequest,
  miniMaxConfig: MiniMaxConfig,
  apiKey: string
): Promise<{ carousel?: CarouselOutput; story?: StoryOutput; video?: VideoOutput }> {
  const results: { carousel?: CarouselOutput; story?: StoryOutput; video?: VideoOutput } = {};

  if (request.format === "carousel" || request.format === "all") {
    results.carousel = await generateCarousel(request, miniMaxConfig, apiKey);
  }
  if (request.format === "story" || request.format === "all") {
    results.story = await generateStory(request, miniMaxConfig, apiKey);
  }
  if (request.format === "video" || request.format === "all") {
    results.video = await generateVideo(request, miniMaxConfig, apiKey);
  }

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPropertyDetails(p: PropertyContext): string {
  return [
    p.tipo && `Tipo: ${p.tipo}`,
    p.bairro && `Bairro: ${p.bairro}`,
    p.cidade && `Cidade: ${p.cidade}`,
    p.preco && `Preço: R$ ${Number(p.preco).toLocaleString("pt-BR")}`,
    p.dormitorios && `Dormitórios: ${p.dormitorios}`,
    p.banheiros && `Banheiros: ${p.banheiros}`,
    p.vagas && `Vagas: ${p.vagas}`,
    p.area && `Área: ${p.area}m²`,
    p.amenities?.length && `Comodidades: ${p.amenities.join(", ")}`,
    p.descricao && `Descrição: ${p.descricao}`,
  ]
    .filter(Boolean)
    .join("\n");
}