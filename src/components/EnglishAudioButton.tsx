import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { useCallback, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import {
  EnglishSpeechPlayer,
  type EnglishAccent,
} from "@/services/audio/english-speech";
import { useTheme } from "@/theme/ThemeProvider";

export function EnglishAudioButton({
  text,
  defaultAccent = "en-US",
}: {
  text: string;
  defaultAccent?: EnglishAccent;
}) {
  const theme = useTheme();
  const [player] = useState(() => new EnglishSpeechPlayer(Speech));
  const [speakingAccent, setSpeakingAccent] = useState<EnglishAccent | null>(
    null,
  );
  const [message, setMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      setSpeakingAccent(null);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state !== "active") {
          void player.stop().catch(() => undefined);
          setSpeakingAccent(null);
        }
      });
      return () => {
        subscription.remove();
        void player.stop().catch(() => undefined);
      };
    }, [player]),
  );

  const speak = (accent: EnglishAccent) => {
    if (speakingAccent === accent) {
      void player
        .stop()
        .catch(() => setMessage("Không dừng được giọng đọc."))
        .finally(() => setSpeakingAccent(null));
      return;
    }

    setMessage("");
    setSpeakingAccent(accent);
    void player
      .speak(text, accent, (error) => {
        setSpeakingAccent(null);
        if (error) {
          setMessage(
            "Giọng này chưa đọc được. Kiểm tra cài đặt chuyển văn bản thành giọng nói.",
          );
        }
      })
      .then((result) => {
        if (result !== "STARTED") setSpeakingAccent(null);
        if (result === "MISSING_VOICE") {
          setMessage(
            `Chưa có giọng ${accent}. Hãy cài giọng này trong cài đặt TTS của thiết bị.`,
          );
        }
      })
      .catch(() => {
        setSpeakingAccent(null);
        setMessage("TTS chưa khả dụng. Bạn vẫn có thể học offline.");
      });
  };

  return (
    <View testID="english-audio-controls" style={styles.container}>
      <View style={styles.controls}>
        {(["en-US", "en-GB"] as const).map((accent) => {
          const isSpeaking = speakingAccent === accent;
          const isDefault = defaultAccent === accent;
          const shortName = accent === "en-US" ? "US" : "UK";
          const longName = accent === "en-US" ? "Anh Mỹ" : "Anh Anh";
          return (
            <Pressable
              key={accent}
              accessibilityRole="button"
              accessibilityLabel={
                isSpeaking ? `Dừng giọng ${longName}` : `Nghe giọng ${longName}`
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
                {isSpeaking ? "Dừng" : shortName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.sourceNote, { color: theme.textMuted }]}>
        Giọng đọc máy
      </Text>
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
