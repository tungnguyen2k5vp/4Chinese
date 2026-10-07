import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { radius, spacing, themedCard } from '@/constants/design';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

const states = [
  ['home', 'Trang chủ hoạt động'],
  ['stats', 'Tiến độ học'],
  ['achievements', 'Thành tích mở/khóa'],
  ['hsk', 'Cấp HSK đang học'],
  ['path', 'Lộ trình'],
  ['review', 'Thẻ ôn đang mở'],
  ['reader', 'Đang đọc'],
  ['speaking', 'Thiết lập · hội thoại · kết quả'],
] as const;
type FixtureState = typeof states[number][0];

/** Deterministic UI-only sample data. This screen never opens or mutates the learner database. */
export default function VisualQaFixtures() {
  return __DEV__ ? <FixturePreview /> : <Redirect href="/" />;
}

function FixturePreview() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { state = 'home' } = useLocalSearchParams<{ state?: FixtureState }>();
  const selected = states.some(([id]) => id === state) ? state : 'home';
  return <Screen title="QA · Trạng thái mẫu" subtitle="Fixture tĩnh, chỉ hiển thị trong development — không đọc/ghi DB." hideHeader>
    <View accessibilityRole="alert" style={styles.warning}><Text style={styles.warningText}>DEV ONLY · DỮ LIỆU MẪU · KHÔNG GHI VÀO HỒ SƠ HỌC TẬP</Text></View>
    <View style={styles.tabs}>{states.map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: selected === id }} onPress={() => router.setParams({ state: id })} style={[styles.tab, selected === id && styles.tabSelected]}><Text style={[styles.tabText, selected === id && styles.tabTextSelected]}>{label}</Text></Pressable>)}</View>
    <View style={styles.preview}>{renderFixture(selected, theme, styles)}</View>
  </Screen>;
}

function renderFixture(state: FixtureState, theme: ThemeTokens, styles: ReturnType<typeof createStyles>) {
  if (state === 'home') return <>
    <LearningLandscape mood="journey" height={116} />
    <Text style={styles.eyebrow}>CHÀO NGÀY MỚI</Text><Text style={styles.heading}>Tiếp tục hành trình HSK 2</Text>
    <View style={styles.metricRow}><Metric label="Ôn đến hạn" value="8 từ" theme={theme} styles={styles} /><Metric label="Mục tiêu" value="12 / 20 phút" theme={theme} styles={styles} /></View>
    <AnimatedProgressBar progress={0.6} color={theme.primary} trackColor={theme.border} accessibilityLabel="Mục tiêu mẫu: 12 trên 20 phút" />
  </>;
  if (state === 'stats') return <>
    <LearningLandscape mood="progress" height={100} /><Text style={styles.eyebrow}>NHỊP HỌC 7 NGÀY</Text>
    <View style={styles.metricRow}><Metric label="Từ đã học" value="128" theme={theme} styles={styles} /><Metric label="Độ chính xác ôn" value="84%" theme={theme} styles={styles} /><Metric label="Chuỗi ngày" value="6" theme={theme} styles={styles} /></View>
    <AnimatedProgressBar progress={0.72} color={theme.success} trackColor={theme.border} accessibilityLabel="Mục tiêu mẫu tuần: 72 phần trăm" />
  </>;
  if (state === 'achievements') return <>
    <LearningLandscape mood="progress" height={92} /><Text style={styles.heading}>Dấu ấn hành trình</Text>
    <View style={styles.metricRow}><Metric label="Đã mở" value="3 / 8" theme={theme} styles={styles} /><Metric label="Tuần này" value="95 phút" theme={theme} styles={styles} /></View>
    <View style={styles.badgeRow}><Badge label="Bắt đầu" open theme={theme} styles={styles} /><Badge label="7 ngày học" theme={theme} styles={styles} /><Badge label="50 từ" open theme={theme} styles={styles} /><Badge label="Nghe 20 câu" theme={theme} styles={styles} /></View>
  </>;
  if (state === 'hsk') return <>
    <Text style={styles.eyebrow}>CẤP ĐANG HỌC</Text><Text style={styles.level}>HSK 2</Text><Text style={styles.heading}>Từ vựng · 128 / 300</Text>
    <AnimatedProgressBar progress={128 / 300} color={theme.hskByLevel['2']} trackColor={theme.border} accessibilityLabel="HSK 2 mẫu: 128 trên 300 từ" />
    <View style={styles.metricRow}><Metric label="Đã nắm" value="72" theme={theme} styles={styles} /><Metric label="Đang học" value="56" theme={theme} styles={styles} /></View>
  </>;
  if (state === 'path') return <>
    <LearningLandscape mood="journey" height={92} /><Text style={styles.eyebrow}>LỘ TRÌNH HSK 2</Text><Text style={styles.heading}>Chặng 4 · Cuộc sống thường ngày</Text>
    {(['Đã hoàn thành', 'Bài đang học', 'Chưa mở'] as const).map((label, index) => <View key={label} style={[styles.pathNode, index === 1 && styles.pathCurrent]}><Text style={styles.pathNumber}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.nodeTitle}>{['Chào hỏi', 'Thời gian & lịch hẹn', 'Ở nhà'][index]}</Text><Text style={styles.nodeMeta}>{label}</Text></View><Text style={styles.status}>{['✓', '●', '🔒'][index]}</Text></View>)}
  </>;
  if (state === 'review') return <>
    <Text style={styles.eyebrow}>ÔN TẬP · LƯỢT 2/3 · HÁN TỰ → NGHĨA</Text><Text style={styles.hanzi}>谢谢</Text><Text style={styles.pinyin}>xièxie</Text><Text style={styles.copy}>Chọn nghĩa gần nhất với từ này.</Text>
    {['cảm ơn', 'điện thoại', 'phòng'].map((choice, index) => <View key={choice} style={[styles.answer, index === 0 && styles.answerCorrect]}><Text style={styles.answerText}>{choice}</Text></View>)}
    <Text style={styles.nodeMeta}>Thời lượng, đáp án và tiến độ ở đây đều là fixture minh họa.</Text>
  </>;
  if (state === 'reader') return <>
    <LearningLandscape mood="reading" height={96} /><Text style={styles.eyebrow}>ĐỌC · TRUYỆN NGẮN</Text><Text style={styles.heading}>Một buổi sáng ở Bắc Kinh</Text>
    <View style={styles.readingPage}><Text style={styles.hanziLine}>今天早上，天气很好。</Text><Text style={styles.pinyin}>Jīntiān zǎoshang, tiānqì hěn hǎo.</Text><Text style={styles.copy}>Sáng nay, thời tiết rất đẹp.</Text></View>
    <Text style={styles.nodeMeta}>Câu 2 / 8 · chạm vào từ để tra nghĩa</Text>
  </>;
  return <>
    <LearningLandscape mood="voice" height={90} /><Text style={styles.eyebrow}>PHÒNG LUYỆN GIỌNG</Text><Text style={styles.heading}>Thiết lập hội thoại · quán cà phê</Text>
    <View style={styles.metricRow}><Metric label="Đang nói" value="Tôi muốn gọi…" theme={theme} styles={styles} /><Metric label="Kết quả" value="3 lượt · 2 cần ôn" theme={theme} styles={styles} /></View>
    <View style={styles.answer}><Text style={styles.copy}>Bản nháp chat và kết quả là trạng thái mẫu; mic/network không hoạt động trong fixture.</Text></View>
  </>;
}

