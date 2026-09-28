import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { getGamificationSummary, setWeeklyStudyGoal, type GamificationSummary } from '@/db/gamification';
import { getSettings } from '@/db/repository';

export default function AchievementsScreen() {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const saveBusy = useRef(false);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setNotice('');
    try {
      const settings = await getSettings(db);
      const result = await getGamificationSummary(db, settings.dailyStudyMinutes);
      if (request !== generation.current) return;
      setSummary(result);
      setGoal(String(result.weeklyMinutes));
    } catch {
      if (request === generation.current) setNotice('Chưa tải được tiến độ. Bạn có thể thử lại.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const save = async () => {
    if (saveBusy.current) return;
    const minutes = /^\d{1,4}$/.test(goal.trim()) ? Number(goal.trim()) : NaN;
    if (!Number.isInteger(minutes) || minutes < 30 || minutes > 2100) {
      setNotice('Nhập mục tiêu từ 30 đến 2.100 phút mỗi tuần.'); return;
    }
    const request = generation.current;
    saveBusy.current = true;
    setSaving(true);
    try {
      await setWeeklyStudyGoal(db, minutes);
      if (request === generation.current) {
        setSummary((previous) => previous ? { ...previous, weeklyMinutes: minutes } : previous);
        setNotice('Đã lưu mục tiêu tuần.');
      }
    } catch { if (request === generation.current) setNotice('Chưa lưu được. Mục tiêu cũ vẫn giữ nguyên.'); }
    finally { saveBusy.current = false; setSaving(false); }
  };
  return <Screen title="Thành tích & mục tiêu" subtitle="Tiến độ thật, lưu trên thiết bị và trong bản sao lưu.">
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {!loading && !summary ? <PrimaryButton label="Thử lại" onPress={() => void load()} /> : null}
    {summary ? <>
      <View style={[card, styles.block]}>
        <Text style={styles.heading}>{summary.totalXp} XP · hôm nay +{summary.todayXp}</Text>
        <Text style={styles.copy}>XP tính từ các hoạt động hoàn thành sau bản cập nhật này, không tự cộng số giả cho lịch sử cũ.</Text>
        <Text style={styles.copy}>Mỗi nội dung được thưởng tối đa một lần/ngày; học từ mới và đọc hiểu truyện thưởng một lần.</Text>
        <Text style={styles.heading}>Chuỗi {summary.streak} ngày · tốt nhất {summary.bestStreak}</Text>
      </View>
      <View style={[card, styles.block]}>
        <Text style={styles.heading}>Tuần {summary.week.start} → {summary.week.end}</Text>
        <Text style={styles.value}>{Math.floor(summary.weeklySeconds / 60)} / {summary.weeklyMinutes} phút</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, summary.weeklySeconds / (summary.weeklyMinutes * 60) * 100)}%` }]} /></View>
        <Text style={styles.copy}>Thứ Hai–Chủ nhật theo giờ thiết bị. Sang tuần mới tiến độ tính lại, mục tiêu vẫn giữ nguyên.</Text>
        <Text style={styles.label}>Mục tiêu phút mỗi tuần</Text>
        <TextInput accessibilityLabel="Mục tiêu học mỗi tuần, phút" value={goal} onChangeText={setGoal}
          keyboardType="number-pad" maxLength={4} editable={!saving} style={styles.input} />
        <PrimaryButton label="Lưu mục tiêu" disabled={saving} onPress={() => void save()} />
      </View>
      <View style={[card, styles.block]}>
        <Text style={styles.heading}>Thành tích</Text>
        {summary.achievements.map((item) => <View key={item.id} style={styles.achievement}>
          <Text style={styles.label}>{item.title}</Text>
          <Text style={styles.copy}>{item.unlockedAt ? 'Đã đạt ✓' : `${Math.min(item.progress, item.threshold)} / ${item.threshold}`}</Text>
        </View>)}
        <Text style={styles.copy}>Thành tích đã đạt không bị khóa lại khi chuỗi học đứt. “Bài viết” tính lượt trả lời Hán tự đúng, không đếm nét vẽ.</Text>
      </View>
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  block: { gap: spacing.md }, heading: { color: colors.text, fontWeight: '800', fontSize: 18 },
  value: { color: colors.primary, fontSize: 26, fontWeight: '900' }, copy: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
  label: { color: colors.text, fontWeight: '700' }, notice: { color: colors.primary, lineHeight: 22 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  input: { minHeight: 48, color: colors.text, padding: spacing.md, borderWidth: 1, borderRadius: 12, borderColor: colors.border },
  achievement: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md, gap: 4 },
});
