import type { AuthUser, RoleCode } from '@/types/api';

export function getPrimaryRole(user?: Pick<AuthUser, 'roles'> | null): RoleCode | null {
  const roles = user?.roles ?? [];
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('hr')) return 'hr';
  if (roles.includes('employee')) return 'employee';
  return null;
}

export function getRoleHome(role: RoleCode | null) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hr') return '/hr/dashboard';
  if (role === 'employee') return '/employee/dashboard';
  return '/login';
}

export function canAccessRole(user: AuthUser | null, allowedRoles: RoleCode[]) {
  if (!user) return false;
  if (user.roles.includes('admin')) return true;
  return user.roles.some((role) => allowedRoles.includes(role));
}

export function userDisplayName(user: AuthUser | null) {
  return user?.employee?.full_name || user?.username || 'User';
}

export function userInitials(user: AuthUser | null) {
  return userDisplayName(user)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
