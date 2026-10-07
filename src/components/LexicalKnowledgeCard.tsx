import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { PinyinText } from './PinyinText';
import { PrimaryButton } from './PrimaryButton';

import { themedCard } from '@/constants/design';
import { listPublishedLexicalKnowledge } from '@/db/lexical-knowledge';
import { numericPinyinToMarks } from '@/services/pinyin/pinyin';
import { useTheme } from '@/theme/ThemeProvider';

export function LexicalKnowledgeCard({ vocabularyId }: { vocabularyId: string }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [knowledge, setKnowledge] = useState<Awaited<ReturnType<typeof listPublishedLexicalKnowledge>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    // Do not display the previous word's knowledge while the next asynchronous load runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKnowledge(null); setFailed(false);
    void listPublishedLexicalKnowledge(db, vocabularyId).then(result => { if (live) setKnowledge(result); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [db, vocabularyId, retry]);
  if (failed) return <View style={[themedCard(theme), { gap: 10 }]}>
    <Text style={{ color: theme.textMuted }}>Chưa tải được giải thích cách dùng.</Text>
    <PrimaryButton label="Thử tải cách dùng" variant="ghost" onPress={() => setRetry(value => value + 1)} />
  </View>;
  if (!knowledge?.senses.length) return null;
  return <View style={[themedCard(theme), { gap: 18 }]}>
    <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '800', color: theme.textPrimary }}>Nghĩa và cụm từ thường dùng</Text>
    {knowledge.senses.map(sense => <View key={sense.sense_id} style={{ gap: 8 }}>
      <PinyinText value={numericPinyinToMarks(sense.pinyin_numeric)} style={{ fontSize: 18 }} />
      <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '700' }}>{sense.definition_vi}</Text>
      <Text style={{ color: theme.textMuted }}>{sense.part_of_speech} · {sense.usage_note}</Text>
      {knowledge.collocations.filter(phrase => phrase.sense_id === sense.sense_id).map(phrase => <View key={phrase.expression} style={{ gap: 4 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 18 }}>{phrase.expression}</Text>
        <Text style={{ color: theme.textMuted }}>{phrase.pinyin} · {phrase.translation_vi}</Text>
      </View>)}
    </View>)}
  </View>;
}
