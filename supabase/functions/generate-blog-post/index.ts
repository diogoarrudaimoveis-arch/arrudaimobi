import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "@supabase/supabase-js@2";

const SUPABASE_URL = "https://udutxbyzrdwucabxqvgg.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// OmniRoute / MiniMax config
const OMNIROUTE_URL = "http://localhost:20128";
const OMNIROUTE_KEY = "sk-611d5b3c2cca0507-ae24f1-8f5fc72c";
const FIRECRAWL_KEY = "fc-992339325e7542fdb2348b03f2c63cb2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  topic?: string;       // tema do post (ex: "investimento imobiliario 2026")
  category?: string;   // categoria (ex: "Investimento Imobiliario")
  tenant_id?: string;
}

interface GeneratedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  cover_image_url: string | null;
  topics_covered: string[];
}

// Fetch real estate content from web using Firecrawl
async function fetchRealEstateContent(topic: string): Promise<string> {
  const searches = [
    `${topic} Brasil 2026`,
    `${topic} mercado imobiliario`,
  ];

  let allContent = "";
  for (const query of searches) {
    try {
      const res = await fetch(`https://api.firecrawl.dev/v0/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FIRECRAWL_KEY}`,
        },
        body: JSON.stringify({
          query,
          limit: 3,
          source: "web",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const pages = json.data || [];
        for (const page of pages.slice(0, 2)) {
          if (page.markdown) {
            allContent += page.markdown.slice(0, 2000) + "\n\n";
          }
        }
      }
    } catch (e) {
      console.log("Firecrawl search error:", e);
    }
  }
  return allContent.slice(0, 8000);
}

// Generate blog post using OmniRoute (MiniMax Text-01)
async function generateBlogPost(topic: string, category: string, context: string): Promise<GeneratedPost> {
  const systemPrompt = `Voce e um redator especialista em blog inmobiliario do Brasil.
Sua tarefa e criar um artigo de blog completo e profissional.

REGRAS OBRIGATORIAS:
- Escreva em Portugues do Brasil
- Use HTML com tags <h2>, <p>, <ul>, <li>, <strong> para formatacao
- O conteudo deve ter no minimo 600 palavras
- Seo otimizado: use palavras-chave naturalmente
- Tom profissional mas accessivel
- Nao use em dash (use hifens normais)
- Titulo com no maximo 70 caracteres
- Resumo (excerpt) com 150-200 caracteres

ESTRUTURA DO ARTIGO:
<h2>Introducao</h2>
<p>Texto introdutorio envolvente...</p>
<h2>Topico 1</h2>
<p>Conteudo...</p>
<h2>Topico 2</h2>
<p>Conteudo...</p>
<h2>Conclusao</h2>
<p>Texto final com chamada para acao...</p>

TAGS permitidas (escolha 2-4):
Financiamento, Investimento Imobiliario, Mercado Imobiliario 2026,
Oportunidades de Mercado, Renda com Aluguel, Valorizacao de Imoveis`;

  const userPrompt = `Crie um artigo completo sobre: "${topic}"

Contexto e dados atuais do mercado:
${context || "Sem dados especificos - use seu conhecimento sobre o mercado imobiliario brasileiro."}

Categoria: ${category || "Mercado Imobiliario 2026"}

Gerar em formato JSON com esta estrutura:
{
  "title": "titulo do artigo ate 70 caracteres",
  "slug": "url-amigavel-com-hifens",
  "excerpt": "resumo de 150-200 caracteres",
  "content": "<html completo do artigo>",
  "tags": ["tag1", "tag2", "tag3"],
  "topics_covered": ["topico1", "topico2", "topico3"]
}`;

  try {
    // Try OmniRoute first
    const omniRes = await fetch(`${OMNIROUTE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNIROUTE_KEY}`,
      },
      body: JSON.stringify({
        model: "minimax/text-01",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (omniRes.ok) {
      const omniJson = await omniRes.json();
      const text = omniJson.choices?.[0]?.message?.content || "";

      // Try to parse JSON from response
      let parsed = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {}

      if (parsed && parsed.title) {
        return parsed as GeneratedPost;
      }
    }
  } catch (e) {
    console.log("OmniRoute error, trying direct MiniMax:", e);
  }

  // Fallback: try MiniMax directly (without /v1 prefix)
  try {
    const miniRes = await fetch("https://api.minimax.chat/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNIROUTE_KEY}`,
      },
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (miniRes.ok) {
      const miniJson = await miniRes.json();
      const text = miniJson.choices?.[0]?.message?.content || "";

      let parsed = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {}

      if (parsed && parsed.title) {
        return parsed as GeneratedPost;
      }
    }
  } catch (e) {
    console.log("MiniMax direct error:", e);
  }

  // Final fallback: structured response from OmniRoute text directly
  try {
    const textRes = await fetch(`${OMNIROUTE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNIROUTE_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (textRes.ok) {
      const textJson = await textRes.json();
      const text = textJson.choices?.[0]?.message?.content || "";

      let parsed = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {}

      if (parsed && parsed.title) {
        return parsed as GeneratedPost;
      }
    }
  } catch (e) {
    console.log("GPT fallback error:", e);
  }

  throw new Error("Nenhum modelo de IA disponivel. Verifique as configuracoes.");
}

// Generate cover image using MiniMax via OmniRoute
async function generateCoverImage(topic: string): Promise<string | null> {
  try {
    const imgRes = await fetch(`${OMNIROUTE_URL}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNIROUTE_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Real estate blog article cover photo for: ${topic}. Professional Brazilian property scene, modern building, clean design, no text.`,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (imgRes.ok) {
      const imgJson = await imgRes.json();
      return imgJson.data?.[0]?.url || null;
    }
  } catch (e) {
    console.log("Image generation error:", e);
  }
  return null;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as GenerateRequest;
    const { topic, category } = body;

    if (!topic?.trim()) {
      return new Response(JSON.stringify({ error: "Topic e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating blog post for topic:", topic);

    // Step 1: Fetch context from web
    const context = await fetchRealEstateContent(topic);

    // Step 2: Generate blog post content with AI
    const generated = await generateBlogPost(topic, category || "Mercado Imobiliario 2026", context);

    // Step 3: Generate cover image
    const coverUrl = await generateCoverImage(generated.title);

    // Step 4: Ensure slug is unique enough
    const slug = generated.slug || generateSlug(generated.title);

    console.log("Blog post generated:", generated.title);

    return new Response(JSON.stringify({
      ok: true,
      data: {
        ...generated,
        slug,
        cover_image_url: coverUrl,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-blog-post error:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: err.message || "Erro interno ao gerar post",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
