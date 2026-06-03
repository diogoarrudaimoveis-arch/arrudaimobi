import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdmin } from "@/lib/adminPermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAgent?: boolean;
  requireOwner?: boolean;
  requireDeveloper?: boolean;
}

/**
 * Protected route guard for admin pages.
 * 
 * Rules:
 * - Shows loading spinner while auth/profile is loading (no redirect)
 * - Redirects to /login if no user session
 * - Redirects to "/" if user doesn't have required admin access
 * - Developer role has full admin access (same as admin)
 */
export function ProtectedRoute({ children, requireAdmin, requireAgent, requireOwner, requireDeveloper }: ProtectedRouteProps) {
  const { user, isReady, isProfileLoading, normalizedRole, isAdmin, isAgent } = useAuth();

  console.log('[ProtectedRoute] render:', {
    requireAdmin,
    requireAgent,
    requireOwner,
    isReady,
    isProfileLoading,
    normalizedRole,
    hasUser: !!user,
    canAccessAdmin: canAccessAdmin(normalizedRole),
  });

  // Show loading while auth is initializing or profile/role is being fetched
  // Do NOT redirect during loading — this prevents logout loops for developer
  if (!isReady || isProfileLoading) {
    console.log('[ProtectedRoute] showing loading spinner (isReady=', isReady, 'isProfileLoading=', isProfileLoading, ')');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No session → go to login
  if (!user) {
    console.log('[ProtectedRoute] no user, redirect to /login');
    return <Navigate to="/login" replace />;
  }

  // Admin required but user is not admin/developer → redirect to admin (not public home)
  if (requireAdmin && !canAccessAdmin(normalizedRole)) {
    console.log('[ProtectedRoute] NOT admin (role=', normalizedRole, '), redirect to /admin');
    return <Navigate to="/admin" replace />;
  }

  // Agent required but user is not agent/admin
  if (requireAgent && !isAgent && !isAdmin) {
    console.log('[ProtectedRoute] NOT agent, redirect to /admin');
    return <Navigate to="/admin" replace />;
  }

  // Developer required but user is not developer → redirect to /admin
  if (requireDeveloper && normalizedRole !== "developer") {
    console.log('[ProtectedRoute] NOT developer (role=', normalizedRole, '), redirect to /admin');
    return <Navigate to="/admin" replace />;
  }

  console.log('[ProtectedRoute] ✅ rendering children for role:', normalizedRole);
  return <>{children}</>;
}