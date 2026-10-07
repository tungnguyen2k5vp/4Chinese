import { requireOptionalNativeModule } from "expo-modules-core";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

import {
  compareRecognizedMandarin,
  type PronunciationProvider,
  type PronunciationResult,
  type PronunciationTarget,
} from "@/services/pronunciation/provider";

type SpeechEventName = "start" | "end" | "result" | "error" | "nomatch";
type NativeSpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort?: () => void;
  addListener: (eventName: SpeechEventName, listener: (event: unknown) => void) => { remove: () => void };
};

const speechModule = requireOptionalNativeModule<NativeSpeechModule>("ExpoSpeechRecognition");

export class NativePronunciationError extends Error {
  constructor(public readonly code: "unavailable" | "permission" | "no-match" | "failed" | "timeout", message: string) {
    super(message);
  }
}

export const nativePronunciationProvider: PronunciationProvider = {
  kind: "native",
  isAvailable: () => Boolean(speechModule?.isRecognitionAvailable()),
};

export function isNativePronunciationAvailable(): boolean {
  return nativePronunciationProvider.isAvailable();
}

/** Stops the one-shot recognizer when the user leaves a word or taps Stop. */
export function cancelMandarinPronunciation(): void {
  try {
    if (speechModule?.abort) speechModule.abort();
    else speechModule?.stop();
  } catch {
    // The native recognizer can already be stopped when navigation happens.
  }
}

/** Runs one short Mandarin recognition request and always removes listeners. */
export async function recognizeMandarinPronunciation(
  target: PronunciationTarget,
  contextualStrings: string[] = [],
): Promise<PronunciationResult> {
  if (!speechModule) {
    throw new NativePronunciationError("unavailable", "Nhận diện giọng nói cần development hoặc release build; Expo Go chưa có mô-đun này.");
  }
  if (!speechModule.isRecognitionAvailable()) {
    throw new NativePronunciationError("unavailable", "Thiết bị chưa có dịch vụ nhận diện tiếng Trung. Hãy bật Nhập bằng giọng nói/Google trên thiết bị rồi thử lại.");
  }
  const permission = await speechModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new NativePronunciationError("permission", "Hãy cho phép micro để dùng nhận diện giọng nói.");
  }

  return new Promise<PronunciationResult>((resolve, reject) => {
    let settled = false;
    const cleanUp = () => {
      clearTimeout(timeout);
      subscriptions.forEach((subscription) => subscription.remove());
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanUp();
      callback();
    };
    const subscriptions = [
      speechModule.addListener("result", (event) => {
        const resultEvent = event as ExpoSpeechRecognitionResultEvent;
        if (!resultEvent.isFinal) return;
        const alternative = resultEvent.results[0];
        finish(() => resolve(compareRecognizedMandarin(alternative?.transcript ?? "", target, alternative?.confidence)));
      }),
      speechModule.addListener("nomatch", () => finish(() => reject(new NativePronunciationError("no-match", "Chưa nghe rõ. Hãy đọc chậm một lần nữa.")))),
      speechModule.addListener("error", (event) => {
        const speechError = event as ExpoSpeechRecognitionErrorEvent;
        if (speechError.error === "aborted") return;
        finish(() => reject(new NativePronunciationError("failed", "Không nhận được giọng nói. Hãy kiểm tra dịch vụ nhận diện tiếng Trung rồi thử lại.")));
      }),
      speechModule.addListener("end", () => {
        // Some Android recognizers emit end without result/nomatch.
        setTimeout(() => finish(() => reject(new NativePronunciationError("no-match", "Chưa nghe rõ. Hãy đọc chậm một lần nữa."))), 80);
      }),
    ];
    const timeout = setTimeout(() => {
      try { speechModule.stop(); } catch { /* recognizer already stopped */ }
      finish(() => reject(new NativePronunciationError("timeout", "Nhận diện mất quá lâu. Hãy thử lại.")));
    }, 12_000);

    try {
      speechModule.start({
        lang: "zh-CN",
        continuous: false,
        interimResults: true,
        maxAlternatives: 3,
        contextualStrings: Array.from(new Set([target.simplified, target.traditional, target.pinyin, ...contextualStrings])).slice(0, 60),
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "free_form" },
        iosTaskHint: "confirmation",
      });
    } catch {
      finish(() => reject(new NativePronunciationError("failed", "Không thể mở micro. Hãy thử lại sau.")));
    }
  });
}
