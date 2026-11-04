import { describe, expect, it, vi } from "vitest";

import {
  EnglishSpeechPlayer,
  selectEnglishVoice,
  type EnglishSpeechAdapter,
} from "./english-speech";

const voice = (language: string, identifier = language) => ({
  language,
  identifier,
  name: identifier,
  quality: "Default",
});
describe("English TTS exact accent and cancellation", () => {
  it("chooses requested accent only; no Chinese or silent GB→US fallback", () => {
    expect(
      selectEnglishVoice([voice("zh-CN"), voice("en_US")], "en-GB"),
    ).toBeNull();
    expect(selectEnglishVoice([voice("en_US")], "en-US")?.language).toBe(
      "en_US",
    );
    expect(
      selectEnglishVoice([{ ...voice("en-GB"), localService: false }], "en-GB"),
    ).toBeNull();
  });
  it("reports missing voice without pretending playback succeeded", async () => {
    const speak = vi.fn();
    const player = new EnglishSpeechPlayer({
      getAvailableVoicesAsync: async () => [],
      stop: async () => {},
      speak,
    });
    expect(await player.speak("user text", "en-GB", vi.fn())).toBe(
      "MISSING_VOICE",
    );
    expect(speak).not.toHaveBeenCalled();
  });
  it("cancels pending voice discovery when route leaves", async () => {
    let resolve!: (voices: ReturnType<typeof voice>[]) => void;
    const speak = vi.fn();
    const player = new EnglishSpeechPlayer({
      getAvailableVoicesAsync: () =>
        new Promise((done) => {
          resolve = done;
        }),
      stop: async () => {},
      speak,
    });
    const pending = player.speak("user text", "en-US", vi.fn());
    await Promise.resolve();
    await Promise.resolve();
    await player.stop();
    resolve([voice("en-US")]);
    expect(await pending).toBe("CANCELLED");
    expect(speak).not.toHaveBeenCalled();
  });
  it("uses selected voice and exposes playback failure without scores", async () => {
    const done = vi.fn();
    const speak = vi.fn<EnglishSpeechAdapter["speak"]>();
    const player = new EnglishSpeechPlayer({
      getAvailableVoicesAsync: async () => [voice("en-GB")],
      stop: async () => {},
      speak,
    });
    expect(await player.speak(" user text ", "en-GB", done)).toBe("STARTED");
    expect(speak.mock.calls[0]?.[0]).toBe("user text");
    speak.mock.calls[0]![1].onError(new Error("unavailable"));
    expect(done).toHaveBeenCalledWith("TTS_PLAYBACK_FAILED");
  });
});
