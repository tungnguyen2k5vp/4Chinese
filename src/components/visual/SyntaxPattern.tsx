import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/design';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

/** Separates the visible operators from a grammar pattern; it does not infer syntax roles. */
export function SyntaxPattern({ value }: { value: string }) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const parts = value.split(/(\s*[+＋＝=]\s*)/u).filter(Boolean);
  return <View accessibilityLabel={`Mẫu câu: ${value}`} style={styles.row}>
    {parts.map((part, index) => /^\s*[+＋＝=]\s*$/u.test(part)
      ? <Text key={`${part}-${index}`} style={styles.operator}>{part.trim()}</Text>
      : <Text key={`${part}-${index}`} style={[styles.token, { color: theme.primaryText }]}>{part.trim()}</Text>)}
  </View>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  token: { color: theme.primaryText, backgroundColor: theme.primarySoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5, fontSize: 15, fontWeight: '800' },
  operator: { color: theme.textMuted, fontSize: 15, fontWeight: '900' },
}); }
