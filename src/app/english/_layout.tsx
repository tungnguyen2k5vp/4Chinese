import { Stack } from "expo-router";

import { EnglishAvailability } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";

export { StartupErrorBoundary as ErrorBoundary } from "@/components/StartupRecovery";

export default function EnglishLayout() {
  const theme = useTheme();
  return (
    <EnglishAvailability>
      <Stack
        screenOptions={{
          statusBarStyle: theme.mode === 'dark' ? 'light' : 'dark',
          headerTintColor: theme.textPrimary,
          headerStyle: { backgroundColor: theme.background },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="library" options={{ title: 'Thư viện bài đọc' }} />
        <Stack.Screen
          name="reader"
          options={{ title: "Đọc tiếng Anh cá nhân" }}
        />
        <Stack.Screen
          name="card-edit"
          options={{ title: "Chỉnh sửa thẻ tiếng Anh" }}
        />
        <Stack.Screen
          name="index"
          options={{ title: "Kho từ tiếng Anh" }}
        />
        <Stack.Screen name="word" options={{ title: "Chi tiết từ" }} />
        <Stack.Screen
          name="decks"
          options={{ title: "Bộ từ riêng" }}
        />
        <Stack.Screen name="deck-trash" options={{ title: "Thùng rác bộ từ" }} />
        <Stack.Screen name="decks/[id]" options={{ title: "Chi tiết bộ từ" }} />
        <Stack.Screen name="decks/[id]/learn" options={{ title: "Học từ mới" }} />
        <Stack.Screen
          name="bulk"
          options={{ title: "Thêm từ mới" }}
        />
        <Stack.Screen name="dictionary-source" options={{ title: "Nguồn từ điển" }} />
        <Stack.Screen name="profile" options={{ title: "Hồ sơ tiếng Anh" }} />
        <Stack.Screen name="onboarding" options={{ title: "Bắt đầu học tiếng Anh" }} />
        <Stack.Screen name="suspended" options={{ title: "Các từ đã bỏ qua" }} />
        <Stack.Screen
          name="activity"
          options={{ title: "Hoạt động tiếng Anh" }}
        />
        <Stack.Screen
          name="review"
          options={{ title: "Ôn tiếng Anh", gestureEnabled: false }}
        />
      </Stack>
    </EnglishAvailability>
  );
}
