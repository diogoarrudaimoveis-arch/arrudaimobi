/**
 * ZPRO Property Catalog — WhatsApp-friendly property listings
 * Block 6b: Auto-reply with property catalog
 */
import { ZPRO_CONFIG } from "./types";

const SUPABASE_PROJECT_ID = "udutxbyzrdwucabxqvgg";

interface CatalogProperty {
  id: string;
  title: string;
  price: number;
  purpose: "sale" | "rent";
  purposeLabel: string;
  city: string | null;
  neighborhood: string | null;
  typeName: string;
  url: string;
  imageUrl: string | null;
}

interface CatalogResult {
  catalog: CatalogProperty[];
  message: string;
}

async function callPublicApi(params: Record<string, string>): Promise<CatalogResult | { message: string }> {
  const searchParams = new URLSearchParams(params);
  const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-api?${searchParams.toString()}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`public-api error: ${res.status}`);
  return res.json() as Promise<CatalogResult | { message: string }>;
}

export async function getPropertyCatalogForWhatsApp(opts: {
  query?: string;
  purpose?: "sale" | "rent";
  typeId?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  limit?: number;
}): Promise<{ catalog: CatalogProperty[]; message: string }> {
  const params: Record<string, string> = { action: "get-property-catalog" };
  if (opts.query) params.q = opts.query;
  if (opts.purpose) params.purpose = opts.purpose;
  if (opts.typeId) params.typeId = opts.typeId;
  if (opts.minPrice) params.minPrice = String(opts.minPrice);
  if (opts.maxPrice) params.maxPrice = String(opts.maxPrice);
  if (opts.bedrooms) params.bedrooms = String(opts.bedrooms);
  if (opts.limit) params.limit = String(opts.limit);

  const result = await callPublicApi(params);
  if ("catalog" in result && result.catalog === null) {
    return { catalog: [], message: result.message || "Nenhum imóvel encontrado." };
  }
  if ("catalog" in result) {
    return { catalog: result.catalog, message: result.message };
  }
  return { catalog: [], message: "Erro ao buscar imóveis." };
}

export async function getPropertyForWhatsApp(id: string): Promise<string> {
  const params = new URLSearchParams({ action: "get-property-whatsapp", id });
  const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-api?${params.toString()}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) return "Erro ao buscar imóvel. 😕";
  const result = (await res.json()) as { message: string };
  return result.message;
}

/**
 * Parse incoming WhatsApp message for property queries.
 * Returns structured query or null if no property intent detected.
 */
export function parsePropertyIntent(text: string): {
  query: string;
  purpose?: "sale" | "rent";
  type?: string;
} | null {
  const t = text.toLowerCase().trim();

  const salePatterns = [/comprar/i, /vender/i, /venda/i, /para\s*venda/i, /compr/i];
  const rentPatterns = [/alugar/i, /aluguel/i, /locação/i, /locacao/i, /para\s*alugar/i];

  let purpose: "sale" | "rent" | undefined;
  if (salePatterns.some((p) => p.test(t))) purpose = "sale";
  else if (rentPatterns.some((p) => p.test(t))) purpose = "rent";

  // Extract neighborhood/city if present
  const query = t
    .replace(/comprar|vender|venda|alugar|aluguel|locação|locacao|para|/gi, "")
    .replace(/\d+/g, "")
    .trim();

  if (!query && !purpose) return null;

  return { query: query.length > 2 ? query : "", purpose };
}

/**
 * Build property interest response when user mentions a specific property.
 * e.g. "tenho interesse no imóvel 123" or "queria saber mais do 456"
 */
export function parsePropertyInterest(text: string): string | null {
  const patterns = [
    /(?:interesse|interessad|mais detalhes|info|veja|saber mais)\s*(?:do|no|no|da)?\s*(?:imóvel|imovel|apartamento|casa|propriedade)?\s*([a-f0-9-]{36})/i,
    /(?:imóvel|imovel)\s*([a-f0-9-]{36})/i,
    /(?:código|codigo|ref|referência)\s*[:\-]?\s*([a-f0-9-]{36})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}