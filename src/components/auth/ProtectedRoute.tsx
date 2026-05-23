import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdmin } from "@/lib/adminPermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAgent?: boolean;
}

/**
 * Protected route guard for admin pages.
 * 
 * Rules:
 * - Shows loading spinner while auth/profile is loading (no redirect)
 * - Redirects to /login if no user session
 * - Redirects to /admin if user doesn't have required admin access (not to "/" public site)
 * - Developer role has full admin access (same as admin)
 */
export function ProtectedRoute({ children, requireAdmin, requireAgent }: ProtectedRouteProps) {
  const { user, isReady, isProfileLoading, normalizedRole } = useAuth();

  // Show loading while auth is initializing or profile/role is being fetched
  // Do NOT redirect during loading — this prevents logout loops for developer
  if (!isReady || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No session → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Admin required but user is not admin/developer → redirect to /admin (safe hub), not to public site
  if (requireAdmin && !canAccessAdmin(normalizedRole)) {
    return <Navigate to="/admin" replace />;
  }

  // Agent required but user is not agent/admin → redirect to /admin safe hub
  if (requireAgent && !isAgent && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}