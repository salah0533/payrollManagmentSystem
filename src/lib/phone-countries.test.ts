import { describe, expect, it } from "vitest";

import { composePhoneNumber, phoneCountries, splitPhoneNumber } from "@/lib/phone-countries";

describe("phone country options", () => {
  it("composes and splits backend-compatible phone strings", () => {
    expect(composePhoneNumber("DZ", "0599 123 456")).toBe("+2130599123456");
    expect(splitPhoneNumber("+2130599123456")).toMatchObject({
      countryIso: "DZ",
      countryCode: "+213",
      nationalNumber: "599123456",
    });
  });
});
