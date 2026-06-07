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
  /** If true, hidden from sidebar but still accessible via URL for Admin/Agent/User */
  sidebarHidden?: boolean;
}

/**
 * Permissão de menu vinda do banco (tenant-level).
 * Chave: module_id, Valor: { admin_access, agent_access, user_access }
 */
export type MenuPermissionMatrix = Record<string, { admin?: boolean; agent?: boolean; user?: boolean }>;

/**
 * Retorna a chave de acesso dentro da matriz de permissões baseado na role.
 */
export function roleAccessKey(role: AppRole): "admin" | "agent" | "user" {
  if (role === "admin") return "admin";
  if (role === "agent") return "agent";
  return "user";
}

/**
 * Determine if a given role can see a specific menu item.
 * Uses DB permissions when available; falls back to static flags.
 *
 * RULES:
 * - developer: sees EVERYTHING (all items)
 * - admin: sees all EXCEPT developerOnly items (includes IA Operacional, DevOps, etc.)
 * - agent/user: sees only items with NO flags (operational menus)
 * - DB permissions override static flags when provided
 *
 * adminOnly = Email, Configurações, Permissões de Menu, Portais, Tracking, Performance
 * developerOnly = Planos e Limites, Mostruário
 * (no flag) = all roles见 (Dashboard, Imóveis, Proprietários, Agenda, Blog, CRM, etc.)
 */
export function canSeeMenuItem(
  role: string | null | undefined,
  item: AdminMenuItem,
  dbPermissions?: MenuPermissionMatrix | null
): boolean {
  const normalized = normalizeRole(role);

  // DEVELOPER sees everything
  if (normalized === "developer") return true;

  // Apply DB permissions if available
  if (dbPermissions) {
    const modulePerms = dbPermissions[item.key];
    const key = roleAccessKey(normalized);
    const dbAccess = modulePerms?.[key];
    // DB entry found → use it (true/false), otherwise fall through to static rules
    if (dbAccess !== undefined) return dbAccess;
  }

  // ADMIN sees all EXCEPT developerOnly items (tech menus + admin menus)
  if (normalized === "admin") {
    if (item.developerOnly) return false;
    return true;
  }

  // AGENT and USER: only items with no flags at all
  if (item.developerOnly || item.techOnly || item.adminOnly) return false;
  return true;
}