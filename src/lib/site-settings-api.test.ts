import { describe, expect, it } from "vitest";

import { normalizeWhatsappNumber } from "@/lib/site-settings-api";

describe("normalizeWhatsappNumber", () => {
  it("accepts common Kenyan formats", () => {
    expect(normalizeWhatsappNumber("0725 647 479")).toBe("254725647479");
    expect(normalizeWhatsappNumber("+254 725 647 479")).toBe("254725647479");
    expect(normalizeWhatsappNumber("254725647479")).toBe("254725647479");
    expect(normalizeWhatsappNumber("0112795827")).toBe("254112795827");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeWhatsappNumber("")).toBeNull();
    expect(normalizeWhatsappNumber("12345")).toBeNull();
    expect(normalizeWhatsappNumber("+1 415 555 0100")).toBeNull();
    expect(normalizeWhatsappNumber("0725abc479")).toBeNull();
  });
});
