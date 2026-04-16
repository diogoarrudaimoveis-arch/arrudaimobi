import { useQuery } from "@tanstack/react-query";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function callPublicApi(action: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({ action, ...params });
  const url = `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// =============================================================================
// DB Types (snake_case — alinhados ao schema do Supabase)
// =============================================================================

export interface DbPropertyImage {
  id: string;
  url: string;
  alt: string | null;
  display_order: number | null;
}

export interface DbPropertyAmenity {
  amenity_id: string;
  amenities: { id: string; name: string; icon: string | null };
}

export interface DbPropertyType {
  id: string;
  name: string;
  icon: string | null;
}

export interface DbAgent {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  email: string | null;
  tenant_id: string;
  role: string;
  properties_count: number;
  properties?: DbProperty[];
}

export interface DbProperty {
  id: string;
  title: string;
  description: string | null;
  purpose: "sale" | "rent";
  status: "available" | "sold" | "rented" | "pending";
  price: number;
  currency: string | null;
  area: number | null;
  area_total: number | null;
  area_useful: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  agent_id: string | null;
  type_id: string | null;
  property_types: DbPropertyType | null;
  property_images: DbPropertyImage[];
  property_amenities?: DbPropertyAmenity[];
  agent?: Pick<DbAgent, "user_id" | "full_name" | "avatar_url" | "phone" | "bio"> | null;
}

// =============================================================================
// Frontend Types (camelCase — para uso nos componentes React)
// =============================================================================

export interface PropertyImage {
  id: string;
  url: string;
  alt: string | null;
  displayOrder: number | null;
}

export interface PropertyAmenity {
  amenityId: string;
  amenity: { id: string; name: string; icon: string | null };
}

export interface PropertyType {
  id: string;
  name: string;
  icon: string | null;
}

export interface PropertyAgent {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  bio: string | null;
}

export interface Property {
  id: string;
  title: string;
  description: string | null;
  purpose: "sale" | "rent";
  status: "available" | "sold" | "rented" | "pending";
  price: number;
  currency: string | null;
  area: number | null;
  areaTotal: number | null;
  areaUseful: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  featured: boolean | null;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  agentId: string | null;
  typeId: string | null;
  propertyType: PropertyType | null;
  images: PropertyImage[];
  amenities: PropertyAmenity[];
  agent: PropertyAgent | null;
}

export interface Agent {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  bio: string | null;
  email: string | null;
  tenantId: string;
  role: string;
  propertiesCount: number;
  properties?: Property[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// Mappers: DB (snake_case) => Frontend (camelCase)
// =============================================================================

export function mapDbImage(img: DbPropertyImage): PropertyImage {
  return {
    id: img.id,
    url: img.url,
    alt: img.alt,
    displayOrder: img.display_order,
  };
}

export function mapDbAmenity(pa: DbPropertyAmenity): PropertyAmenity {
  return {
    amenityId: pa.amenity_id,
    amenity: pa.amenities,
  };
}

export function mapDbProperty(p: DbProperty): Property {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    purpose: p.purpose,
    status: p.status,
    price: p.price,
    currency: p.currency,
    area: p.area,
    areaTotal: p.area_total,
    areaUseful: p.area_useful,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    garages: p.garages,
    address: p.address,
    city: p.city,
    state: p.state,
    neighborhood: p.neighborhood,
    zipCode: p.zip_code,
    latitude: p.latitude,
    longitude: p.longitude,
    featured: p.featured,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    tenantId: p.tenant_id,
    agentId: p.agent_id,
    typeId: p.type_id,
    propertyType: p.property_types ?? null,
    images: (p.property_images ?? []).map(mapDbImage),
    amenities: (p.property_amenities ?? []).map(mapDbAmenity),
    agent: p.agent
      ? {
        userId: p.agent.user_id,
        fullName: p.agent.full_name,
        avatarUrl: p.agent.avatar_url,
        phone: p.agent.phone,
        bio: p.agent.bio,
      }
      : null,
  };
}

export function mapDbAgent(a: DbAgent): Agent {
  return {
    id: a.id,
    userId: a.user_id,
    fullName: a.full_name,
    avatarUrl: a.avatar_url,
    phone: a.phone,
    bio: a.bio,
    email: a.email,
    tenantId: a.tenant_id,
    role: a.role,
    propertiesCount: a.properties_count,
    properties: a.properties?.map(mapDbProperty),
  };
}

function mapPaginated<Db, Frontend>(
  res: PaginatedResponse<Db>,
  mapper: (item: Db) => Frontend
): PaginatedResponse<Frontend> {
  return { ...res, data: res.data.map(mapper) };
}

// =============================================================================
// Hooks públicos (retornam tipos camelCase para os componentes)
// =============================================================================

export function usePublicProperties(filters: Record<string, string> = {}) {
  return useQuery<PaginatedResponse<Property>>({
    queryKey: ["public-properties", filters],
    queryFn: async () => {
      const res: PaginatedResponse<DbProperty> = await callPublicApi("list-properties", filters);
      return mapPaginated(res, mapDbProperty);
    },
    staleTime: 30_000,
  });
}

export function usePublicProperty(id: string | undefined) {
  return useQuery<Property | null>({
    queryKey: ["public-property", id],
    queryFn: async () => {
      const res: DbProperty | null = await callPublicApi("get-property", { id: id! });
      return res ? mapDbProperty(res) : null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function usePublicAgents(filters: Record<string, string> = {}) {
  return useQuery<PaginatedResponse<Agent>>({
    queryKey: ["public-agents", filters],
    queryFn: async () => {
      const res: PaginatedResponse<DbAgent> = await callPublicApi("list-agents", filters);
      return mapPaginated(res, mapDbAgent);
    },
    staleTime: 60_000,
  });
}

export function usePublicAgent(userId: string | undefined) {
  return useQuery<Agent & { properties: Property[] }>({
    queryKey: ["public-agent", userId],
    queryFn: async () => {
      const res: DbAgent & { properties: DbProperty[] } = await callPublicApi("get-agent", { userId: userId! });
      const agent = mapDbAgent(res);
      return {
        ...agent,
        properties: (res.properties ?? []).map(mapDbProperty),
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function usePropertyTypes() {
  return useQuery<{ id: string; name: string; icon: string | null; active: boolean }[]>({
    queryKey: ["public-property-types"],
    queryFn: () => callPublicApi("list-property-types"),
    staleTime: 120_000,
  });
}

export function useCities() {
  return useQuery<string[]>({
    queryKey: ["public-cities"],
    queryFn: () => callPublicApi("list-cities"),
    staleTime: 120_000,
  });
}

export function usePublicStats() {
  return useQuery<{ properties_count: number; agents_count: number; cities_count: number }>({
    queryKey: ["public-stats"],
    queryFn: () => callPublicApi("stats"),
    staleTime: 60_000,
  });
}
