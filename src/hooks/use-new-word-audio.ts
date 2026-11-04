import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppState } from "react-native";

import { createNewWordAudio } from "./new-word-audio";

import { speakChinese, stopChineseSpeech } from "@/services/audio/chinese-speech";

export function useNewWordAudio(key: string | null, text: string | undefined, enabled: boolean, rate: number) {
  const [player] = useState(() => createNewWordAudio({
    speak: (value, speed) => speakChinese(value, { rate: speed }),
    stop: stopChineseSpeech,
  }));
  useFocusEffect(useCallback(() => {
    if (!key || !text || !enabled) return;
    let cancel = () => undefined as void;
    const playIfActive = () => {
      if (AppState.currentState === "active" || AppState.currentState == null) cancel = player.play(key, text, rate);
    };
    playIfActive();
    const subscription = AppState.addEventListener("change", state => {
      cancel();
      if (state === "active") playIfActive();
      else player.stop();
    });
    return () => { subscription.remove(); cancel(); player.stop(); };
  }, [enabled, key, player, rate, text]));
}
