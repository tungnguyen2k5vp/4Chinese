import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { LearningGuide } from '@/components/visual/LearningGuide';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { radius, spacing, typography } from '@/constants/design';
import { defaultSettings, saveSettings } from '@/db/repository';
import { useAppStore } from '@/stores/app-store';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { HskBand } from '@/types/models';

const levels: { id: string; label: string; band: HskBand }[] = [
  { id: 'beginner', label: 'Mới bắt đầu', band: 1 },
  { id: 'hsk1', label: 'HSK 1', band: 1 },
  { id: 'hsk2', label: 'HSK 2', band: 2 },
  { id: 'hsk3', label: 'HSK 3', band: 3 },
  { id: 'hsk4', label: 'HSK 4', band: 4 },
  { id: 'hsk5', label: 'HSK 5', band: 5 },
  { id: 'hsk6', label: 'HSK 6', band: 6 },
  { id: 'hsk79', label: 'HSK 7–9', band: '7-9' },
];

export default function Onboarding() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const setSettings = useAppStore((s) => s.setSettings);
  const [step, setStep] = useState(0); const [levelId, setLevelId] = useState('beginner'); const [goal, setGoal] = useState(10); const [saving, setSaving] = useState(false);
  const selectedLevel = levels.find((level) => level.id === levelId) ?? levels[0]!;
  const finish = async () => { setSaving(true); const settings = { ...defaultSettings, onboardingCompleted: true, selectedHskBands: [selectedLevel.band], dailyNewWordGoal: goal }; await saveSettings(db, settings); setSettings(settings); router.replace('/(tabs)'); };
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>字</Text></View><Text style={styles.brandName}>4Chinese</Text><Text style={styles.brandTag}>HỌC THEO NHỊP RIÊNG</Text></View>
    <View style={styles.heroArt}><LearningLandscape mood="journey" scene="welcome" height={142} /><View style={styles.artGuide}><LearningGuide mood="welcome" size={62} /></View><View style={styles.artCaption}><Text style={styles.artCaptionChinese}>你好</Text><Text style={styles.artCaptionText}>BẮT ĐẦU HÀNH TRÌNH</Text></View></View>
    <View style={styles.hero}><Text style={styles.kicker}>{step === 0 ? 'BƯỚC 1 · MỨC KHỞI ĐIỂM' : 'BƯỚC 2 · NHỊP MỖI NGÀY'}</Text><Text style={styles.title}>{step === 0 ? 'Bạn đang học tiếng Trung ở mức nào?' : 'Bạn muốn học bao nhiêu từ mới?'}</Text><Text style={styles.subtitle}>{step === 0 ? 'Chọn mức gần với bạn nhất. Bạn có thể thay đổi sau trong phần cài đặt.' : 'Một mục tiêu vừa sức sẽ giúp bạn duy trì đều đặn và ôn đúng lúc.'}</Text></View>
    <Text style={styles.choiceLabel}>{step === 0 ? 'CHỌN CẤP ĐỘ' : 'CHỌN MỤC TIÊU TỪ MỚI'}</Text>
    <View style={styles.options}>{step === 0 ? levels.map((level) => <Option key={level.id} label={level.label} mark={level.band === '7-9' ? '7+' : level.band === 1 && level.id === 'beginner' ? '始' : String(level.band)} selected={levelId === level.id} onPress={() => setLevelId(level.id)} />) : [5,10,15,20].map((value) => <Option key={value} label={`${value} từ / ngày`} mark={value === 5 ? '轻' : value === 20 ? '快' : '日'} selected={goal === value} onPress={() => setGoal(value)} />)}</View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.dots}><View style={[styles.dot, styles.dotActive]} /><View style={[styles.dot, step === 1 && styles.dotActive]} /></View>
      <PrimaryButton label={step === 0 ? 'Tiếp tục' : 'Bắt đầu học'} loading={saving} onPress={() => step === 0 ? setStep(1) : void finish()} />
    </View>
  </SafeAreaView>;
}

function Option({ label, mark, selected, onPress }: { label: string; mark: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><View style={[styles.optionMark, selected && styles.optionMarkSelected]}><Text style={[styles.optionMarkText, selected && styles.optionMarkTextSelected]}>{mark}</Text></View><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? theme.primaryText : theme.border} /></Pressable>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background }, scroll: { flex: 1, zIndex: 0 }, content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, mark: { width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }, markText: { color: theme.onPrimary, fontSize: 23, fontWeight: '900' }, brandName: { color: theme.textPrimary, fontSize: 17, fontWeight: '900' }, brandTag: { marginLeft: 'auto', color: theme.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  heroArt: { position: 'relative', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: theme.backgroundSecondary }, artGuide: { position: 'absolute', left: spacing.md, top: spacing.md }, artCaption: { position: 'absolute', bottom: spacing.md, right: spacing.md, alignItems: 'flex-end', gap: 2 }, artCaptionChinese: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', textShadowColor: '#17203388', textShadowRadius: 5 }, artCaptionText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.6, textShadowColor: '#17203388', textShadowRadius: 5 },
  hero: { gap: spacing.xs }, kicker: { color: theme.primaryText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: theme.textPrimary, fontSize: 26, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5 }, subtitle: { color: theme.textMuted, fontSize: typography.body, lineHeight: 22 }, choiceLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1, paddingTop: spacing.xs },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, option: { width: '47%', flexGrow: 1, minHeight: 82, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: theme.surface }, optionSelected: { borderColor: theme.primary, borderWidth: 1.5, backgroundColor: theme.surfaceSelected }, optionMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }, optionMarkSelected: { backgroundColor: theme.primary }, optionMarkText: { color: theme.textSecondary, fontSize: 14, fontWeight: '900' }, optionMarkTextSelected: { color: theme.onPrimary }, optionText: { color: theme.textPrimary, flex: 1, flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' }, optionTextSelected: { color: theme.primaryText, fontWeight: '900' },
  footer: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: theme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, zIndex: 1, elevation: 2 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.border }, dotActive: { width: 22, backgroundColor: theme.primary },
}); }