function Metric({ label, value, theme, styles }: { label: string; value: string; theme: ThemeTokens; styles: ReturnType<typeof createStyles> }) {
  return <View style={[themedCard(theme), styles.metric]}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Badge({ label, open = false, theme, styles }: { label: string; open?: boolean; theme: ThemeTokens; styles: ReturnType<typeof createStyles> }) {
  return <View style={[styles.badge, open && { borderColor: theme.success, backgroundColor: theme.successSoft }]}><Text style={{ color: open ? theme.success : theme.textMuted, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>{open ? '✦ ' : '○ '}{label}</Text></View>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  warning: { padding: 12, borderRadius: radius.md, backgroundColor: theme.warningSoft, borderWidth: 1, borderColor: theme.warning }, warningText: { color: theme.textPrimary, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, tab: { minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, backgroundColor: theme.surface }, tabSelected: { backgroundColor: theme.primary, borderColor: theme.primary }, tabText: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' }, tabTextSelected: { color: theme.onPrimary },
  preview: { ...themedCard(theme), gap: spacing.md }, eyebrow: { color: theme.primaryText, fontSize: 11, letterSpacing: 0.7, fontWeight: '900' }, heading: { color: theme.textPrimary, fontSize: 22, fontWeight: '900' }, level: { color: theme.primaryText, fontSize: 42, fontWeight: '900' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, metric: { flex: 1, minWidth: 105, padding: spacing.md, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: theme.border }, metricLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700' }, metricValue: { color: theme.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, badge: { minWidth: '46%', flex: 1, minHeight: 76, justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: radius.md, padding: spacing.sm, backgroundColor: theme.backgroundSecondary },
  pathNode: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, padding: spacing.md }, pathCurrent: { borderColor: theme.primary, backgroundColor: theme.primarySoft }, pathNumber: { color: theme.primaryText, fontSize: 18, fontWeight: '900' }, nodeTitle: { color: theme.textPrimary, fontWeight: '800' }, nodeMeta: { color: theme.textMuted, fontSize: 12 }, status: { color: theme.primaryText, fontWeight: '900' },
  hanzi: { color: theme.textPrimary, fontSize: 48, textAlign: 'center', fontWeight: '900' }, pinyin: { color: theme.primaryText, fontSize: 18, textAlign: 'center' }, copy: { color: theme.textSecondary, lineHeight: 22 }, answer: { minHeight: 54, justifyContent: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }, answerCorrect: { backgroundColor: theme.successSoft, borderColor: theme.success }, answerText: { color: theme.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  readingPage: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, backgroundColor: theme.readingBackground, borderWidth: 1, borderColor: theme.border }, hanziLine: { color: theme.textPrimary, fontSize: 24, lineHeight: 38 },
}); }
