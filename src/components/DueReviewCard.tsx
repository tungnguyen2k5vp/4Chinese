import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { card, colors, spacing, typography } from '@/constants/design';

export function DueReviewCard({ count, onPress }: { count: number; onPress: () => void }) {
  return <View style={[card, styles.card]}><View style={styles.copy}>
    <Text style={styles.eyebrow}>{count > 0 ? 'ĐÃ ĐẾN LÚC ÔN TẬP' : 'HOÀN THÀNH HÔM NAY'}</Text>
    {count > 0 ? <><Text style={styles.count}>{count} từ</Text><Text style={styles.caption}>Một lượt ngắn để giữ trí nhớ bền lâu.</Text></> : <Text style={styles.complete}>Tuyệt vời! Bạn đã hoàn thành toàn bộ lượt ôn hôm nay.</Text>}
  </View>{count > 0 ? <PrimaryButton label="Ôn tập ngay" onPress={onPress} style={styles.button} /> : null}</View>;
}

const styles = StyleSheet.create({ card: { gap: spacing.lg, borderLeftWidth: 4, borderLeftColor: colors.accent }, copy: { gap: 5 }, eyebrow: { color: colors.warning, fontWeight: '800', fontSize: 11, letterSpacing: 0.8 }, count: { color: colors.text, fontWeight: '900', fontSize: typography.title }, caption: { color: colors.textMuted, lineHeight: 20 }, complete: { color: colors.success, fontSize: 15, lineHeight: 22, fontWeight: '600' }, button: { alignSelf: 'stretch' } });
