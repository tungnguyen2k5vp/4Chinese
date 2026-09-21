import * as Speech from "expo-speech";

import { clampSpeechRate, selectBestMandarinVoice } from "./speech-voice";

let chineseVoice: Promise<Speech.Voice | null> | null = null;
let activeRequest = 0;

export type ChineseSpeechFailure =
  "empty-text" | "missing-mandarin-voice" | "cancelled";

export type ChineseSpeechResult =
  { ok: true; voice: string } | { ok: false; reason: ChineseSpeechFailure };

async function getBestChineseVoice(): Promise<Speech.Voice | null> {
  if (!chineseVoice) {
    chineseVoice = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        return selectBestMandarinVoice(voices);
      })
      .catch(() => null);
  }
  return chineseVoice;
}

export async function speakChinese(
  text: string,
  options: Pick<
    Speech.SpeechOptions,
    "rate" | "onStart" | "onDone" | "onStopped" | "onError"
  > = {},
): Promise<ChineseSpeechResult> {
  const value = text.trim();
  if (!value) return { ok: false, reason: "empty-text" };

  const request = ++activeRequest;
  await Speech.stop();
  const voice = await getBestChineseVoice();

  if (request !== activeRequest) return { ok: false, reason: "cancelled" };
  if (!voice) return { ok: false, reason: "missing-mandarin-voice" };

  Speech.speak(value, {
    language: voice.language,
    voice: voice.identifier,
    rate: clampSpeechRate(options.rate ?? 0.82),
    pitch: 1,
    volume: 1,
    onStart: options.onStart,
    onDone: options.onDone,
    onStopped: options.onStopped,
    onError: options.onError,
  });

  return { ok: true, voice: voice.identifier };
}

export async function stopChineseSpeech(): Promise<void> {
  activeRequest += 1;
  await Speech.stop();
}

export function resetChineseVoiceCache(): void {
  chineseVoice = null;
}
