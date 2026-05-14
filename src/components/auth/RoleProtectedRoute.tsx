import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccessRole } from '@/lib/auth';
import type { RoleCode } from '@/types/api';

export function RoleProtectedRoute({ allowedRoles }: { allowedRoles: RoleCode[] }) {
  const { user } = useAuth();

  if (!canAccessRole(user, allowedRoles)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
