import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { EmptyState } from '@/components/EmptyState';
import { HanziHandwritingPad } from '@/components/HanziHandwritingPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { spacing, themedCard } from '@/constants/design';
import { practiceMistake, type PracticeSkill } from '@/db/mistakes';
import { getVocabulary, listVocabulary } from '@/db/repository';
import { useStudySession } from '@/hooks/use-study-session';
import { stopChineseSpeech } from '@/services/audio/chinese-speech';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { Vocabulary } from '@/types/models';

type Target = { vocabulary_id: string; skill_type: PracticeSkill; exercise_type: string; correct_streak: number };

export default function MistakePractice() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  return <PracticeContent key={id} id={id} />;
}

function PracticeContent({ id }: { id: string }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  useStudySession(db);
  const [target, setTarget] = useState<Target | null>(null);
  const [word, setWord] = useState<Vocabulary | null>(null);
  const [pool, setPool] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const locked = useRef(false);
  const started = useRef(0);
  useEffect(() => {
    let live = true;
    void (async () => {
      const row = await db.getFirstAsync<Target>(`SELECT vocabulary_id,skill_type,exercise_type,correct_streak
        FROM mistake_records WHERE id=? AND vocabulary_id IS NOT NULL AND resolved=0`, id);
      if (!row || row.skill_type === 'SPEAKING') throw new Error('UNSUPPORTED_MISTAKE');
      const nextWord = await getVocabulary(db, row.vocabulary_id);
      if (!nextWord) throw new Error('MISSING_WORD');
      const nextPool = await listVocabulary(db, { band: nextWord.hskBand, limit: 80 });
      if (live) { setTarget(row); setWord(nextWord); setPool(nextPool); started.current = Date.now(); }
    })().catch(() => { if (live) setLoadError('Lỗi này đã được khắc phục hoặc nội dung không còn tồn tại.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; void stopChineseSpeech(); };
  }, [db, id]);

  if (loading) return <Screen title="Củng cố lỗi"><ActivityIndicator /></Screen>;
  if (!word || !target) return <Screen title="Củng cố lỗi">
    <View style={themedCard(theme)}><EmptyState variant="review" scene="mistakes" title="Bài luyện không còn khả dụng" message={loadError || "Mục lỗi không còn trong sổ. Lịch ôn từ vựng không bị thay đổi."} primaryAction={{ label: 'Về sổ lỗi', onPress: () => router.back() }} /></View>
  </Screen>;
  const listening = target.skill_type === 'LISTENING';
  const pinyin = target.skill_type === 'PINYIN';
  const meaning = target.skill_type === 'MEANING' || target.exercise_type === 'audio_to_meaning';
  const expected = pinyin ? word.pinyin : meaning ? word.primaryMeaningVi : word.simplified;
  const options = pinyin || meaning ? Array.from(new Set([expected, ...pool.filter((item) => item.id !== word.id)
    .map((item) => pinyin ? item.pinyin : item.primaryMeaningVi).filter((value) => value && value !== expected).slice(0, 3)]))
    .sort((a, b) => a.localeCompare(b)) : [];

  const submit = async () => {
    if (locked.current || !answer.trim() || feedback || resolved) return;
    locked.current = true;
    setSaving(true);
    const correct = pinyin || meaning ? answer === expected
      : [word.simplified, word.traditional].includes(answer.trim().replace(/\s+/g, ''));
    try {
      await practiceMistake(db, id, { correct, hintUsed: hint, responseTimeMs: Date.now() - started.current });
      const row = await db.getFirstAsync<{ resolved: number; correct_streak: number }>(
        'SELECT resolved,correct_streak FROM mistake_records WHERE id=?', id);
      setResolved(row?.resolved === 1);
      setTarget({ ...target, correct_streak: row?.correct_streak ?? 0 });
      setSaveError('');
      setFeedback(correct ? hint ? 'Đúng với gợi ý; chưa tính vào chuỗi khắc phục.' : 'Đúng.' : `Chưa đúng. Đáp án: ${expected}`);
    } catch { setSaveError('Chưa lưu được kết quả. Câu trả lời được giữ lại; lịch ôn không bị thay đổi.'); }
    finally { locked.current = false; setSaving(false); }
  };
  return <Screen title="Củng cố lỗi" subtitle="Bài luyện riêng, không thay đổi lịch SRS.">
    <View style={[themedCard(theme), styles.block]}>
      <Text style={styles.meta}>Đúng không gợi ý {target.correct_streak}/3</Text>
      {listening ? <AudioButton text={word.simplified} allowWhenSoundDisabled /> :
        <Text style={styles.prompt}>{pinyin || meaning ? word.simplified : target.exercise_type === 'pinyin_to_hanzi' ? word.pinyin : word.primaryMeaningVi}</Text>}
      <Text style={styles.meta}>{pinyin ? 'Chọn pinyin' : meaning ? 'Chọn nghĩa' : 'Viết Hán tự'}</Text>
      {!feedback && !resolved && (options.length ? options.map((option) => <PrimaryButton key={option} variant={answer === option ? 'primary' : 'secondary'} label={option} disabled={saving} onPress={() => setAnswer(option)} />)
        : <HanziHandwritingPad key={round} characterCount={Array.from(word.simplified).length}
          targetWord={word.simplified} onSelect={setAnswer} onHintUsed={() => setHint(true)} />)}
      {!feedback && !resolved && <PrimaryButton label="Kiểm tra" disabled={saving || !answer.trim()} onPress={() => { void submit(); }} />}
      {saveError ? <View accessibilityRole="alert" style={styles.errorNotice}><Text style={styles.meta}>{saveError}</Text><PrimaryButton label={saving ? 'Đang lưu…' : 'Thử lưu lại'} disabled={saving} variant="secondary" onPress={() => void submit()} /></View> : null}
      {feedback && <Text style={styles.meta}>{feedback}</Text>}
      {resolved ? <><Text style={styles.prompt}>Đã khắc phục lỗi</Text><PrimaryButton label="Về sổ lỗi" onPress={() => router.back()} /></> : feedback &&
        <PrimaryButton label="Luyện tiếp" onPress={() => { setAnswer(''); setHint(false); setFeedback(null); setRound((value) => value + 1); started.current = Date.now(); }} />}
    </View>
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({ block: { gap: spacing.md }, errorNotice: { gap: spacing.sm, backgroundColor: theme.errorSoft, borderRadius: 12, padding: spacing.md },
  prompt: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' }, meta: { color: theme.textMuted, lineHeight: 20 } }); }
