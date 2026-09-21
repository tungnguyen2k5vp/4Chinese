import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing, typography } from '@/constants/design';
import { defaultSettings, saveSettings } from '@/db/repository';
import { useAppStore } from '@/stores/app-store';
import type { HskBand } from '@/types/models';

const levels: { label: string; band: HskBand }[] = [{ label: 'Mới bắt đầu', band: 1 }, { label: 'HSK 1', band: 1 }, { label: 'HSK 2', band: 2 }, { label: 'HSK 3', band: 3 }, { label: 'HSK 4+', band: 4 }];

export default function Onboarding() {
  const db = useSQLiteContext();
  const setSettings = useAppStore((s) => s.setSettings);
  const [step, setStep] = useState(0); const [band, setBand] = useState<HskBand>(1); const [goal, setGoal] = useState(10); const [saving, setSaving] = useState(false);
  const finish = async () => { setSaving(true); const settings = { ...defaultSettings, onboardingCompleted: true, selectedHskBands: [band], dailyNewWordGoal: goal }; await saveSettings(db, settings); setSettings(settings); router.replace('/(tabs)'); };
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>字</Text></View><Text style={styles.brandName}>4Chinese</Text></View>
    <View style={styles.hero}><Text style={styles.kicker}>{step === 0 ? 'CHÀO MỪNG BẠN' : 'MỤC TIÊU MỖI NGÀY'}</Text><Text style={styles.title}>{step === 0 ? 'Bạn đang học tiếng Trung ở mức nào?' : 'Bạn muốn học bao nhiêu từ mới?'}</Text><Text style={styles.subtitle}>Học ít, ôn đúng lúc và nhớ lâu với lịch học cá nhân hoá.</Text></View>
    <View style={styles.options}>{step === 0 ? levels.map((level) => <Option key={level.label} label={level.label} selected={band === level.band} onPress={() => setBand(level.band)} />) : [5,10,15,20].map((value) => <Option key={value} label={`${value} từ / ngày`} selected={goal === value} onPress={() => setGoal(value)} />)}</View>
    <View style={styles.footer}><View style={styles.dots}><View style={[styles.dot, styles.dotActive]} /><View style={[styles.dot, step === 1 && styles.dotActive]} /></View><PrimaryButton label={step === 0 ? 'Tiếp tục' : 'Bắt đầu học'} loading={saving} onPress={() => step === 0 ? setStep(1) : void finish()} /></View>
  </View></SafeAreaView>;
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.border} /></Pressable>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.surface }, content: { flex: 1, padding: spacing.xl, gap: spacing.xl }, brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, mark: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, markText: { color: '#fff', fontSize: 25, fontWeight: '800' }, brandName: { color: colors.text, fontSize: 18, fontWeight: '900' }, hero: { gap: spacing.sm, paddingTop: spacing.xl }, kicker: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 }, subtitle: { color: colors.textMuted, fontSize: typography.body, lineHeight: 22 }, options: { gap: spacing.sm, flex: 1 }, option: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, optionText: { color: colors.text, fontSize: 16, fontWeight: '600' }, optionTextSelected: { color: colors.primary, fontWeight: '800' }, footer: { gap: spacing.lg }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border }, dotActive: { width: 22, backgroundColor: colors.primary } });
