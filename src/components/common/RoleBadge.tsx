import { Badge } from '@/components/ui/badge';
import type { RoleCode } from '@/types/api';

const roleLabels: Record<RoleCode, string> = {
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee',
};

export function RoleBadge({ role }: { role: RoleCode | string }) {
  const label = roleLabels[role as RoleCode] || role;
  const variant = role === 'admin' ? 'default' : 'secondary';
  return <Badge variant={variant}>{label}</Badge>;
}
