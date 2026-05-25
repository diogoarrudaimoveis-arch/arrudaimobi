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
 * Roles with admin panel access.
 * Both admin and developer can access the admin panel.
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
 * Only developer gets tech menus (DevOps, Meta Ads, Supabase, Mostruário, etc.)
 * Admin does NOT see tech-only menus.
 */
export function canAccessTechMenus(role?: string | null): boolean {
  return normalizeRole(role) === "developer";
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
  | "mostruario"
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
  | "devops"
  | "meta-ads"
  | "supabase"
  | "profile"
  | "email-config"
  | "settings"
  | "menu-permissions"
  | "planos-limites";

export interface AdminMenuItem {
  key: AdminMenuKey;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  /** If true, only developer can see this menu */
  techOnly?: boolean;
  /** If true, only admin and developer can see this menu */
  adminOnly?: boolean;
  /** If true, only developer can see this menu */
  developerOnly?: boolean;
}

/**
 * Determine if a given role can see a specific menu item.
 *
 * RULES:
 * - developer: sees EVERYTHING (all items)
 * - admin: sees all EXCEPT techOnly and developerOnly items
 * - agent/user: sees only items with NO flags (operational menus)
 *
 * techOnly = DevOps, Meta Ads, Supabase, Mostruário, Permissões de Menu,
 *            Central IA, Agentes IA, Automações N8N, Logs, Health Checks,
 *            Configurações de IA, Portais, Marketing Portal, Performance
 * adminOnly = Email, Configurações (site settings)
 * developerOnly = Planos e Limites
 */
export function canSeeMenuItem(
  role: string | null | undefined,
  item: AdminMenuItem
): boolean {
  const normalized = normalizeRole(role);

  // DEVELOPER sees everything
  if (normalized === "developer") return true;

  // ADMIN sees all EXCEPT techOnly and developerOnly items
  if (normalized === "admin") {
    if (item.developerOnly) return false;
    if (item.techOnly) return false;
    return true;
  }

  // AGENT and USER: only items with no flags at all
  if (item.developerOnly || item.techOnly || item.adminOnly) return false;
  return true;
}