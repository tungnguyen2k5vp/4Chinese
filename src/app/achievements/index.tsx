import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { WeeklyStudyChart } from '@/components/WeeklyStudyChart';
import { XpJourneyCard } from '@/components/XpJourneyCard';
import { Disclosure } from '@/components/chinese/Disclosure';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { radius, spacing, themedCard } from '@/constants/design';
import { getGamificationSummary, setWeeklyStudyGoal, xpRewards, type GamificationSummary } from '@/db/gamification';
import { getSettings } from '@/db/repository';
import { playHaptic } from '@/services/feedback/feedback-service';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

function achievementIcon(id: string): keyof typeof Ionicons.glyphMap {
  if (id.includes('streak')) return 'flame';
  if (id.includes('listening')) return 'headset';
  if (id.includes('hanzi')) return 'brush';
  if (id.includes('vocabulary')) return 'school';
  if (id.includes('stories')) return 'book';
  return 'ribbon';
}

function achievementSeal(id: string) {
  if (id.includes('streak')) return '火';
  if (id.includes('listening')) return '听';
  if (id.includes('hanzi')) return '写';
  if (id.includes('vocabulary')) return '学';
  if (id.includes('stories')) return '读';
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const generation = useRef(0);
  const saveBusy = useRef(false);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setNotice('');
    setLoadFailed(false);
    try {
      const settings = await getSettings(db);
      const result = await getGamificationSummary(db, settings.dailyStudyMinutes);
      if (request !== generation.current) return;
      setSummary(result);
      setGoal(String(result.weeklyMinutes));
    } catch {
      if (request === generation.current) { setLoadFailed(true); setNotice('Chưa tải được tiến độ. Bạn có thể thử lại.'); }
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
        setEditingGoal(false);
        void playHaptic('success', hapticEnabled);
      }
    } catch { if (request === generation.current) setNotice('Chưa lưu được. Mục tiêu cũ vẫn giữ nguyên.'); }
    finally { saveBusy.current = false; setSaving(false); }
  };

  const unlocked = summary?.achievements.filter((item) => Boolean(item.unlockedAt)).length ?? 0;
  const weeklyProgress = summary && summary.weeklyMinutes > 0 ? Math.min(1, summary.weeklySeconds / (summary.weeklyMinutes * 60)) : 0;

  return <Screen title="Thành tích & mục tiêu" hideHeader compact avoidKeyboard safeAreaEdges={['bottom']}>
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {!loading && (loadFailed || !summary) ? <PrimaryButton label="Thử lại" onPress={() => void load()} /> : null}
    {summary ? <>
      <XpJourneyCard totalXp={summary.totalXp} todayXp={summary.todayXp} expanded />
      <View style={styles.titleRow}><Ionicons name="flame" size={24} color={theme.warning} /><View style={{ flex: 1 }}><Text style={styles.heading}>{summary.streak} ngày giữ nhịp</Text><Text style={styles.copy}>Kỷ lục: {summary.bestStreak} ngày</Text></View><View style={styles.countPill}><Text style={styles.countText}>{unlocked} huy hiệu</Text></View></View>
      <View style={[themedCard(theme), styles.block]}>
        <Text style={styles.heading}>Học tiếp · tích XP</Text>
        {([
          { label: 'Ôn từ đến hạn', detail: '+5 XP / từ / ngày', icon: 'repeat-outline', route: '/review', activity: 'review' },
          { label: 'Học từ mới', detail: '+10 XP / từ mới', icon: 'school-outline', route: '/learn/setup', activity: 'learn' },
          { label: 'Đọc hiểu truyện', detail: '+15 XP / truyện lần đầu', icon: 'book-outline', route: '/stories', activity: 'story' },
        ] as const).map(action => <MotionPressable key={action.activity} haptic accessibilityLabel={`${action.label}. ${action.detail}`} onPress={() => router.push(action.route as Href)} style={styles.action}>
          <View style={styles.actionIcon}><Ionicons name={action.icon} size={22} color={theme.primaryText} /></View><View style={{ flex: 1, gap: 3 }}><Text style={styles.actionTitle}>{action.label}</Text><Text style={styles.copy}>+{xpRewards[action.activity]} XP{action.activity === 'review' ? ' / từ / ngày' : action.activity === 'learn' ? ' / từ mới' : ' / truyện lần đầu'}</Text></View><Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </MotionPressable>)}
        <Disclosure title="XP được tính ra sao?"><Text style={styles.copy}>Chỉ nhận khi hoàn thành hoạt động. Học từ mới và đọc hiểu đúng truyện nhận một lần cho mỗi nội dung; ôn từ nhận tối đa một lần mỗi từ mỗi ngày. Ngữ pháp +{xpRewards.grammar}, thanh điệu +{xpRewards.tone}, shadowing +{xpRewards.shadowing} XP cho mỗi nội dung mỗi ngày. Mở màn hình hoặc sửa mục tiêu không cộng XP.</Text></Disclosure>
      </View>

      <View style={[themedCard(theme), styles.block]}>
        <View style={styles.headingRow}><View style={{ flex: 1 }}><Text style={styles.heading}>Mục tiêu tuần</Text><Text style={styles.copy}>{Math.floor(summary.weeklySeconds / 60)} / {summary.weeklyMinutes} phút</Text></View><Text style={styles.percent}>{Math.round(weeklyProgress * 100)}%</Text><MotionPressable accessibilityLabel="Đổi mục tiêu tuần" onPress={() => setEditingGoal(value => !value)} style={styles.edit}><Ionicons name={editingGoal ? 'close' : 'create-outline'} size={22} color={theme.primaryText} /></MotionPressable></View>
        <AnimatedProgressBar progress={weeklyProgress} color={theme.primary} trackColor={theme.border} height={10} accessibilityLabel="Tiến độ mục tiêu học tuần" />
        <WeeklyStudyChart days={summary.weeklyDays} />
        <Text style={styles.copy}>{weeklyProgress >= 1 ? 'Đã hoàn thành tuần này ✓' : `Còn ${Math.max(0, summary.weeklyMinutes - Math.floor(summary.weeklySeconds / 60))} phút để hoàn thành tuần`}</Text>
        {editingGoal ? <><View style={styles.goalRow}>{[70, 140, 210].map(minutes => <MotionPressable key={minutes} accessibilityLabel={`Chọn ${minutes} phút mỗi tuần`} onPress={() => setGoal(String(minutes))} style={[styles.preset, goal === String(minutes) && { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}><Text style={styles.actionTitle}>{minutes} phút</Text></MotionPressable>)}</View>
        <View style={styles.goalRow}><TextInput accessibilityLabel="Mục tiêu học mỗi tuần, phút" value={goal} onChangeText={setGoal} keyboardType="number-pad" maxLength={4} editable={!saving} style={styles.input} /><Text style={styles.goalUnit}>phút/tuần</Text></View>
        <PrimaryButton label="Lưu mục tiêu" loading={saving} onPress={() => void save()} /></> : null}
      </View>

      <View style={styles.titleRow}><View style={{ flex: 1 }}><Text style={styles.heading}>Ấn chương hành trình</Text><Text style={styles.copy}>Mỗi dấu ấn đến từ hoạt động học thật.</Text></View><View style={styles.countPill}><Text style={styles.countText}>{unlocked}/{summary.achievements.length}</Text></View></View>
      <View style={styles.achievementGrid}>
        {summary.achievements.map((item) => {
          const progress = item.threshold > 0 ? Math.min(1, item.progress / item.threshold) : 0;
          const isUnlocked = Boolean(item.unlockedAt);
          return <View key={item.id} accessible accessibilityLabel={`${item.title}. ${isUnlocked ? 'Đã đạt' : `${Math.min(item.progress, item.threshold)} trên ${item.threshold}`}`} style={[themedCard(theme), styles.achievement, isUnlocked && styles.achievementUnlocked]}>
            <View style={[styles.seal, isUnlocked && styles.sealUnlocked, !isUnlocked && styles.sealLocked]}><Text style={[styles.sealMark, isUnlocked && styles.sealMarkUnlocked]}>{achievementSeal(item.id)}</Text><Ionicons name={achievementIcon(item.id)} size={11} color={isUnlocked ? theme.success : theme.textMuted} style={styles.sealIcon} /></View>
            <Text style={styles.achievementTitle}>{item.title}</Text>
            <Text style={[styles.achievementStatus, isUnlocked && styles.achievementDone]}>{isUnlocked ? 'ĐÃ MỞ · LƯU VĨNH VIỄN' : `${Math.min(item.progress, item.threshold)} / ${item.threshold}`}</Text>
            {!isUnlocked ? <AnimatedProgressBar progress={progress} color={theme.primary} trackColor={theme.border} height={5} accessibilityLabel={`${item.title}: ${Math.round(progress * 100)} phần trăm`} /> : null}
          </View>;
        })}
      </View>
      <View style={styles.note}><Ionicons name="information-circle-outline" size={18} color={theme.primaryText} /><Text style={styles.noteText}>XP và thành tích chỉ tính từ hoạt động hoàn thành; không cộng lại số liệu lịch sử giả lập.</Text></View>
    </> : null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  notice: { color: theme.primaryText, lineHeight: 22 },
  action: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 8 },
  actionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '800' },
  edit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  preset: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: theme.border, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
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
