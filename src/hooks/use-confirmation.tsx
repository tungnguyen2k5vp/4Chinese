import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useTheme } from "@/theme/ThemeProvider";

type Confirmation = {
  title: string;
  message: string;
  acceptLabel: string;
  cancelLabel?: string;
  acceptVariant?: 'primary' | 'danger';
};

/** In-app confirmation works on web too (React Native Alert is native-only).
 * Cancels on unmount, Android back, and overlapping requests.
 */
export function useConfirmation() {
  const theme = useTheme();
  const [pending, setPending] = useState<Confirmation | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );
  const finish = useCallback((accepted: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPending(null);
    resolve?.(accepted);
  }, []);
  const ask = useCallback((request: Confirmation) => {
    if (resolver.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending(request);
    });
  }, []);
  const dialog = (
    <Modal
      visible={pending !== null}
      transparent
      animationType="none"
      onRequestClose={() => finish(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          accessibilityViewIsModal
          aria-modal
          role="dialog"
          aria-label={pending?.title}
          style={{
            width: "100%",
            maxWidth: 480,
            maxHeight: "85%",
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 20,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.textPrimary,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              {pending?.title}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 17,
                lineHeight: 26,
              }}
            >
              {pending?.message}
            </Text>
            <PrimaryButton
              label={pending?.acceptLabel ?? "Xác nhận"}
              variant={pending?.acceptVariant ?? 'primary'}
              onPress={() => finish(true)}
            />
            <PrimaryButton
              label={pending?.cancelLabel ?? "Ở lại"}
              variant="secondary"
              onPress={() => finish(false)}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  return { ask, dialog };
}
