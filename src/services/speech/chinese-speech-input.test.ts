import { describe, expect, it } from "vitest";

import {
  buildChineseSpeechContext,
  pinyinInputFromSpeechTranscript,
} from "@/services/speech/chinese-speech-input";

const like = { simplified: "喜欢", traditional: "喜歡", pinyin: "xǐ huān" };

describe("pinyinInputFromSpeechTranscript", () => {
  it("uses expected pinyin when the recognizer returns target Hanzi", () => {
    expect(pinyinInputFromSpeechTranscript("我喜欢", like)).toBe("xǐ huān");
  });

  it("keeps spoken pinyin for the existing candidate chooser", () => {
    expect(pinyinInputFromSpeechTranscript("xi huan", like)).toBe("xi huan");
  });

  it("does not turn unrelated Hanzi into a false answer", () => {
    expect(pinyinInputFromSpeechTranscript("书", like)).toBeNull();
  });
});

describe("buildChineseSpeechContext", () => {
  it("prioritizes target vocabulary and removes duplicates", () => {
    expect(buildChineseSpeechContext(like, [like, { simplified: "书", traditional: "書", pinyin: "shū" }]))
      .toEqual(["喜欢", "喜歡", "xǐ huān", "书", "shū"]);
  });
});
