import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import { colors } from "@/constants/design";
import {
  speakChinese,
  stopChineseSpeech,
} from "@/services/audio/chinese-speech";
import { useAppStore } from "@/stores/app-store";

export function AudioButton({
  text,
  rate = 0.82,
  size = 26,
}: {
  text: string;
  rate?: number;
  size?: number;
}) {
  const [speaking, setSpeaking] = useState(false);
  const speechRate = useAppStore((state) => state.settings?.speechRate ?? rate);

  const speak = async () => {
    if (speaking) {
      await stopChineseSpeech();
      setSpeaking(false);
      return;
    }

    try {
      const result = await speakChinese(text, {
        rate: speechRate,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });

      if (!result.ok && result.reason === "missing-mandarin-voice") {
        setSpeaking(false);
        Alert.alert(
          "Thiếu giọng đọc tiếng Trung",
          "Hãy mở Cài đặt Android → Văn bản thành giọng nói và tải giọng Tiếng Trung (Trung Quốc), sau đó mở lại app.",
        );
      }
    } catch {
      setSpeaking(false);
      Alert.alert(
        "Không thể phát âm",
        "Bộ đọc văn bản của điện thoại đang gặp lỗi. Hãy kiểm tra âm lượng phương tiện và dịch vụ Văn bản thành giọng nói.",
      );
    }
  };

  return (
    <Pressable
      accessibilityLabel={`Nghe phát âm ${text}`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={(event) => {
        event.stopPropagation();
        void speak();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons
        name={speaking ? "stop" : "volume-high"}
        size={size}
        color={colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: colors.primarySoft,
  },
  pressed: { opacity: 0.7 },
});
