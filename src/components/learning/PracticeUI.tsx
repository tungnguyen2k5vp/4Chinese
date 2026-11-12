import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PracticeArt } from './PracticeArt';

import { AudioButton } from '@/components/AudioButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import type { SceneId } from '@/services/learning/interactive-content';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export function PracticeFeedback({ correct, explanation, chinese, turnKey }: { correct: boolean; explanation: string; chinese?: string; turnKey: string }) {
  const t = useTheme(), s = usePracticeStyles();
  return <StudyTransition turnKey={turnKey} animateOnMount effect={correct ? 'success' : 'error'}>
    <View accessibilityLiveRegion="polite" style={[s.panel, { backgroundColor: correct ? t.successSoft : t.warningSoft }]}>
      <View style={s.row}><Ionicons name={correct ? 'checkmark-circle' : 'bulb-outline'} size={24} color={correct ? t.success : t.warning} /><Text style={s.heading}>{correct ? 'Chính xác!' : 'Cùng xem lại nhé'}</Text></View>
      {chinese ? <View style={s.row}><Text selectable style={[s.chinese, { flex: 1 }]}>{chinese}</Text><AudioButton text={chinese} /></View> : null}
      <Text style={s.copy}>{explanation}</Text>
    </View>
  </StudyTransition>;
}

export function PracticeResult({ scene = 'cafe', correct, total, onRestart, onRetry }: { scene?: SceneId; correct: number; total: number; onRestart: () => void; onRetry?: () => void }) {
  const t = useTheme(), s = usePracticeStyles();
  return <View style={{ gap: 18 }}>
    <View style={{ height: 200, borderRadius: 24, overflow: 'hidden' }}><PracticeArt scene={scene} celebration reaction="complete" /></View>
    <Text accessibilityRole="header" style={s.title}>Thêm một bước tiến!</Text>
    <Text style={s.copy}>Bạn trả lời đúng {correct}/{total} câu ngay lần đầu. Tiếp tục luyện để nhớ chắc hơn nhé.</Text>
    {onRetry ? <PrimaryButton label="Luyện lại câu cần nhớ" onPress={onRetry} /> : null}
    <PrimaryButton label="Chơi lại một lượt" variant="secondary" onPress={onRestart} />
    <PrimaryButton label="Về Luyện tập" variant="ghost" onPress={() => router.replace('/practice')} />
    <Text style={[s.meta, { color: t.textMuted }]}>Lượt luyện tự do này không thay đổi lịch ôn hay tiến độ học.</Text>
  </View>;
}

export function PracticeChoice({ label, onPress, selected = false, disabled = false, correct = false, prefix }: { label: string; onPress: () => void; selected?: boolean; disabled?: boolean; correct?: boolean; prefix?: string }) {
  const t = useTheme(), s = usePracticeStyles();
  return <MotionPressable accessibilityLabel={label} accessibilityState={{ selected }} disabled={disabled} onPress={onPress}
    style={[s.choice, { backgroundColor: correct ? t.successSoft : selected ? t.primarySoft : t.surface, borderColor: correct ? t.success : selected ? t.primary : t.border }]}>
    {prefix ? <Text style={[s.meta, { minWidth: 20 }]}>{prefix}</Text> : null}<Text style={[s.choiceText, { flex: 1 }]}>{label}</Text>
    {correct ? <Ionicons name="checkmark-circle" size={22} color={t.success} /> : selected ? <Ionicons name="radio-button-on" size={20} color={t.primaryText} /> : null}
  </MotionPressable>;
}

export function PracticeRoundHeader({ title, current, total, finished = false, onExit }: { title: string; current: number; total: number; finished?: boolean; onExit: () => void }) {
  const s = usePracticeStyles(), t = useTheme();
  const completed = finished ? total : current - 1;
  return <View style={{ gap: 10 }}>
    <View style={[s.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}><View style={{ flex: 1, minWidth: 120 }}><Text style={s.heading}>{title}</Text><Text style={s.meta}>{finished ? 'Hoàn thành' : `Lượt ${current}/${total}`}</Text></View><PrimaryButton label="Đổi hoạt động" variant="ghost" onPress={onExit} /></View>
    <AnimatedProgressBar progress={completed / total} color={t.primary} trackColor={t.primarySoft} accessibilityLabel={`Đã hoàn thành ${completed} trên ${total} lượt`} />
  </View>;
}

export function PracticeMenuItem({ title, subtitle, scene, onPress }: { title: string; subtitle: string; scene: SceneId; onPress: () => void }) {
  const s = usePracticeStyles(), t = useTheme();
  return <MotionPressable accessibilityLabel={`Bắt đầu ${title}`} onPress={onPress} style={[s.panel, { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 }]}>
    <View style={{ width: 76, height: 90, borderRadius: 15, overflow: 'hidden' }}><PracticeArt scene={scene} /></View>
    <View style={{ flex: 1, gap: 5 }}><Text style={s.heading}>{title}</Text><Text style={s.meta}>{subtitle}</Text></View><Ionicons name="arrow-forward" size={22} color={t.primaryText} />
  </MotionPressable>;
}

export const usePracticeStyles = () => useThemeStyles((t: ThemeTokens) => StyleSheet.create({
  title: { fontSize: 25, lineHeight: 33, fontWeight: '800', color: t.textPrimary },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '800', color: t.textPrimary },
  copy: { fontSize: 15, lineHeight: 23, color: t.textSecondary },
  meta: { fontSize: 12, lineHeight: 19, color: t.textMuted },
  chinese: { fontSize: 27, lineHeight: 40, fontWeight: '700', color: t.textPrimary },
  pinyin: { fontSize: 16, lineHeight: 24, color: t.primaryText },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  panel: { padding: 18, gap: 12, borderRadius: 22, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 17, borderWidth: 1 },
  choiceText: { fontSize: 18, lineHeight: 28, color: t.textPrimary, fontWeight: '600' },
  chip: { minHeight: 46, paddingHorizontal: 15, paddingVertical: 10, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
}));
