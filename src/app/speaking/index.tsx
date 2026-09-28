import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { getSpeakingSummary, type SpeakingSummary } from '@/db/speaking';

export default function SpeakingIndex() {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<SpeakingSummary | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setError(false);
    void getSpeakingSummary(db).then((next) => { if (active) setSummary(next); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [db]));
  return <Screen title="Nghe & nói" subtitle="Luyện tại máy, không cần tài khoản AI.">
    <View style={[card, { gap: spacing.sm }]}>
      <Text style={{ color: colors.text }}>{summary ? `${summary.toneCorrect}/${summary.toneAttempts} bài thanh điệu đúng · ${summary.shadowingAttempts} lượt Shadowing` : error ? 'Chưa đọc được tiến độ.' : 'Đang đọc tiến độ…'}</Text>
      <PrimaryButton label="Luyện thanh điệu" onPress={() => router.push('/speaking/tones' as Href)} />
      <PrimaryButton label="Shadowing · nghe và đọc theo" variant="secondary" onPress={() => router.push('/speaking/shadowing' as Href)} />
    </View>
    <Text style={{ color: colors.textMuted }}>Thanh điệu: bài chọn có đáp án từ kho từ. Shadowing: tự đối chiếu bản ghi, không chấm điểm chất lượng giọng nói.</Text>
  </Screen>;
}
