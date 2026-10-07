import type { ErrorBoundaryProps } from "expo-router";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { Screen } from "./Screen";

import { startupErrorMessage } from "@/services/app/startup-error";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

function RecoveryContent({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  return (
    <Screen
      title="Chưa mở được dữ liệu học"
      subtitle="App chưa sẵn sàng; dữ liệu của bạn không bị đặt lại."
    >
      <Text
        accessibilityRole="alert"
        style={{ color: theme.textPrimary, fontSize: 17, lineHeight: 26 }}
      >
        {startupErrorMessage(error)}
      </Text>
      <PrimaryButton
        label={
          Platform.OS === "web" ? "Tải lại trang, giữ dữ liệu" : "Thử mở lại"
        }
        onPress={() => {
          if (Platform.OS === "web" && typeof window !== "undefined")
            window.location.reload();
          else void retry();
        }}
      />
      <Text style={{ color: theme.textMuted }}>
        Nếu thử lại vẫn lỗi trên điện thoại, hãy đóng và mở lại app. Không gỡ
        app hoặc xóa dữ liệu để xử lý lỗi này.
      </Text>
    </Screen>
  );
}
export function StartupErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <RecoveryContent {...props} />
    </ThemeProvider>
  );
}

function LoadingContent() {
  const theme = useTheme();
  return (
    <Screen title="Đang mở dữ liệu học offline">
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Đang chuẩn bị dữ liệu học"
        style={{ gap: 16 }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary }}>
          Lần mở đầu hoặc cập nhật dữ liệu có thể lâu hơn. Không đặt lại tiến
          độ.
        </Text>
      </View>
    </Screen>
  );
}
export function StartupLoading() {
  return (
    <ThemeProvider>
      <LoadingContent />
    </ThemeProvider>
  );
}
