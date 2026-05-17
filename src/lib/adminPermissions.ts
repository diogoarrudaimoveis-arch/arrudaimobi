// Centralized role permissions for Arruda Imobi Admin
// Source of truth for all role-based access control

export type AppRole = "admin" | "developer" | "agent" | "user";

/**
 * Normalize any role input to a known AppRole.
 * Handles variations like "Desenvolvedor", "dev", "Usuario", etc.
 */
export function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").toLowerCase().trim();

  if (value === "admin") return "admin";
  if (value === "developer") return "developer";
  if (value === "desenvolvedor" || value === "dev") return "developer";
  if (value === "agent") return "agent";
  if (value === "agente" || value === "agente_imobiliario") return "agent";
  if (value === "user") return "user";
  if (value === "usuario" || value === "usuário" || value === "cliente") return "user";

  return "user";
}

/**
 * Roles with full admin panel access.
 * admin and developer see all menus.
 */
export const FULL_ACCESS_ROLES: AppRole[] = ["admin", "developer"];

/**
 * Check if a role can access the admin panel.
 * Returns true for admin and developer.
 */
export function canAccessAdmin(role?: string | null): boolean {
  return FULL_ACCESS_ROLES.includes(normalizeRole(role));
}

/**
 * Check if a role can access technical/devops menus.
 * Only admin and developer.
 */
export function canAccessTechMenus(role?: string | null): boolean {
  return FULL_ACCESS_ROLES.includes(normalizeRole(role));
}

/**
 * Role display labels (localized).
 */
export function getRoleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "admin": return "Admin";
    case "developer": return "Desenvolvedor";
    case "agent": return "Agente";
    case "user": return "Usuário";
    default: return "Usuário";
  }
}

/**
 * Role badge variant mapping.
 */
export function getRoleBadgeVariant(role?: string | null): "default" | "secondary" | "outline" | "destructive" | "developer" {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "admin": return "default";
    case "developer": return "developer";
    case "agent": return "secondary";
    case "user": return "outline";
    default: return "outline";
  }
}

/**
 * Menu item types for the admin sidebar.
 */
export type AdminMenuKey =
  | "dashboard"
  | "owners"
  | "properties"
  | "agenda"
  | "agents"
  | "property-types"
  | "amenities"
  | "media"
  | "blog"
  | "contacts"
  | "messages"
  | "ai-config"
  | "portals"
  | "tracking"
  | "performance"
  | "central-ai"
  | "ai-agents"
  | "n8n"
  | "logs"
  | "health"
  | "meta-ads"
  | "supabase"
  | "profile"
  | "email-config"
  | "settings";

export interface AdminMenuItem {
  key: AdminMenuKey;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  /** If true, only admin and developer can see this menu */
  techOnly?: boolean;
  /** If true, only admin can see this menu */
  adminOnly?: boolean;
  /** If true, only developer can see this menu */
  developerOnly?: boolean;
}

/**
 * Determine if a given role can see a specific menu item.
 * admin and developer see everything.
 * agent and user see only operational menus.
 * 
 * TODO: when allowed_menus field exists in profiles table,
 * combine role defaults with per-user menu permissions.
 */
export function canSeeMenuItem(
  role: string | null | undefined,
  item: AdminMenuItem
): boolean {
  const normalized = normalizeRole(role);

  // Admin and developer see everything
  if (FULL_ACCESS_ROLES.includes(normalized)) return true;

  // Developer-only menus
  if (item.developerOnly) return normalized === "developer";

  // Tech-only menus are hidden for agent/user
  if (item.techOnly || item.adminOnly) return false;

  // Operational menus are visible to all authenticated users
  // (agents and users can see these by default)
  return true;
}