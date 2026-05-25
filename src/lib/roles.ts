import type { CurrentUser, RoleCode } from "@/types/domain";

const ROLE_PRIORITY: RoleCode[] = ["admin", "hr", "employee"];
const ROLE_ROUTE_PREFIX: Record<string, string> = {
  admin: "/admin/",
  hr: "/hr/",
  employee: "/employee/",
};

export function hasRole(user: CurrentUser | null, roles: RoleCode[]) {
  if (!user) {
    return false;
  }

  return roles.some((role) => user.roles.includes(role));
}

export function hasPermission(user: CurrentUser | null, permission: string) {
  return Boolean(user?.permissions.includes(permission));
}

export function getPrimaryRole(user: CurrentUser | null) {
  if (!user) {
    return null;
  }

  for (const role of ROLE_PRIORITY) {
    if (user.roles.includes(role)) {
      return role;
    }
  }

  return user.roles[0] || null;
}

export function getRoleHomePath(user: CurrentUser | null) {
  const primaryRole = getPrimaryRole(user);

  if (primaryRole === "admin") {
    return "/admin/dashboard";
  }

  if (primaryRole === "hr") {
    return "/hr/dashboard";
  }

  return "/employee/home";
}

export function canAccessRolePath(user: CurrentUser | null, path: string | null | undefined) {
  if (!user || !path) {
    return false;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return user.roles.some((role) => {
    const prefix = ROLE_ROUTE_PREFIX[role];
    return Boolean(prefix && normalizedPath.startsWith(prefix));
  });
}

export function getSafePostLoginPath(user: CurrentUser | null, requestedPath: string | null | undefined) {
  const primaryRole = getPrimaryRole(user);
  const primaryPrefix = primaryRole ? ROLE_ROUTE_PREFIX[primaryRole] : null;
  const normalizedPath = requestedPath ? (requestedPath.startsWith("/") ? requestedPath : `/${requestedPath}`) : null;

  if (normalizedPath && primaryPrefix && normalizedPath.startsWith(primaryPrefix)) {
    return requestedPath as string;
  }

  return getRoleHomePath(user);
}

export function getNotificationsPath(user: CurrentUser | null) {
  const primaryRole = getPrimaryRole(user);

  if (primaryRole === "admin") {
    return "/admin/notifications";
  }

  if (primaryRole === "hr") {
    return "/hr/notifications";
  }

  return "/employee/notifications";
}

export function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "User";
  }

  if (role === "hr") {
    return "HR";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getRoleLabelKey(role: string | null | undefined) {
  if (!role) {
    return "role.user";
  }

  if (role === "admin" || role === "hr" || role === "employee") {
    return `role.${role}`;
  }

  return "role.user";
}
