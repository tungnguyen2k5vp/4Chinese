import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { useCallback, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import {
  EnglishSpeechPlayer,
  type EnglishAccent,
} from "@/services/audio/english-speech";
import { useTheme } from "@/theme/ThemeProvider";

export function EnglishAudioButton({
  text,
  defaultAccent = "en-US",
  compact = false,
  autoPlayKey,
  single = false,
}: {
  text: string;
  defaultAccent?: EnglishAccent;
  compact?: boolean;
  autoPlayKey?: string;
  single?: boolean;
}) {
  const theme = useTheme();
  const [player] = useState(() => new EnglishSpeechPlayer(Speech));
  const [speakingAccent, setSpeakingAccent] = useState<EnglishAccent | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const played = useRef(new Set<string>());
  const request = useRef(0);

  const play = useCallback((accent: EnglishAccent) => {
    const current = ++request.current;
    setMessage("");
    setSpeakingAccent(accent);
    void player.speak(text, accent, error => {
      if (request.current !== current) return;
      setSpeakingAccent(null);
      if (error) setMessage("Chưa phát được âm thanh. Chạm loa để thử lại.");
    }).then(result => {
      if (request.current !== current) return;
      if (result !== "STARTED") setSpeakingAccent(null);
      if (result === "MISSING_VOICE") setMessage(`Chưa có giọng ${accent}. Hãy cài giọng này trong cài đặt TTS của thiết bị.`);
    }).catch(() => {
      if (request.current !== current) return;
      setSpeakingAccent(null);
      setMessage("Chưa phát được âm thanh. Chạm loa để thử lại hoặc kiểm tra cài đặt TTS.");
    });
  }, [player, text]);

  useFocusEffect(
    useCallback(() => {
      setSpeakingAccent(null);
      setMessage("");
      // Delay until the new card is visible; cleanup cancels rapid navigation/StrictMode replays.
      const timer = autoPlayKey && !played.current.has(autoPlayKey) ? setTimeout(() => {
        if (played.current.has(autoPlayKey)) return;
        if (AppState.currentState !== "active" && AppState.currentState !== null) return;
        played.current.add(autoPlayKey);
        play(defaultAccent);
      }, 150) : undefined;
      const subscription = AppState.addEventListener("change", (state) => {
        if (state !== "active") {
          clearTimeout(timer);
          request.current++;
          void player.stop().catch(() => undefined);
          setSpeakingAccent(null);
        }
      });
      return () => {
        clearTimeout(timer);
        request.current++;
        subscription.remove();
        void player.stop().catch(() => undefined);
      };
    }, [autoPlayKey, defaultAccent, play, player]),
  );

  const speak = (accent: EnglishAccent) => {
    if (autoPlayKey) played.current.add(autoPlayKey);
    if (speakingAccent === accent) {
      const current = ++request.current;
      void player
        .stop()
        .catch(() => { if (request.current === current) setMessage("Không dừng được giọng đọc."); })
        .finally(() => { if (request.current === current) setSpeakingAccent(null); });
      return;
    }

    play(accent);
  };

  return (
    <View testID="english-audio-controls" style={styles.container}>
      <View style={styles.controls}>
        {(single ? [defaultAccent] : ["en-US", "en-GB"] as const).map((accent) => {
          const isSpeaking = speakingAccent === accent;
          const isDefault = defaultAccent === accent;
          const shortName = accent === "en-US" ? "US" : "UK";
          const longName = accent === "en-US" ? "Anh Mỹ" : "Anh Anh";
          return (
            <Pressable
              key={accent}
              accessibilityRole="button"
              accessibilityLabel={
                isSpeaking ? `Dừng giọng ${longName}` : single ? "Nghe lại phát âm" : `Nghe giọng ${longName}`
              }
              accessibilityHint={isDefault ? "Giọng mặc định" : undefined}
              accessibilityState={{
                selected: isDefault,
                busy: isSpeaking,
              }}
              onPress={() => speak(accent)}
              style={({ pressed }) => [
                styles.voiceButton,
                {
                  backgroundColor: isSpeaking ? theme.primary : theme.surface,
                  borderColor: isDefault ? theme.primary : theme.border,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Ionicons
                name={isSpeaking ? "stop" : "volume-medium-outline"}
                size={16}
                color={isSpeaking ? theme.onPrimary : theme.primaryText}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.voiceButtonText,
                  { color: isSpeaking ? theme.onPrimary : theme.primaryText },
                ]}
              >
                {isSpeaking ? "Dừng" : single ? "Nghe lại" : shortName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!compact ? <Text style={[styles.sourceNote, { color: theme.textMuted }]}>
        Giọng đọc máy
      </Text> : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: theme.textPrimary }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  voiceButton: {
    minWidth: 56,
    minHeight: 44,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 11,
  },
  voiceButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sourceNote: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  message: {
    width: "100%",
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
});
