import { describe, expect, it } from "vitest";

import {
  clampSpeechRate,
  isChineseSpeechVoice,
  normalizeSpeechLocale,
  selectBestMandarinVoice,
} from "./speech-voice";

const voice = (language: string, identifier: string, quality = "Default") => ({
  language,
  identifier,
  name: identifier,
  quality,
});

describe("Mandarin speech voice selection", () => {
  it("normalizes Android locale separators", () => {
    expect(normalizeSpeechLocale(" zh_CN ")).toBe("zh-cn");
  });

  it("recognizes both zh and cmn Mandarin voices", () => {
    expect(isChineseSpeechVoice(voice("zh-CN", "zh-cn-local"))).toBe(true);
    expect(isChineseSpeechVoice(voice("cmn-CN", "cmn-cn-local"))).toBe(true);
    expect(isChineseSpeechVoice(voice("en-US", "en-us-local"))).toBe(false);
  });

  it("prefers enhanced Mainland Mandarin over Cantonese and network voices", () => {
    const selected = selectBestMandarinVoice([
      voice("zh-HK", "yue-hk-local", "Enhanced"),
      voice("cmn-CN", "cmn-cn-network"),
      voice("zh-CN", "zh-cn-local", "Enhanced"),
    ]);

    expect(selected?.identifier).toBe("zh-cn-local");
  });

  it("prefers an offline local Mandarin voice over an enhanced network voice", () => {
    const selected = selectBestMandarinVoice([
      voice("zh-CN", "zh-cn-network", "Enhanced"),
      voice("zh-CN", "zh-cn-local"),
    ]);

    expect(selected?.identifier).toBe("zh-cn-local");
  });

  it("keeps the configured rate in a safe intelligible range", () => {
    expect(clampSpeechRate(0.2)).toBe(0.6);
    expect(clampSpeechRate(0.82)).toBe(0.82);
    expect(clampSpeechRate(1.4)).toBe(1.25);
    expect(clampSpeechRate(Number.NaN)).toBe(0.82);
  });
});
