import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { radius, spacing, themedCard } from '@/constants/design';
import { getGamificationSummary, setWeeklyStudyGoal, type GamificationSummary } from '@/db/gamification';
import { getSettings } from '@/db/repository';
import { playHaptic } from '@/services/feedback/feedback-service';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

function achievementIcon(id: string): keyof typeof Ionicons.glyphMap {
  if (id.includes('streak')) return 'flame';
  if (id.includes('review')) return 'repeat';
  if (id.includes('write')) return 'brush';
  if (id.includes('learn')) return 'school';
  return 'ribbon';
}

function achievementSeal(id: string) {
  if (id.includes('streak')) return '火';
  if (id.includes('review')) return '复';
  if (id.includes('write')) return '写';
  if (id.includes('learn')) return '学';
  return '词';
}

export default function AchievementsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = createStyles(theme);
  const hapticEnabled = useAppStore((state) => state.settings?.hapticEnabled);
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
        void playHaptic('success', hapticEnabled);
      }
    } catch { if (request === generation.current) setNotice('Chưa lưu được. Mục tiêu cũ vẫn giữ nguyên.'); }
    finally { saveBusy.current = false; setSaving(false); }
  };

  const unlocked = summary?.achievements.filter((item) => Boolean(item.unlockedAt)).length ?? 0;
  const weeklyProgress = summary && summary.weeklyMinutes > 0 ? Math.min(1, summary.weeklySeconds / (summary.weeklyMinutes * 60)) : 0;

  return <Screen title="Thành tích & mục tiêu" subtitle="Mỗi cột mốc được tính từ hoạt động học thực tế." hideHeader>
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {!loading && !summary ? <PrimaryButton label="Thử lại" onPress={() => void load()} /> : null}
    {summary ? <>
      <View style={styles.hero}>
        <View style={styles.heroArt}><LearningLandscape mood="progress" scene="achievement" height={115} /><View style={styles.todaySeal}><Text style={styles.todaySealText}>4C</Text></View></View>
        <View style={styles.heroBody}>
          <View style={styles.heroTop}><View style={styles.heroXp}><Text style={styles.eyebrow}>HỒ SƠ HỌC TẬP</Text><Text style={styles.heroValue}>{summary.totalXp} XP</Text><Text style={styles.heroCopy}>+{summary.todayXp} XP hôm nay</Text></View><View style={styles.streak}><Ionicons name="flame" size={21} color={theme.warning} /><Text style={styles.streakValue}>{summary.streak}</Text><Text style={styles.streakLabel}>ngày liền</Text></View></View>
          <View style={styles.heroDivider} />
          <Text style={styles.heroSmall}>Kỷ lục chuỗi: {summary.bestStreak} ngày · {unlocked} dấu ấn đã mở</Text>
        </View>
      </View>

      <View style={[themedCard(theme), styles.block]}>
        <View style={styles.headingRow}><View><Text style={styles.heading}>Mục tiêu tuần</Text><Text style={styles.copy}>{Math.floor(summary.weeklySeconds / 60)} / {summary.weeklyMinutes} phút · {summary.week.start} → {summary.week.end}</Text></View><Text style={styles.percent}>{Math.round(weeklyProgress * 100)}%</Text></View>
        <AnimatedProgressBar progress={weeklyProgress} color={theme.primary} trackColor={theme.border} height={10} accessibilityLabel="Tiến độ mục tiêu học tuần" />
        <View style={styles.goalRow}><TextInput accessibilityLabel="Mục tiêu học mỗi tuần, phút" value={goal} onChangeText={setGoal} keyboardType="number-pad" maxLength={4} editable={!saving} style={styles.input} /><Text style={styles.goalUnit}>phút/tuần</Text></View>
        <PrimaryButton label="Lưu mục tiêu" disabled={saving} onPress={() => void save()} />
      </View>

      <View style={styles.titleRow}><View><Text style={styles.heading}>Ấn chương hành trình</Text><Text style={styles.copy}>Mỗi dấu ấn đến từ hoạt động học thật.</Text></View><View style={styles.countPill}><Text style={styles.countText}>{unlocked}/{summary.achievements.length}</Text></View></View>
      <View style={styles.achievementGrid}>
        {summary.achievements.map((item) => {
          const progress = item.threshold > 0 ? Math.min(1, item.progress / item.threshold) : 0;
          const isUnlocked = Boolean(item.unlockedAt);
          return <MotionPressable key={item.id} haptic={isUnlocked} accessibilityLabel={`${item.title}. ${isUnlocked ? 'Đã đạt' : `${Math.min(item.progress, item.threshold)} trên ${item.threshold}`}`} onPress={() => isUnlocked ? void playHaptic('success', hapticEnabled) : undefined} style={[themedCard(theme), styles.achievement, isUnlocked && styles.achievementUnlocked]}>
            <View style={[styles.seal, isUnlocked && styles.sealUnlocked, !isUnlocked && styles.sealLocked]}><Text style={[styles.sealMark, isUnlocked && styles.sealMarkUnlocked]}>{achievementSeal(item.id)}</Text><Ionicons name={achievementIcon(item.id)} size={11} color={isUnlocked ? theme.success : theme.textMuted} style={styles.sealIcon} /></View>
            <Text style={styles.achievementTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.achievementStatus, isUnlocked && styles.achievementDone]}>{isUnlocked ? 'ĐÃ MỞ · LƯU VĨNH VIỄN' : `${Math.min(item.progress, item.threshold)} / ${item.threshold}`}</Text>
            {!isUnlocked ? <AnimatedProgressBar progress={progress} color={theme.primary} trackColor={theme.border} height={5} accessibilityLabel={`${item.title}: ${Math.round(progress * 100)} phần trăm`} /> : null}
          </MotionPressable>;
        })}
      </View>
      <View style={styles.note}><Ionicons name="information-circle-outline" size={18} color={theme.primaryText} /><Text style={styles.noteText}>XP và thành tích chỉ tính từ hoạt động hoàn thành; không cộng lại số liệu lịch sử giả lập.</Text></View>
    </> : null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  notice: { color: theme.primaryText, lineHeight: 22 },
  hero: { overflow: 'hidden', backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg },
  heroArt: { position: 'relative' }, todaySeal: { position: 'absolute', left: spacing.md, top: spacing.md, width: 38, height: 38, borderWidth: 1.5, borderColor: '#A94D45', borderRadius: 6, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }, todaySealText: { color: '#A94D45', fontSize: 14, fontWeight: '900' }, heroBody: { padding: spacing.lg, gap: spacing.md }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }, heroXp: { gap: 3 },
  eyebrow: { color: theme.primaryText, fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  heroValue: { color: theme.textPrimary, fontWeight: '900', fontSize: 34, lineHeight: 42 },
  heroCopy: { color: theme.textSecondary, fontSize: 13 },
  heroDivider: { height: 1, backgroundColor: theme.border },
  heroSmall: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
  streak: { width: 78, minHeight: 78, borderRadius: 24, backgroundColor: theme.warningSoft, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs },
  streakValue: { color: theme.textPrimary, fontWeight: '900', fontSize: 20, lineHeight: 22 },
  streakLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
  block: { gap: spacing.md },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  heading: { color: theme.textPrimary, fontWeight: '800', fontSize: 18 },
  copy: { color: theme.textMuted, lineHeight: 20, fontSize: 13 },
  percent: { color: theme.primaryText, fontSize: 22, fontWeight: '900' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, minHeight: 48, color: theme.textPrimary, backgroundColor: theme.surface, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.md, borderColor: theme.border },
  goalUnit: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  countPill: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: theme.primarySoft },
  countText: { color: theme.primaryText, fontSize: 13, fontWeight: '900' },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  achievement: { width: '47%', flexGrow: 1, minHeight: 175, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.backgroundSecondary, shadowOpacity: 0 },
  achievementUnlocked: { borderWidth: 1.5, borderColor: theme.success, backgroundColor: theme.surface },
  seal: { width: 62, height: 62, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', position: 'relative', transform: [{ rotate: '-4deg' }] },
  sealUnlocked: { borderColor: '#A94D45', backgroundColor: theme.warningSoft },
  sealLocked: { borderColor: theme.border, borderStyle: 'dashed', backgroundColor: theme.surface },
  sealMark: { color: theme.textMuted, fontSize: 30, fontWeight: '900' }, sealMarkUnlocked: { color: '#A94D45' }, sealIcon: { position: 'absolute', right: 3, bottom: 3 },
  achievementTitle: { color: theme.textPrimary, fontWeight: '900', fontSize: 13, lineHeight: 17, minHeight: 35 },
  achievementStatus: { color: theme.textMuted, fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 0.3 },
  achievementDone: { color: theme.success },
  note: { backgroundColor: theme.primarySoft, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  noteText: { color: theme.primaryText, flex: 1, fontSize: 12, lineHeight: 18 },
}); }
