/**
 * OmniRoute LLM Integration
 * Provides: Chat widget, NLP search, description generation, recommendation engine
 */

export interface OmniRouteConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface OmniRouteChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface OmniRouteChatResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface PropertyContext {
  tipo?: string;
  bairro?: string;
  cidade?: string;
  preco?: number;
  dormitorios?: number;
  banheiros?: number;
  vagas?: number;
  area?: number;
  amenities?: string[];
  descricao?: string;
  [key: string]: string | number | string[] | undefined;
}

// ─── OmniRoute Client ─────────────────────────────────────────────────────────

// Use local OmniRoute proxy for best performance; falls back to cloud if unreachable
const DEFAULT_BASE_URL = "http://localhost:20128/v1";

function createOmniRouteClient(config: OmniRouteConfig) {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  async function chat(request: OmniRouteChatRequest): Promise<OmniRouteChatResponse> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "auto",
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OmniRoute API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async function generateDescription(
    property: PropertyContext,
    tone: string,
    context: PropertyContext
  ): Promise<string> {
    const propertyDetails = formatPropertyDetails(property);
    const messages = [
      {
        role: "system",
        content: `Você é umCopywriter especialista em imóveis de luxo brasileiro. 
Gere descrições persuasivas, emocionais e sofisticadas. 
Use no máximo 400 caracteres. 
Responda APENAS com a descrição, sem Introduções ou explicações.`,
      },
      {
        role: "user",
        content: `Gere uma descrição de imóvel com o tom "${tone}".

Detalles do imóvel:
${propertyDetails}

Contexto adicional: ${JSON.stringify(context)}`,
      },
    ];

    const result = await chat({ messages, temperature: 0.8, max_tokens: 500 });
    return result.choices[0]?.message?.content?.trim() || "";
  }

  async function nlpSearch(query: string): Promise<Partial<PropertyContext>> {
    const messages = [
      {
        role: "system",
        content: `Você é um assistente de busca imobiliária. Analise a busca do usuário e extraia filtros estruturados.
Responda SOMENTE em JSON válido com este formato:
{
  "tipo": "apartamento|casa|terreno|comercial|...",
  "bairro": "nome do bairro ou null",
  "cidade": "nome da cidade ou null",
  "minPreco": número ou null,
  "maxPreco": número ou null,
  "dormitorios": número ou null,
  "banheiros": número ou null,
  "vagas": número ou null,
  "area": número ou null,
  "purpose": "venda|aluguel|null",
  "query": "termo de busca livre se houver"
}
Não adicione texto além do JSON.`,
      },
      {
        role: "user",
        content: query,
      },
    ];

    const result = await chat({ messages, temperature: 0.1, max_tokens: 500 });
    const raw = result.choices[0]?.message?.content?.trim() || "{}";
    
    try {
      // Attempt to extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(raw);
    } catch {
      return { query };
    }
  }

  async function recommendSimilar(
    currentProperty: PropertyContext,
    allProperties: PropertyContext[]
  ): Promise<PropertyContext[]> {
    if (!allProperties.length) return [];

    const currentDetails = formatPropertyDetails(currentProperty);
    const allDetails = allProperties
      .map((p, i) => `--- Imóvel ${i + 1} ---\n${formatPropertyDetails(p)}`)
      .join("\n\n");

    const messages = [
      {
        role: "system",
        content: `Você é um recomendador de imóveis. Analise o imóvel atual e sugira os 3 mais similares da lista.
Responda APENAS com um JSON array de índices (0-based) dos imóveis mais similares, no formato: [0, 2, 5]
Priorize: tipo > bairro > preço > quartos > banheiros > área.
 Máximo 3 sugestões.`,
      },
      {
        role: "user",
        content: `Imóvel atual:\n${currentDetails}\n\nLista de imóveis:\n${allDetails}\n\nQuais são os 3 mais similares ao imóvel atual?`,
      },
    ];

    const result = await chat({ messages, temperature: 0.2, max_tokens: 200 });
    const raw = result.choices[0]?.message?.content?.trim() || "[]";

    try {
      const indices: number[] = JSON.parse(raw);
      return indices
        .filter((i) => i >= 0 && i < allProperties.length)
        .map((i) => allProperties[i]);
    } catch {
      return [];
    }
  }

  return { chat, generateDescription, nlpSearch, recommendSimilar };
}

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
    p.descricao && `Descrição atual: ${p.descricao}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export { createOmniRouteClient };