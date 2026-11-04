import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo-modules-core";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "@/constants/design";
import { pinyinInputFromSpeechTranscript, type SpeechVocabularyHint } from "@/services/speech/chinese-speech-input";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

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
  compact = false,
  onStatusChange,
  onRecognizedPinyin,
}: {
  targetWord: SpeechVocabularyHint;
  contextualStrings: string[];
  disabled?: boolean;
  compact?: boolean;
  onStatusChange?: (status: string | null) => void;
  onRecognizedPinyin: (pinyin: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => { onStatusChange?.(status); }, [onStatusChange, status]);

  useEffect(() => {
    if (!speechModule) return undefined;

    const start = speechModule.addListener("start", () => {
      setListening(true);
      setStatus("Đang nghe tiếng Trung…");
    });
    const end = speechModule.addListener("end", () => { setListening(false); setStatus((current) => current === "?ang nghe ti?ng Trung?" ? "Ch?a nghe r?. Ch?m N?i ?? th? l?i ho?c nh?p pinyin." : current); });
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
        if (speechError.error === "audio-capture") {
          setStatus("Kh\u00f4ng m\u1edf \u0111\u01b0\u1ee3c micro. Ki\u1ec3m tra quy\u1ec1n micro r\u1ed3i th\u1eed l\u1ea1i.");
          return;
        }
        if (speechError.error === "network") { setStatus("D\u1ecbch v\u1ee5 nh\u1eadn d\u1ea1ng \u0111ang ngo\u1ea1i tuy\u1ebfn. H\u00e3y nh\u1eadp pinyin ho\u1eb7c th\u1eed l\u1ea1i khi c\u00f3 m\u1ea1ng."); return; }
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
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "free_form" },
        iosTaskHint: "confirmation",
      });
    } catch {
      setListening(false);
      setStatus("Không thể mở micro. Hãy thử lại sau.");
    }
  };

  return (
    <View style={[styles.container, compact && { width: 48 }]}>
      <Pressable
        accessibilityLabel={listening ? "Dừng nhận diện giọng nói" : "Nhập pinyin bằng giọng nói"}
        accessibilityHint={listening ? "Dừng nghe hiện tại." : "Đọc rõ từ tiếng Trung để điền pinyin."}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: listening }}
        disabled={disabled}
        onPress={() => void toggleListening()}
        style={({ pressed }) => [styles.button, compact && { width: 48, paddingHorizontal: 0 }, listening && styles.listening, disabled && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons color={listening ? theme.onError : theme.primaryText} name={listening ? "stop" : "mic"} size={20} />
        {!compact ? <Text style={[styles.buttonText, listening && styles.listeningText]}>{listening ? "Dừng" : "Nói"}</Text> : null}
      </Pressable>
      {status && !compact ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { width: 116, flexShrink: 0, gap: spacing.xs },
    button: { width: 116, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.primarySoft, paddingHorizontal: spacing.md },
    listening: { borderColor: theme.error, backgroundColor: theme.error },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
    buttonText: { color: theme.primaryText, fontSize: 13, fontWeight: "900" },
    listeningText: { color: theme.onError },
    status: { color: theme.textMuted, fontSize: 12, lineHeight: 17, width: 116 },
  });
}
