import { afterEach, describe, expect, it } from "vitest";

import { formatBooleanLabel, formatLabel } from "@/lib/format";
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
});
