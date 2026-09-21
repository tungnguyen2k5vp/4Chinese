import type { PropsWithChildren, ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';

import { colors, spacing, typography } from '@/constants/design';

export function Screen({ children, scroll = true, title, subtitle, right, refreshControl }: PropsWithChildren<{
  scroll?: boolean; title?: string; subtitle?: string; right?: ReactNode; refreshControl?: ScrollViewProps['refreshControl'];
}>) {
  const content = <View style={styles.content}>
    {(title || subtitle || right) && <View style={styles.header}><View style={styles.headerCopy}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>{right}</View>}
    {children}
  </View>;
  return <SafeAreaView style={styles.safe}>
    {scroll ? <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={refreshControl} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg },
  headerCopy: { flex: 1, gap: 3 }, title: { color: colors.text, fontSize: typography.title, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: typography.body, lineHeight: 21 },
});
