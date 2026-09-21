import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/constants/design';

export function PrimaryButton({ label, onPress, variant = 'primary', icon, loading, disabled, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} /> : <Text style={[styles.text, variant !== 'primary' && styles.altText]}>{icon ? `${icon}  ` : ''}{label}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  base: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.primarySoft }, ghost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, danger: { backgroundColor: '#FDECEC' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.5 }, text: { color: '#fff', fontSize: 15, fontWeight: '800' }, altText: { color: colors.primary },
});
