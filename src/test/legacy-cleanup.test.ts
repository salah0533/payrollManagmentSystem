import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(process.cwd(), "src");

describe("legacy frontend cleanup", () => {
  it("removes old attendance type contracts from domain and service code", () => {
    const domain = readFileSync(join(srcRoot, "types", "domain.ts"), "utf8");
    const attendanceApi = readFileSync(join(srcRoot, "services", "attendanceApi.ts"), "utf8");
    const mockData = readFileSync(join(srcRoot, "data", "mockData.ts"), "utf8");

    expect(domain).not.toContain("AttendanceType");
    expect(domain).not.toContain("AttendanceListRow");
    expect(attendanceApi).not.toContain("/att_types/");
    expect(mockData).not.toContain("attendence_type");
    expect(mockData).not.toContain("payment_type");
  });

  it("keeps the misspelled dashboard stats endpoint isolated to the API wrapper", () => {
    const dashboardPage = readFileSync(join(srcRoot, "pages", "Dashboard.tsx"), "utf8");
    const dashboardApi = readFileSync(join(srcRoot, "services", "dashboardApi.ts"), "utf8");

    expect(dashboardPage).not.toContain("/stat/dashbord/cards");
    expect(dashboardApi).toContain("/stat/dashbord/cards");
  });
});
