import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function SocialInput(props: TextInputProps) {
  const t = useTheme();
  return <TextInput placeholderTextColor={t.textMuted} selectionColor={t.primary} accessibilityLabel={props.placeholder} {...props} style={[styles.input, { color: t.textPrimary, backgroundColor: t.surface, borderColor: t.border }, props.style]} />;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 16, minHeight: 50 } });
