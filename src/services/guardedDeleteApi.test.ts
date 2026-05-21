import { afterEach, describe, expect, it, vi } from "vitest";

import { employeeApi } from "@/services/employeeApi";
import { userApi } from "@/services/userApi";

function mockApiResponse(data: unknown = null) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ status: true, message: "ok", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("guarded delete API calls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends admin_password when deleting an employee", async () => {
    mockApiResponse();

    await employeeApi.remove(12, { admin_password: "AdminPass123!" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/employee/12"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ admin_password: "AdminPass123!" }),
      }),
    );
  });

  it("sends admin_password when deleting a user", async () => {
    mockApiResponse();

    await userApi.remove(7, { admin_password: "AdminPass123!" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/7"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ admin_password: "AdminPass123!" }),
      }),
    );
  });
});
