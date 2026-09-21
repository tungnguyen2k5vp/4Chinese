import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/design';

export function EmptyState({ icon = '好', title, message }: { icon?: string; title: string; message: string }) {
  return <View style={styles.container}><Text style={styles.icon}>{icon}</Text><Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text></View>;
}

const styles = StyleSheet.create({ container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.xl, gap: spacing.sm }, icon: { fontSize: 48, color: colors.primary }, title: { color: colors.text, fontSize: 18, fontWeight: '800' }, message: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 } });
