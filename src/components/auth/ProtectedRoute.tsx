import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/providers/AuthProvider";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="rounded-xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
        Loading your workspace...
      </div>
    </div>
  );
}

export function ProtectedRoute({
  allowedRoles,
  allowDuringPasswordChange = false,
}: {
  allowedRoles?: string[];
  allowDuringPasswordChange?: boolean;
}) {
  const location = useLocation();
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (currentUser.must_change_password && !allowDuringPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.some((role) => currentUser.roles.includes(role))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { currentUser, isAuthenticated, isLoading, homePath } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated && currentUser) {
    if (currentUser.must_change_password) {
      return <Navigate to="/change-password" replace />;
    }

    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
