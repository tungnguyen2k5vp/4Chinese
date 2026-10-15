import { normalizeSpeechLocale, type SpeechVoiceLike } from "./speech-voice";

export type EnglishAccent = "en-US" | "en-GB";
export function selectEnglishVoice<
  T extends SpeechVoiceLike & { localService?: boolean },
>(voices: T[], accent: EnglishAccent): T | null {
  const matches = voices.filter(
    (voice) =>
      normalizeSpeechLocale(voice.language) === normalizeSpeechLocale(accent) &&
      voice.localService !== false,
  );
  return (
    [...matches].sort((a, b) => {
      const localA = /local|embedded/i.test(a.identifier) ? 1 : 0;
      const localB = /local|embedded/i.test(b.identifier) ? 1 : 0;
      return localB - localA || a.identifier.localeCompare(b.identifier);
    })[0] ?? null
  );
}
export interface EnglishSpeechAdapter {
  getAvailableVoicesAsync(): Promise<SpeechVoiceLike[]>;
  stop(): Promise<void>;
  speak(
    text: string,
    options: {
      language: string;
      voice: string;
      rate: number;
      onDone: () => void;
      onStopped: () => void;
      onError: (error: unknown) => void;
    },
  ): void;
}
/** On-device TTS only. No recording, transcript upload or fabricated acoustic score. */
export class EnglishSpeechPlayer {
  private generation = 0;
  constructor(private readonly adapter: EnglishSpeechAdapter) {}
  async stop(): Promise<void> {
    this.generation++;
    await this.adapter.stop();
  }
  async speak(
    text: string,
    accent: EnglishAccent,
    onFinished: (error?: string) => void,
  ): Promise<"STARTED" | "CANCELLED" | "MISSING_VOICE"> {
    if (
      !text.trim() ||
      text.length > 4000 ||
      !["en-US", "en-GB"].includes(accent)
    )
      throw new Error("INVALID_ENGLISH_SPEECH");
    const generation = ++this.generation;
    await this.adapter.stop();
    const voice = selectEnglishVoice(
      await this.adapter.getAvailableVoicesAsync(),
      accent,
    );
    if (generation !== this.generation) return "CANCELLED";
    if (!voice) return "MISSING_VOICE";
    const done = (error?: string) => {
      if (generation === this.generation) onFinished(error);
    };
    this.adapter.speak(text.trim(), {
      language: accent,
      voice: voice.identifier,
      rate: 0.85,
      onDone: () => done(),
      onStopped: () => done(),
      onError: () => done("TTS_PLAYBACK_FAILED"),
    });
    return "STARTED";
  }
}
