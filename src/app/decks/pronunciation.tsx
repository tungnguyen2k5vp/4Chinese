import { requireOptionalNativeModule } from "expo-modules-core";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, spacing } from "@/constants/design";

const hasExpoAudio = Boolean(requireOptionalNativeModule("ExpoAudio"));
// Expo Router có thể nạp route này ngay cả khi người dùng chưa mở màn phát âm.
// Không dùng React.lazy ở đây: Metro sẽ tạo một bundle phụ cho file native và
// development client đôi khi bị treo ở bundle đó, dẫn đến màn hình trắng.
// `require` chỉ chạy khi native module đã có trong development build.
const DeckPronunciationNative = hasExpoAudio
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require("@/components/DeckPronunciationNative").default
  : null;

export default function DeckPronunciationScreen() {
  if (!DeckPronunciationNative) {
    return (
      <Screen title="Luyện phát âm AI">
        <View style={[card, styles.card]}>
          <Text style={styles.icon}>🎙</Text>
          <Text style={styles.title}>Cần cập nhật development build</Text>
          <Text style={styles.message}>
            Bản app đang mở chưa chứa mô-đun ghi âm ExpoAudio. Các phần học khác vẫn dùng bình thường;
            sau khi cài lại development build, nút ghi âm và chấm điểm AI sẽ hoạt động.
          </Text>
          <View style={styles.commandBox}>
            <Text selectable style={styles.command}>cd D:\ReactJS\HocTiengTrungApp</Text>
            <Text selectable style={styles.command}>npx expo run:android --device</Text>
            <Text selectable style={styles.command}>npx expo start --dev-client --clear</Text>
          </View>
        </View>
        <PrimaryButton label="Quay lại" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <DeckPronunciationNative />;
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  icon: { fontSize: 44 },
  title: { color: colors.text, fontSize: 21, fontWeight: "900", textAlign: "center" },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  commandBox: { alignSelf: "stretch", backgroundColor: colors.background, borderRadius: 12, gap: 7, padding: spacing.md },
  command: { color: colors.primary, fontFamily: "monospace", fontSize: 12 },
});
