import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SUPABASE_URL = "https://udutxbyzrdwucabxqvgg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const OMNIROUTE_BASE = "http://127.0.0.1:20128/v1";
const OMNIROUTE_KEY = "sk-611d5b3c2cca0507-7a32b3-0e17b59f";
const FIRECRAWL_KEY = "fc-992339325e7542fdb2348b03f2c63cb2";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173"
];

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

interface GenerateRequest {
  topic?: string;
  category?: string;
  tenant_id?: string;
  author_id?: string;
}

interface GeneratedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  cover_image_url: string | null;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function fetchWebContent(topic: string): Promise<string> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v0/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        query: `${topic} Brasil 2026 mercado imobiliario`,
        limit: 2,
        source: "web",
      }),
    });

    if (!res.ok) return "";

    const json = await res.json();
    const pages: any[] = json.data || [];
    let context = "";

    for (const page of pages.slice(0, 2)) {
      if (page.markdown) {
        context += page.markdown.slice(0, 2000) + "\n\n";
      }
    }

    return context.slice(0, 6000);
  } catch (e) {
    console.log("Firecrawl error:", e);
    return "";
  }
}

async function generateBlogContent(topic: string, category: string, context: string): Promise<GeneratedPost> {
  const systemPrompt = `Voce e um redator especializado em blog inmobiliario brasileiro. Crie artigos completos e profissionais em Portugues do Brasil.

REGRAS OBRIGATORIAS:
- Use HTML tags: <h2>, <p>, <ul>, <li>, <strong> para formatacao
- Minimo 600 palavras de conteudo real
- Seo otimizado com palavras-chave naturais
- Tom profissional e acessivel
- Titulo com no maximo 65 caracteres
- Excerpt (resumo) com 160-200 caracteres
- Nao use "em dash" â€” use hifens normais

TAGS disponiveis (escolha 2-4):
Financiamento, Investimento Imobiliario, Mercado Imobiliario 2026,
Oportunidades de Mercado, Renda com Aluguel, Valorizacao de Imoveis,
Dicas para Compradores, Documentacao Imobiliaria, Taxas Imobiliarias,
Credito Imobiliario, Primeiro ImÃ³vel, Investidores, Novidades do Mercado`;

  const userPrompt = `Crie um artigo de blog profissional sobre: "${topic}"
Categoria: ${category || "Mercado Imobiliario 2026"}

${context ? `Contexto de pesquisa atual:\n${context}\n\n` : ""}
Retorne APENAS um JSON valido (sem texto antes ou depois):
{
  "title": "titulo ate 65 caracteres",
  "slug": "url-amigavel-com-hifens",
  "excerpt": "resumo de 160-200 caracteres",
  "content": "<artigo completo em HTML com <h2>, <p>, <ul>, <li>>",
  "tags": ["tag1", "tag2", "tag3"],
  "cover_image_url": null
}`;

  const res = await fetch(`${OMNIROUTE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OMNIROUTE_KEY}`,
    },
    body: JSON.stringify({
      model: "minimax/MiniMax-M2.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OmniRoute error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "";

  let parsed: any = null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch (e) {
    console.log("JSON parse error:", e, "Text:", text.slice(0, 200));
  }

  if (!parsed || !parsed.title) {
    throw new Error("Resposta invalida do modelo de IA: " + (text.slice(0, 100) || "vazio"));
  }

  return parsed as GeneratedPost;
}

async function ensureTags(supabase: any, tagNames: string[], tenantId: string): Promise<string[]> {
  const tagIds: string[] = [];

  for (const name of tagNames) {
    const slug = toSlug(name);

    const { data: existing } = await supabase
      .from("blog_tags")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      tagIds.push(existing.id);
    } else {
      const { data: newTag } = await supabase
        .from("blog_tags")
        .insert({ name, slug, tenant_id: tenantId })
        .select("id")
        .single();
      if (newTag) tagIds.push(newTag.id);
    }
  }

  return tagIds;
}

async function saveBlogPost(post: GeneratedPost, tenantId: string, authorId: string, tagIds: string[]) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      tenant_id: tenantId,
      author_id: authorId,
      title: post.title,
      slug: post.slug || toSlug(post.title),
      excerpt: post.excerpt,
      content: post.content,
      cover_image_url: post.cover_image_url,
      published: false,
      published_at: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao salvar post: ${error.message}`);

  if (tagIds.length > 0) {
    const tagLinks = tagIds.map(tagId => ({
      blog_post_id: data.id,
      blog_tag_id: tagId,
    }));
    await supabase.from("blog_post_tags").insert(tagLinks);
  }

  return data.id;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json() as GenerateRequest;
    const { topic, category, tenant_id, author_id } = body;

    if (!topic?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Topic e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!tenant_id?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "tenant_id e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-blog-post] topic="${topic}" category="${category}" tenant=${tenant_id}`);

    const context = await fetchWebContent(topic);
    const generated = await generateBlogContent(topic, category || "Mercado Imobiliario 2026", context);

    const tagIds = await ensureTags(
      createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }),
      generated.tags || [],
      tenant_id
    );

    const postId = await saveBlogPost(
      generated,
      tenant_id,
      author_id || "00000000-0000-0000-0000-000000000000",
      tagIds
    );

    console.log(`[generate-blog-post] saved post ${postId}: ${generated.title}`);

    return new Response(JSON.stringify({
      ok: true,
      data: {
        id: postId,
        title: generated.title,
        slug: generated.slug || toSlug(generated.title),
        excerpt: generated.excerpt,
        content: generated.content,
        cover_image_url: generated.cover_image_url,
        tags: generated.tags,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-blog-post] error:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: err.message || "Erro interno ao gerar post",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
