import { describe, expect, it } from "vitest";

import { createShortDeckCode, normalizeShortDeckCode } from "./short-share";

describe("short deck share code", () => {
  it("creates an eight-character code without ambiguous glyphs", () => {
    expect(createShortDeckCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/u);
  });

  it("accepts spaces or a hyphen while importing", () => {
    expect(normalizeShortDeckCode("abcz-2345")).toBe("ABCZ2345");
    expect(normalizeShortDeckCode("ABC01234")).toBeNull();
  });
});
