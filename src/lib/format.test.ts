import { afterEach, describe, expect, it } from "vitest";

import { formatBooleanLabel, formatCurrency, formatLabel, formatNumber } from "@/lib/format";
import { changeAppLanguage } from "@/lib/i18n";

describe("localized format helpers", () => {
  afterEach(async () => {
    await changeAppLanguage("en");
  });

  it("translates known system codes using the active language", async () => {
    await changeAppLanguage("fr");
    expect(formatLabel("paid_vacation")).toBe("Congé payé");

    await changeAppLanguage("ar");
    expect(formatLabel("check_out")).toBe("تسجيل الخروج");
  });

  it("translates booleans using the active language", async () => {
    await changeAppLanguage("fr");
    expect(formatBooleanLabel(true)).toBe("Oui");

    await changeAppLanguage("ar");
    expect(formatBooleanLabel(false)).toBe("لا");
  });

  it("formats decimal numbers with two fraction digits", async () => {
    await changeAppLanguage("en");
    expect(formatNumber(12.345)).toBe("12.35");
  });

  it("formats currency with two fraction digits even for whole numbers", async () => {
    await changeAppLanguage("en");
    expect(formatCurrency(0, "USD")).toContain("0.00");
  });
});
