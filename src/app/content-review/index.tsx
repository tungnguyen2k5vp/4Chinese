import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { spacing, themedCard } from '@/constants/design';
import { readReviewDashboard, type ReviewDashboardRow } from '@/services/content/review-dashboard';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

/** Developer-only, read-only report. It is intentionally absent from learner navigation. */
export default function ContentReviewDashboard() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <DashboardContent />;
}

function DashboardContent() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [rows, setRows] = useState<ReviewDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    void readReviewDashboard(db).then((next) => { if (live) { setRows(next); setError(''); } })
      .catch(() => { if (live) setError('Không đọc được báo cáo review cục bộ. Dữ liệu học không bị thay đổi.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [db, reload]);
  return <Screen title="Content review" subtitle="Báo cáo chỉ đọc dành cho developer; không tự duyệt hoặc xuất bản nội dung.">
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {error ? <View style={themedCard(theme)}><Text style={styles.meta}>{error}</Text><PrimaryButton label="Thử lại" onPress={() => setReload((value) => value + 1)} /></View> : null}
    {!loading && !error ? rows.map((row) => <Pressable key={row.key} accessibilityRole="summary" style={[themedCard(theme), styles.card]}>
      <View style={styles.row}><Text style={styles.title}>{row.label}</Text><Text style={styles.total}>{row.available ? row.total : '—'}</Text></View>
      <Text style={styles.meta}>{row.available ? (row.statusTracked ? 'Có lifecycle review' : 'Có dữ liệu nhưng chưa có cột review_status') : 'Chưa có bảng/nguồn trong schema hiện tại'}</Text>
      <View style={styles.states}>{Object.entries(row.counts).map(([state, count]) => <Text key={state} style={styles.state}>{state}: {count}</Text>)}</View>
    </Pressable>) : null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  card: { gap: spacing.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'center' },
  title: { flex: 1, color: theme.textPrimary, fontSize: 18, fontWeight: '800' }, total: { color: theme.primaryText, fontSize: 22, fontWeight: '800' },
  meta: { color: theme.textMuted, lineHeight: 20 }, states: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, state: { color: theme.primaryText, fontWeight: '700' },
}); }

