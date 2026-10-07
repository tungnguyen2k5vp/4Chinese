import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { LocalVoiceRecorder } from '@/components/LocalVoiceRecorder';
import { PinyinText } from '@/components/PinyinText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { themedCard } from '@/constants/design';
import { pronunciationPairs } from '@/data/pronunciation-pairs';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function PronunciationPairs() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const pair = pronunciationPairs[index]!;
  const first = pair.title.split('/')[0]?.trim().toUpperCase() ?? 'A';
  const second = pair.title.split('/')[1]?.trim().toUpperCase() ?? 'B';
  return <Screen title="Phân biệt âm dễ nhầm" subtitle="Nghe mẫu TTS, thu âm và tự đối chiếu. Không phải điểm phát âm AI.">
    <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.primaryText, fontWeight: '900' }}>CẶP ÂM · {index + 1}/10</Text><Text style={{ color: theme.textMuted }}>TỰ ĐỐI CHIẾU</Text></View><AnimatedProgressBar progress={(index + 1) / pronunciationPairs.length} color={theme.skillColors.speaking} trackColor={theme.border} accessibilityLabel="Tiến độ 10 cặp âm" /></View>
    <View style={[themedCard(theme), { gap: 16 }]}>
      <View style={styles.compareHeader}><Text accessibilityRole="header" style={styles.compareTitle}>{first}</Text><Text style={styles.vs}>VS</Text><Text style={styles.compareTitle}>{second}</Text></View>
      <View style={styles.compareRow}>{([{ h: pair.a, p: pair.pa, v: pair.va }, { h: pair.b, p: pair.pb, v: pair.vb }]).map((item, itemIndex) => <View key={item.h} style={[styles.soundCard, { backgroundColor: itemIndex === 0 ? theme.primarySoft : theme.infoSoft }]}>
        <Text accessibilityRole="header" style={styles.hanzi}>{item.h}</Text><PinyinText value={item.p} /><Text style={styles.meaning}>{item.v}</Text>
        {recording ? <Text style={styles.meta}>Đang ghi âm…</Text> : <AudioButton text={item.h} />}
      </View>)}</View>
      <Text style={{ color: theme.textPrimary, lineHeight: 24 }}>{pair.tip}</Text>
      <LocalVoiceRecorder key={pair.id} onRecordingChange={setRecording} maxDurationSeconds={15} />
    </View>
    <PrimaryButton label="Bài trước" variant="secondary" disabled={index === 0 || recording} onPress={() => setIndex(value => value - 1)} />
    <PrimaryButton label="Bài tiếp" disabled={index === pronunciationPairs.length - 1 || recording} onPress={() => setIndex(value => value + 1)} />
  </Screen>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  compareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  compareTitle: { color: theme.primaryText, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  vs: { color: theme.textMuted, fontSize: 11, fontWeight: '900' },
  compareRow: { flexDirection: 'row', gap: 10 },
  soundCard: { flex: 1, minWidth: 0, minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 18 },
  hanzi: { color: theme.textPrimary, fontSize: 38, fontWeight: '900' },
  meaning: { color: theme.textMuted, textAlign: 'center' },
  meta: { color: theme.textMuted, fontSize: 12 },
}); }
