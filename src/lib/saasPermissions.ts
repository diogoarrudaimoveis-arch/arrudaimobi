/**
 * SaaS Role & Permissions System for Arruda Imobi
 * Hierarchical model: Developer > Admin > Agent > User
 *
 * Rules:
 * - Developer: superuser, sees everything, can manage all roles including developer
 * - Admin: manages own tenant users (not developer), limited by tenant config
 * - Agent: operational access only
 * - User: basic access only
 *
 * NEVER use: role === "admin" directly
 * ALWAYS use: canAccessAdmin(role), canManageUsers(role), etc.
 */
import type { AppRole } from "./adminPermissions";
import { normalizeRole, FULL_ACCESS_ROLES } from "./adminPermissions";

/** Role hierarchy levels — higher = more power */
export const ROLE_LEVELS: Record<AppRole, number> = {
  developer: 100,
  admin: 80,
  agent: 40,
  user: 10,
};

/** Get numeric level for comparison */
export function getRoleLevel(role?: string | null): number {
  return ROLE_LEVELS[normalizeRole(role)] ?? 0;
}

/** Developer is the supreme superuser */
export function isDeveloper(role?: string | null): boolean {
  return normalizeRole(role) === "developer";
}

/** Admin has tenant management rights */
export function isAdmin(role?: string | null): boolean {
  return normalizeRole(role) === "admin";
}

/** Agent has operational access */
export function isAgent(role?: string | null): boolean {
  return normalizeRole(role) === "agent";
}

/** User has basic access only */
export function isUser(role?: string | null): boolean {
  return normalizeRole(role) === "user";
}

/**
 * Can access full admin panel (developer + admin)
 * Same as canAccessAdmin() in adminPermissions.ts
 */
export function canAccessAdmin(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "developer" || normalized === "admin";
}

/**
 * Can manage users (create, edit, delete within tenant)
 * Developer and Admin can manage users.
 * Agent and User CANNOT manage users.
 */
export function canManageUsers(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "developer" || normalized === "admin";
}

/**
 * Can manage the developer role (assign/revoke developer)
 * ONLY developer can assign the developer role.
 * Admin CANNOT assign developer role.
 */
export function canManageDeveloperRole(role?: string | null): boolean {
  return isDeveloper(role);
}

/**
 * Can VIEW the developer role option in UI
 * Only developer sees "Desenvolvedor" in role selector.
 * Admin/Agent/User do NOT see this option.
 */
export function canSeeDeveloperRoleOption(role?: string | null): boolean {
  return isDeveloper(role);
}

/**
 * Can VIEW a developer user in the user list
 * Developer can see all users including developers.
 * Admin CANNOT see developer users in the list (or sees them as blocked).
 */
export function canSeeDeveloperInList(role?: string | null): boolean {
  return isDeveloper(role);
}

/**
 * Can edit a specific user's role
 * Developer can edit anyone.
 * Admin can edit admin/agent/user but NOT developer.
 */
export function canEditUserRole(editorRole?: string | null, targetRole?: string | null): boolean {
  const editor = normalizeRole(editorRole);
  const target = normalizeRole(targetRole);

  if (editor === "developer") return true;
  if (editor === "admin" && target !== "developer") return true;
  return false;
}

/**
 * Can delete a user from the tenant
 * Developer can delete anyone.
 * Admin can delete admin/agent/user but NOT developer.
 * Agent and User cannot delete anyone.
 */
export function canDeleteUser(editorRole?: string | null, targetRole?: string | null): boolean {
  const editor = normalizeRole(editorRole);

  if (editor === "developer") return true;
  if (editor === "admin" && targetRole !== "developer") return true;
  return false;
}

/**
 * Can access the Developer Mostruário panel
 * ONLY developer.
 */
export function canAccessMostruario(role?: string | null): boolean {
  return isDeveloper(role);
}

/**
 * Can access tenant limits configuration
 * ONLY developer.
 */
export function canEditTenantLimits(role?: string | null): boolean {
  return isDeveloper(role);
}

/**
 * Can edit menu permissions for roles
 * Developer can edit all menu permissions.
 * Admin can view but not edit (or edit limited set).
 */
export function canEditMenuPermissions(role?: string | null): boolean {
  return isDeveloper(role);
}

/**
 * Can view menu permissions
 * Developer and Admin can view.
 */
export function canViewMenuPermissions(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "developer" || normalized === "admin";
}

/**
 * Get available roles for role selector, filtered by current user's role
 * Developer sees: Desenvolvedor, Admin, Agente, Usuário
 * Admin sees: Admin, Agente, Usuário (no Desenvolvedor)
 * Agent/User: no role management
 */
export function getAvailableRolesForSelector(currentUserRole?: string | null): Array<{ value: string; label: string }> {
  if (isDeveloper(currentUserRole)) {
    return [
      { value: "developer", label: "Desenvolvedor" },
      { value: "admin", label: "Admin" },
      { value: "agent", label: "Agente" },
      { value: "user", label: "Usuário" },
    ];
  }

  if (isAdmin(currentUserRole)) {
    return [
      { value: "admin", label: "Admin" },
      { value: "agent", label: "Agente" },
      { value: "user", label: "Usuário" },
    ];
  }

  // Agent/User — no role management available
  return [];
}

/**
 * Filter a list of users to hide developer from non-developer view
 */
export function filterUsersForRole<T extends { role?: string | null }>(
  users: T[],
  currentUserRole?: string | null
): T[] {
  if (isDeveloper(currentUserRole)) {
    return users; // developer sees everyone
  }
  return users.filter((u) => !isDeveloper(u.role));
}

/**
 * Get display label for a role (localized)
 */
export function getRoleDisplayLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "developer": return "Desenvolvedor";
    case "admin": return "Admin";
    case "agent": return "Agente";
    case "user": return "Usuário";
    default: return "Usuário";
  }
}

/**
 * Check if current user can perform an action on a target user
 */
export function canPerformAction(
  currentUserRole: string | null,
  targetUserRole: string | null,
  action: "edit_role" | "delete_user" | "view_details"
): boolean {
  switch (action) {
    case "edit_role":
      return canEditUserRole(currentUserRole, targetUserRole);
    case "delete_user":
      return canDeleteUser(currentUserRole, targetUserRole);
    case "view_details":
      return canManageUsers(currentUserRole);
    default:
      return false;
  }
}