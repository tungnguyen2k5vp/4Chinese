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

  it("covers common Vietnamese food aliases and their Hanzi heads", () => {
    expect(meaningSearchAlternatives("đồ ăn")).toEqual(expect.arrayContaining(["thuc an", "thuc pham", "食物"]));
    expect(meaningSearchAlternatives("cái bát")).toEqual(expect.arrayContaining(["bat", "chen", "碗"]));
    expect(meaningSearchAlternatives("nhà ăn")).toEqual(expect.arrayContaining(["nha hang", "食堂", "餐厅"]));
    expect(meaningSearchAlternatives("mỳ")).toEqual(expect.arrayContaining(["mi", "面条儿"]));
  });

  it("does not steal unaccented pinyin input with a Vietnamese meaning alias", () => {
    expect(meaningSearchAlternatives("an")).not.toContain("吃");
  });
});
