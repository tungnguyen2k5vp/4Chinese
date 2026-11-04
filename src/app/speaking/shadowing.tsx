import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ShadowingPlayer } from '@/components/ShadowingPlayer';
import { recordLessonActivityEvidence } from '@/db/learning-path';
import { listShadowingSentences, saveSpeakingPractice, type ShadowingSentence } from '@/db/speaking';
import { useStudySession } from '@/hooks/use-study-session';
import { useTheme } from '@/theme/ThemeProvider';

export default function ShadowingScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { lessonActivityId } = useLocalSearchParams<{ lessonActivityId?: string }>();
  useStudySession(db);
  const [sentences, setSentences] = useState<ShadowingSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(false);
    try { const rows = await listShadowingSentences(db); if (request === generation.current) setSentences(rows); }
    catch { if (request === generation.current) setError(true); }
    finally { if (request === generation.current) setLoading(false); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  return <Screen subtitle="Nghe hết câu mẫu, ghi âm rồi nghe lại để lưu một lượt luyện.">
    {loading ? <ActivityIndicator color={theme.primaryText} /> : error ? <PrimaryButton label="Tải lại câu mẫu" onPress={() => { void load(); }} /> : sentences.length ?
      <ShadowingPlayer sentences={sentences} onPracticed={async (targetId, id) => {
        await saveSpeakingPractice(db, { id, kind: 'shadowing', targetId });
        if (lessonActivityId) {
          void recordLessonActivityEvidence(db, lessonActivityId, 'REVIEW_ATTEMPT_RECORDED', targetId).catch(() => undefined);
        }
      }} /> :
      <Text>Chưa có câu mẫu trong kho câu dùng chung.</Text>}
  </Screen>;
}
