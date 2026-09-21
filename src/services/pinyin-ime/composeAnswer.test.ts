import { describe, expect, it } from "vitest";

import { evaluateComposeAnswer } from "./composeAnswer";

describe("pinyin Hanzi compose grading", () => {
  it("accepts the selected target Hanzi", () => {
    expect(evaluateComposeAnswer("喜欢", "喜欢", false)).toBe("SUCCESS");
  });

  it("rejects a wrong Hanzi even when the pinyin is similar", () => {
    expect(evaluateComposeAnswer("喜欢", "稀罕", false)).toBe("FAIL");
  });

  it("marks a correct answer after a hint as assisted", () => {
    expect(evaluateComposeAnswer("喜欢", "喜欢", true)).toBe("ASSISTED");
  });
});

