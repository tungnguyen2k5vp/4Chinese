import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/design';
import type { HskBand, WordStatus } from '@/types/models';

export function HskBadge({ band }: { band: HskBand }) {
  const index = band === '7-9' ? 6 : band - 1;
  return <View style={[styles.badge, { backgroundColor: `${colors.hsk[index]}18` }]}><Text style={[styles.label, { color: colors.hsk[index] }]}>HSK {band}</Text></View>;
}

export function MasteryBadge({ level = 0, status }: { level?: number; status?: WordStatus }) {
  if (status === 'KNOWN') return <View style={[styles.badge, { backgroundColor: '#E9EFFF' }]}><Text style={[styles.label, { color: colors.primary }]}>Đã biết</Text></View>;
  if (status === 'SKIPPED') return <View style={[styles.badge, { backgroundColor: '#FDECEC' }]}><Text style={[styles.label, { color: colors.danger }]}>Bỏ qua</Text></View>;
  const labels = ['Chưa học','Mới gặp','Đang học','Đang nhớ','Nhớ tốt','Rất tốt','Nhớ sâu'];
  return <View style={[styles.badge, { backgroundColor: level >= 5 ? '#E5F6EF' : '#F1F3F8' }]}><Text style={[styles.label, { color: level >= 5 ? colors.success : colors.textMuted }]}>{labels[level] ?? labels[0]}</Text></View>;
}

const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 9 }, label: { fontSize: 11, fontWeight: '800' } });
