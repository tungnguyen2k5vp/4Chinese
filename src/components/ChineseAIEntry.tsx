import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { MotionPressable } from '@/components/ui/MotionPressable';
import { useAILaunch, wordAILaunch, type AILaunch } from '@/services/ai/context';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';
import type { Vocabulary } from '@/types/models';

export function ChineseAIEntry({ label = 'Hỏi 4Chinese AI', context, load, beforeOpen }: {
  label?: string; context?: AILaunch; load?: () => Promise<AILaunch>; beforeOpen?: () => void;
}) {
  const { preferences } = useLearningLanguage(), theme = useTheme();
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const locked = useRef(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  if (preferences.learningLanguage !== (context?.language ?? 'zh')) return null;
  return <View style={{ gap: 4 }}>
    <MotionPressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} accessibilityState={{ busy }}
      style={{ minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.primarySoft }}
      onPress={async () => {
        if (locked.current) return;
        locked.current = true; setBusy(true); setFailed(false);
        try {
          const value = load ? await load() : context ?? { label: 'Câu hỏi hiện tại', task: 'tutor', context: null };
          if (!live.current) return;
          useAILaunch.getState().set(value);
          beforeOpen?.();
          router.push('/ai' as Href);
        } catch { if (live.current) setFailed(true); }
        finally { locked.current = false; if (live.current) setBusy(false); }
      }}>
      {busy ? <ActivityIndicator color={theme.primaryText} /> : <Ionicons name="sparkles-outline" size={20} color={theme.primaryText} />}
      <Text style={{ color: theme.primaryText, fontSize: 15, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={theme.primaryText} />
    </MotionPressable>
    {failed ? <Text accessibilityRole="alert" style={{ color: theme.error }}>Chưa đọc được ngữ cảnh. Chạm để thử lại.</Text> : null}
  </View>;
}
export function WordAIEntry({ word, beforeOpen, sentence }: { word: Vocabulary; beforeOpen?: () => void; sentence?: string }) {
  const db = useSQLiteContext();
  return <ChineseAIEntry key={word.id} label={`Hỏi AI về ${word.simplified}`} load={async () => ({ ...await wordAILaunch(db, word),
    ...(sentence ? { question: `Giải thích cách dùng của ${word.simplified} trong câu tôi chọn; nếu nghĩa chưa rõ, hỏi lại:\n${sentence.slice(0, 500)}` } : {}) })} beforeOpen={beforeOpen} />;
}
export function EnglishWritingAIEntry() {
  return <ChineseAIEntry label="AI sửa câu tiếng Anh" context={{ label: 'Câu tiếng Anh do bạn nhập', task: 'writing', language: 'en', context: null }} />;
}
