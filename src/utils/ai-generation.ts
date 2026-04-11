/**
 * AI Generation Service
 * Suporta múltiplas chaves com rodízio (Round-Robin) e fallback automático entre provedores.
 */

import { getNextAvailableKey, type AISettings } from "@/hooks/use-ai-settings";

export type AIProvider = "openai" | "gemini" | "groq";

export interface GenerateDescriptionOptions {
  title: string;
  type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  price?: number;
  address?: string;
  amenities?: string[];
  settings: AISettings;
}

// ─── Provider call implementations ───────────────────────────────────────────

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.75,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error?.message ?? `OpenAI error ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error?.message ?? `Gemini error ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.75,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error?.message ?? `Groq error ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// ─── Dispatch to correct provider ─────────────────────────────────────────

async function callProvider(provider: AIProvider, apiKey: string, prompt: string): Promise<string> {
  switch (provider) {
    case "openai": return callOpenAI(apiKey, prompt);
    case "gemini": return callGemini(apiKey, prompt);
    case "groq":   return callGroq(apiKey, prompt);
  }
}

function getKeysForProvider(provider: AIProvider, settings: AISettings): string[] {
  switch (provider) {
    case "openai": return settings.openai_keys ?? [];
    case "gemini": return settings.gemini_keys ?? [];
    case "groq":   return settings.groq_keys ?? [];
  }
}

// ─── Try all keys for a single provider ──────────────────────────────────────

async function tryProvider(
  provider: AIProvider,
  settings: AISettings,
  prompt: string
): Promise<string | null> {
  const keys = getKeysForProvider(provider, settings).filter((k) => k.trim() !== "");
  if (keys.length === 0) return null;

  // Try each key using round-robin starting point, then iterate remaining
  const startKey = getNextAvailableKey(provider, keys);
  const orderedKeys = startKey
    ? [startKey, ...keys.filter((k) => k !== startKey)]
    : keys;

  for (const key of orderedKeys) {
    try {
      const result = await callProvider(provider, key, prompt);
      if (result) return result;
    } catch (err: any) {
      // 429 = rate limit, 500 = server error → try next key
      const status = err?.status ?? 0;
      const isRetryable = status === 429 || status >= 500;
      if (!isRetryable) throw err; // auth errors etc. should bubble up
      console.warn(`[AI] Key failed for ${provider} (${status}), trying next...`);
    }
  }
  return null;
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generatePropertyDescription(
  options: GenerateDescriptionOptions
): Promise<string> {
  const { settings, title, type, bedrooms, bathrooms, area, price, address, amenities } = options;

  const prompt = [
    `Crie uma descrição imobiliária profissional, persuasiva e envolvente em português brasileiro para o seguinte imóvel:`,
    `Título: ${title}`,
    type && `Tipo: ${type}`,
    bedrooms && `Quartos: ${bedrooms}`,
    bathrooms && `Banheiros: ${bathrooms}`,
    area && `Área: ${area}m²`,
    price && `Preço: R$ ${price.toLocaleString("pt-BR")}`,
    address && `Localização: ${address}`,
    amenities?.length && `Comodidades: ${amenities.join(", ")}`,
    `\nEscreva em 3-4 parágrafos fluidos, destacando benefícios emocionais e estilo de vida. Não utilize bullet points.`,
  ]
    .filter(Boolean)
    .join("\n");

  const primary = (settings.primary_provider ?? "openai") as AIProvider;
  const allProviders: AIProvider[] = ["openai", "gemini", "groq"];
  const fallbackOrder = [primary, ...allProviders.filter((p) => p !== primary)];

  if (settings.rotation_strategy === "primary_only") {
    // Only try primary provider
    const result = await tryProvider(primary, settings, prompt);
    if (!result) throw new Error(`Nenhuma chave disponível para o provedor "${primary}".`);
    return result;
  }

  if (settings.rotation_strategy === "rotation") {
    // Pick ONE random provider among those with keys, use round-robin within it
    const available = allProviders.filter(
      (p) => getKeysForProvider(p, settings).length > 0
    );
    if (available.length === 0) throw new Error("Nenhuma chave de IA configurada.");
    const chosen = available[Math.floor(Math.random() * available.length)];
    const result = await tryProvider(chosen, settings, prompt);
    if (!result) throw new Error(`Provedor "${chosen}" retornou vazio.`);
    return result;
  }

  // Default: "fallback" — try primary then others
  for (const provider of fallbackOrder) {
    try {
      const result = await tryProvider(provider, settings, prompt);
      if (result) return result;
    } catch (err: any) {
      console.warn(`[AI] Provider "${provider}" falhou:`, err.message);
    }
  }

  throw new Error(
    "Todos os provedores e chaves de IA falharam. Verifique suas configurações."
  );
}
