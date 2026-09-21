import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo-modules-core";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/design";
import { pinyinInputFromSpeechTranscript, type SpeechVocabularyHint } from "@/services/speech/chinese-speech-input";

type SpeechEventName = "start" | "end" | "result" | "error" | "nomatch";
type NativeSpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  addListener: (eventName: SpeechEventName, listener: (event: unknown) => void) => { remove: () => void };
};

// Optional runtime lookup means Expo Go continues to show the normal pinyin
// field instead of crashing. The module is available in an Expo dev build.
const speechModule = requireOptionalNativeModule<NativeSpeechModule>("ExpoSpeechRecognition");

export function SpeechPinyinButton({
  targetWord,
  contextualStrings,
  disabled = false,
  onRecognizedPinyin,
}: {
  targetWord: SpeechVocabularyHint;
  contextualStrings: string[];
  disabled?: boolean;
  onRecognizedPinyin: (pinyin: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!speechModule) return undefined;

    const start = speechModule.addListener("start", () => {
      setListening(true);
      setStatus("Đang nghe tiếng Trung…");
    });
    const end = speechModule.addListener("end", () => setListening(false));
    const noMatch = speechModule.addListener("nomatch", () => {
      setListening(false);
      setStatus("Chưa nghe rõ. Hãy nói chậm một lần nữa.");
    });
    const result = speechModule.addListener("result", (event) => {
      const speechEvent = event as ExpoSpeechRecognitionResultEvent;
      if (!speechEvent.isFinal) return;

      setListening(false);
      const transcript = speechEvent.results[0]?.transcript ?? "";
      const pinyin = pinyinInputFromSpeechTranscript(transcript, targetWord);
      if (!pinyin) {
        setStatus("Kết quả chưa khớp từ này. Hãy nói lại hoặc nhập pinyin.");
        return;
      }
      onRecognizedPinyin(pinyin);
      setStatus(`Đã nghe: ${transcript}. Hãy chạm để chọn Hán tự.`);
    });
    const error = speechModule.addListener("error", (event) => {
      const speechError = event as ExpoSpeechRecognitionErrorEvent;
      setListening(false);
      if (speechError.error !== "aborted") {
        setStatus("Không nhận được giọng nói. Kiểm tra mạng hoặc nói lại.");
      }
    });

    return () => [start, end, noMatch, result, error].forEach((subscription) => subscription.remove());
  }, [onRecognizedPinyin, targetWord]);

  const toggleListening = async () => {
    if (!speechModule) {
      Alert.alert(
        "Cần bản development",
        "Expo Go không có mô-đun nhận giọng nói. Hãy chạy app bằng development build để dùng micro.",
      );
      return;
    }
    if (listening) {
      speechModule.stop();
      return;
    }
    if (!speechModule.isRecognitionAvailable()) {
      setStatus("Thiết bị chưa có dịch vụ nhận giọng nói tiếng Trung.");
      return;
    }

    try {
      const permission = await speechModule.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus("Bạn cần cho phép micro để dùng tính năng này.");
        return;
      }
      setStatus("Đang khởi động micro…");
      speechModule.start({
        lang: "zh-CN",
        continuous: false,
        interimResults: true,
        maxAlternatives: 3,
        contextualStrings,
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "web_search" },
        iosTaskHint: "confirmation",
      });
    } catch {
      setListening(false);
      setStatus("Không thể mở micro. Hãy thử lại sau.");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={listening ? "Dừng nhận diện giọng nói" : "Nhập pinyin bằng giọng nói"}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => void toggleListening()}
        style={({ pressed }) => [styles.button, listening && styles.listening, disabled && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons color={listening ? "#FFFFFF" : colors.primary} name={listening ? "stop" : "mic"} size={20} />
        <Text style={[styles.buttonText, listening && styles.listeningText]}>{listening ? "Dừng" : "Nói"}</Text>
      </Pressable>
      {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  button: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md },
  listening: { borderColor: colors.danger, backgroundColor: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  buttonText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  listeningText: { color: "#FFFFFF" },
  status: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
