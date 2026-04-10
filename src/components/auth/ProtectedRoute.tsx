import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAgent?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireAgent }: ProtectedRouteProps) {
  const { user, isReady, isAdmin, isAgent } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireAgent && !isAgent && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
