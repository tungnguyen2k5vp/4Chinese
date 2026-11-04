import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChineseAIEntry } from '@/components/ChineseAIEntry';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { radius, spacing } from '@/constants/design';
import { getSpeakingSummary, type SpeakingSummary } from '@/db/speaking';
import { useTheme } from '@/theme/ThemeProvider';

export default function SpeakingIndex() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = createStyles(theme);
  const [summary, setSummary] = useState<SpeakingSummary | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setError(false);
    void getSpeakingSummary(db).then((next) => { if (active) setSummary(next); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [db]));
  const tools = [
    { id: 'tones', title: 'Thanh điệu', detail: 'Nghe mẫu và phân biệt 4 thanh', icon: 'pulse-outline' as const, color: theme.tones[3] ?? theme.primary, href: '/speaking/tones' },
    { id: 'shadowing', title: 'Nói theo mẫu', detail: 'Nghe · ghi âm · tự đối chiếu', icon: 'radio-outline' as const, color: theme.skillColors.listening, href: '/speaking/shadowing' },
    { id: 'roleplay', title: 'Hội thoại AI', detail: 'Nhập vai theo tình huống HSK', icon: 'chatbubbles-outline' as const, color: theme.skillColors.speaking, href: '/speaking/ai' },
    { id: 'pairs', title: 'Cặp âm dễ nhầm', detail: 'Luyện nghe âm đầu, vần và thanh', icon: 'git-compare-outline' as const, color: theme.skillColors.grammar, href: '/speaking/pairs' },
    { id: 'recordings', title: 'Bản ghi của tôi', detail: 'Lưu cục bộ, tự xóa theo hạn', icon: 'mic-outline' as const, color: theme.success, href: '/speaking/recordings' },
  ];
  return <Screen title="Nghe & nói" subtitle="Phòng luyện giọng — chọn một bài tập, nghe mẫu rồi tự đối chiếu." hideHeader>
    <ChineseAIEntry label="Luyện nói với nhà cung cấp AI đã chọn" context={{ label: 'Hội thoại, phản xạ và tổng kết transcript', task: 'conversation', context: null }} />
    <View style={styles.hero}>
      <View style={styles.art}><LearningLandscape mood="voice" scene="speak" height={72} /><View style={styles.waveBadge}><Ionicons name="mic" size={20} color="#FFFFFF" /></View><Text style={styles.artWord}>声 · 音 · 语</Text></View>
      <View style={styles.heroCopy}><Text style={styles.eyebrow}>LUYỆN NGHE VÀ NÓI</Text><Text style={styles.heroTitle}>Luyện nói theo nhịp của bạn</Text><Text style={styles.heroNote}>Tập trung vào nghe và phát âm. App không tự chấm chất lượng giọng nói nếu chưa có bộ chấm được xác thực.</Text></View>
      <View style={styles.progressStrip}><View style={styles.summaryCell}><Text style={styles.summaryValue}>{summary ? `${summary.toneCorrect}/${summary.toneAttempts}` : error ? '—' : '…'}</Text><Text style={styles.summaryLabel}>thanh điệu đúng</Text></View><View style={styles.divider} /><View style={styles.summaryCell}><Text style={styles.summaryValue}>{summary?.shadowingAttempts ?? (error ? '—' : '…')}</Text><Text style={styles.summaryLabel}>lượt nói theo mẫu</Text></View></View>
    </View>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>CHỌN PHÒNG LUYỆN</Text><Text style={styles.sectionSub}>Âm thanh và bản ghi được tách riêng</Text></View>
    <View style={styles.toolGrid}>{tools.map((tool) => <MotionPressable key={tool.id} haptic accessibilityLabel={`${tool.title}. ${tool.detail}`} onPress={() => router.push(tool.href as Href)} style={[styles.tool, tool.id === 'roleplay' && styles.featureTool]}>
      <View style={[styles.toolIcon, { backgroundColor: `${tool.color}1C` }]}><Ionicons name={tool.icon} size={22} color={tool.color} /></View><View style={styles.toolCopy}><Text style={styles.toolTitle}>{tool.title}</Text><Text style={styles.toolDetail}>{tool.detail}</Text></View><Ionicons name="arrow-forward-circle-outline" size={22} color={tool.color} />
    </MotionPressable>)}</View>
    <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={18} color={theme.skillColors.speaking} /><Text style={styles.privacyText}>Thanh điệu và Shadowing chạy với nội dung tại máy. Hội thoại AI cần Internet và đăng nhập Cloud; bạn chủ động bắt đầu phiên, không gửi âm thanh thu sẵn.</Text></View>
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  hero: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  art: { position: 'relative' }, waveBadge: { position: 'absolute', left: spacing.md, top: spacing.md, width: 42, height: 42, borderRadius: 21, backgroundColor: theme.skillColors.speaking, alignItems: 'center', justifyContent: 'center' }, artWord: { position: 'absolute', right: spacing.md, bottom: spacing.md, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#FFFFFFE8', color: '#433542', fontSize: 11, fontWeight: '900' },
  heroCopy: { padding: spacing.md, gap: spacing.xs }, eyebrow: { color: theme.skillColors.speaking, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, heroTitle: { color: theme.textPrimary, fontSize: 21, lineHeight: 27, fontWeight: '900' }, heroNote: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 }, progressStrip: { padding: spacing.md, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: 'row', alignItems: 'center' }, summaryCell: { flex: 1, alignItems: 'center', gap: 3 }, summaryValue: { color: theme.textPrimary, fontSize: 19, fontWeight: '900' }, summaryLabel: { color: theme.textMuted, fontSize: 10, textAlign: 'center' }, divider: { width: 1, height: 34, backgroundColor: theme.border },
  sectionHead: { gap: 3, paddingTop: spacing.md }, sectionTitle: { color: theme.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, sectionSub: { color: theme.textMuted, fontSize: 12 }, toolGrid: { gap: spacing.sm }, tool: { minHeight: 78, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, featureTool: { backgroundColor: theme.surfaceSelected, borderColor: theme.primary }, toolIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, toolCopy: { flex: 1, gap: 3 }, toolTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '900' }, toolDetail: { color: theme.textMuted, fontSize: 12, lineHeight: 17 }, privacy: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.backgroundSecondary, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, privacyText: { color: theme.textSecondary, flex: 1, fontSize: 12, lineHeight: 19 },
}); }
