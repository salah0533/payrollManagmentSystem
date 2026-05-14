import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/lib/auth';

export function RoleRedirect() {
  const { primaryRole } = useAuth();
  return <Navigate to={getRoleHome(primaryRole)} replace />;
}
