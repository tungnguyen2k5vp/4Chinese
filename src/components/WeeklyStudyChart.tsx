import { StyleSheet, Text, View } from 'react-native';

import { toLocalDateKey } from '@/services/stats/calendar';
import { useTheme } from '@/theme/ThemeProvider';

export function WeeklyStudyChart({ days }: { days: { date: string; seconds: number }[] }) {
  const theme = useTheme();
  const peak = Math.max(60, ...days.map(day => day.seconds));
  const today = toLocalDateKey(new Date());
  const styles = StyleSheet.create({
    chart: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', paddingTop: 8 },
    day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
    track: { width: '65%', height: 65, justifyContent: 'flex-end', backgroundColor: theme.backgroundSecondary, borderRadius: 6, overflow: 'hidden' },
    label: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  });
  return <View style={styles.chart} testID="weekly-study-chart">{days.map((day, index) => <View key={day.date} style={styles.day} accessible accessibilityLabel={`${day.date}: ${Math.floor(day.seconds / 60)} phút học`}>
    <Text style={styles.label}>{day.seconds > 0 ? Math.floor(day.seconds / 60) || '<1' : '0'}</Text>
    <View style={styles.track}><View style={{ width: '100%', height: day.seconds > 0 ? Math.max(3, day.seconds / peak * 65) : 0, backgroundColor: day.date === today ? theme.primary : theme.success, borderRadius: 6 }} /></View>
    <Text style={[styles.label, day.date === today && { color: theme.primaryText, fontWeight: '900' }]}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}</Text>
  </View>)}</View>;
}
