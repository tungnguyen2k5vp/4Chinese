import { describe, expect, it } from "vitest";

import { meaningSearchAlternatives } from "./meaning-query";

describe("meaning search alternatives", () => {
  it("normalizes Vietnamese tone marks before matching", () => {
    expect(meaningSearchAlternatives("Giáo viên")).toContain("giao vien");
  });

  it("adds useful aliases for common Vietnamese meanings", () => {
    expect(meaningSearchAlternatives("cảm ơn")).toEqual(
      expect.arrayContaining(["cam on", "cam ta"]),
    );
  });

  it("keeps a multi-word country query intact instead of treating nước as a synonym", () => {
    const alternatives = meaningSearchAlternatives("Nước Việt Nam");
    expect(alternatives).toContain("viet nam");
    expect(alternatives).toContain("越南");
    expect(alternatives).not.toContain("nuoc");
  });
});
