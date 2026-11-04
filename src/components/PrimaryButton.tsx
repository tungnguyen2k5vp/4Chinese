import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { MotionPressable } from '@/components/ui/MotionPressable';
import { radius, spacing } from '@/constants/design';
import { useTheme } from '@/theme/ThemeProvider';

export function PrimaryButton({ label, onPress, variant = 'primary', icon, loading, disabled, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return <MotionPressable accessibilityLabel={label}
    accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    disabled={disabled || loading} onPress={onPress}
    pressedScale={variant === 'primary' || variant === 'danger' ? 0.97 : 0.98}
    style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? theme.onPrimary : theme.primaryText} /> : <Text style={[styles.text, variant !== 'primary' && styles.altText, variant === 'danger' && styles.dangerText]}>{icon ? `${icon}  ` : ''}{label}</Text>}
  </MotionPressable>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  base: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  primary: { backgroundColor: theme.primary }, secondary: { backgroundColor: theme.primarySoft }, ghost: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, danger: { backgroundColor: theme.errorSoft },
  disabled: { opacity: 0.5 }, text: { color: theme.onPrimary, fontSize: 15, fontWeight: '800' }, altText: { color: theme.primaryText }, dangerText: { color: theme.error },
}); }
