import { describe, expect, it } from "vitest";

import { canAccessRolePath, getPrimaryRole, getSafePostLoginPath } from "@/lib/roles";
import type { CurrentUser } from "@/types/domain";

const makeUser = (roles: string[]): CurrentUser => ({
  id: 1,
  employee_id: 10,
  username: "user",
  email: "user@example.com",
  language: "en",
  is_active: true,
  must_change_password: false,
  roles,
  permissions: [],
  employee: null,
});

describe("roles helpers", () => {
  it("prefers admin when a user has both admin and hr roles", () => {
    expect(getPrimaryRole(makeUser(["hr", "admin"]))).toBe("admin");
  });

  it("only reuses a requested path when it belongs to the primary role area", () => {
    const adminUser = makeUser(["admin", "hr"]);

    expect(canAccessRolePath(adminUser, "/admin/dashboard")).toBe(true);
    expect(canAccessRolePath(adminUser, "/hr/dashboard")).toBe(true);
    expect(getSafePostLoginPath(adminUser, "/admin/users")).toBe("/admin/users");
    expect(getSafePostLoginPath(adminUser, "/hr/dashboard")).toBe("/admin/dashboard");
  });

  it("falls back to the admin dashboard for stale hr redirects", () => {
    const adminUser = makeUser(["admin"]);

    expect(canAccessRolePath(adminUser, "/hr/dashboard")).toBe(false);
    expect(getSafePostLoginPath(adminUser, "/hr/dashboard")).toBe("/admin/dashboard");
  });
});
