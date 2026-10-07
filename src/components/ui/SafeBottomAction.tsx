import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/design';
import { useTheme } from '@/theme/ThemeProvider';

/** Keeps a sticky action above Android navigation bars and the home indicator. */
export function SafeBottomAction({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm), backgroundColor: theme.background }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.xs },
});
