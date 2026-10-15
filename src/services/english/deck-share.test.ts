import { describe, expect, it } from "vitest";

import {
  createEnglishSharedDeckPayload,
  decodeEnglishSharedDeckPayload,
} from "./deck-share";

describe("English shared-deck payload", () => {
  it("normalizes English word fields and never includes learner progress", () => {
    const payload = createEnglishSharedDeckPayload("  Unit 8  ", [
      { headword: "  look up ", meaningVi: " tra cứu ", pos: " verb ", ipa: " /lʊk/ " },
    ]);
    expect(payload).toEqual({
      version: 1,
      language: "en",
      name: "Unit 8",
      words: [{ headword: "look up", meaningVi: "tra cứu", pos: "verb", ipa: "/lʊk/" }],
    });
    expect(JSON.stringify(payload)).not.toMatch(/progress|review|notes/i);
    expect(decodeEnglishSharedDeckPayload(payload)).toEqual(payload);
  });

  it("rejects malformed, empty, oversized and Chinese payloads", () => {
    expect(decodeEnglishSharedDeckPayload({ version: 1, language: "zh", name: "x", words: [] })).toBeNull();
    expect(decodeEnglishSharedDeckPayload({ version: 1, language: "en", name: "x", words: [{ headword: "bank" }] })).toBeNull();
    expect(() => createEnglishSharedDeckPayload("x", [])).toThrow("từ 1 đến 500");
    expect(() => createEnglishSharedDeckPayload("x", Array(501).fill({ headword: "a", meaningVi: "b", pos: "", ipa: "" }))).toThrow("từ 1 đến 500");
  });
});
