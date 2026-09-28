import { describe, expect, it } from "vitest";

import { resolveReviewMode } from "@/services/review/review-mode";

describe("resolveReviewMode", () => {
  it("keeps the existing audio shortcut compatible", () => {
    expect(resolveReviewMode("audio")).toBe("audio-meaning");
  });

  it("uses a valid review mode and rejects unknown query values", () => {
    expect(resolveReviewMode("audio-meaning")).toBe("audio-meaning");
    expect(resolveReviewMode("not-a-mode")).toBe("meaning-hanzi");
  });
});
