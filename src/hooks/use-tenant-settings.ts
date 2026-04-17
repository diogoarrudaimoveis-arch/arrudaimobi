import { useQuery } from "@tanstack/react-query";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE = `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api`;
const TENANT_SETTINGS_CACHE_KEY = "tenant-settings-cache-v1";

export interface TenantSettings {
  hero_headline?: string;
  hero_subheadline?: string;
  hero_headline_visible?: boolean;
  hero_subheadline_visible?: boolean;
  hero_search_visible?: boolean;
  contact_phone?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  contact_address?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_youtube?: string;
  social_tiktok?: string;
  business_hours?: string;
  business_hours_secondary?: string;
  allow_registration?: boolean;
  whatsapp_template?: string;
  // Branding
  primary_color?: string;
  gradient_from?: string;
  gradient_to?: string;
  logo_mode?: "text" | "image";
  logo_url?: string;
  footer_description?: string;
  footer_quick_links_visible?: boolean;
  footer_property_types_visible?: boolean;
  stats_counters?: {
    show_stats?: boolean;
    properties_count?: string;
    clients_served?: string;
    active_agents?: string;
    cities_served?: string;
  };
  // Hero background
  hero_bg_mode?: "gradient" | "image";
  hero_bg_image_url?: string;
  hero_bg_crop?: { x: number; y: number; width: number; height: number };
  hero_bg_overlay_opacity?: number;
  hero_bg_position?: "center" | "top" | "bottom";
  // PWA
  pwa_icon_192?: string;
  pwa_icon_512?: string;
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings | null;
}

function isTenantData(value: unknown): value is TenantData {
  return !!value && typeof value === "object" && "id" in value && "name" in value && "slug" in value && "settings" in value;
}

function readTenantSettingsCache(): TenantData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TENANT_SETTINGS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    if (isTenantData(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object" && "data" in parsed) {
      const nested = (parsed as { data?: unknown }).data;
      return isTenantData(nested) ? nested : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function getCachedTenantSettings() {
  return readTenantSettingsCache();
}

export function setCachedTenantSettings(data: TenantData | null) {
  if (typeof window === "undefined") return;

  try {
    if (!data) {
      window.localStorage.removeItem(TENANT_SETTINGS_CACHE_KEY);
      return;
    }

    window.localStorage.setItem(
      TENANT_SETTINGS_CACHE_KEY,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // Ignora falhas de storage para não quebrar a UI
  }
}

export function updateCachedTenantSettings(
  updater: (current: TenantData | null) => TenantData | null
) {
  const next = updater(readTenantSettingsCache());
  setCachedTenantSettings(next);
  return next;
}

async function fetchTenantSettings(): Promise<TenantData | null> {
  const res = await fetch(`${BASE}?action=get-tenant-settings`);
  if (!res.ok) throw new Error("Erro ao buscar configurações");

  const data = await res.json();
  setCachedTenantSettings(data);
  return data;
}

export function useTenantSettings() {
  return useQuery({
    queryKey: ["tenant-settings"],
    queryFn: fetchTenantSettings,
    staleTime: 5 * 60 * 1000,
    initialData: getCachedTenantSettings() ?? undefined,
  });
}
