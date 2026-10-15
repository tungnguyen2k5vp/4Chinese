import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { englishReadingLessons } from '@/data/english-learning-content';
import { readEnglishContentProgress, type EnglishContentProgress } from '@/db/english/content-progress';
import { useEnglishDatabase } from '@/services/languages/LanguageRuntime';
import { useTheme } from '@/theme/ThemeProvider';
import { getEnglishPalette } from '@/theme/english-tokens';

export default function EnglishReadingLibrary() {
  const db = useEnglishDatabase();
  const p = getEnglishPalette(useTheme().mode === 'dark');
  const [preview, setPreview] = useState(false);
  const [progress, setProgress] = useState<Record<string, EnglishContentProgress>>({});
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let live = true;
    void Promise.all(englishReadingLessons.map(async lesson => [lesson.id, await readEnglishContentProgress(db, lesson.id)] as const)).then(rows => { if (live) setProgress(Object.fromEntries(rows)); }).catch(() => { if (live) setError('Chưa tải được vị trí đọc. Không đặt lại nội dung của bạn.'); });
    return () => { live = false; };
  }, [db]));
  return <Screen hideTitle title="Thư viện bài đọc" subtitle="Bài đọc và truyện gốc để luyện thử.">
    <View style={{ gap: 10 }}><Text style={{ color: p.textPrimary, fontSize: 21, fontWeight: '800' }}>4 bài gốc · đang chờ duyệt</Text><Text style={{ color: p.textSecondary }}>Các bài này chưa qua duyệt chuyên môn. Không được phân cấp CEFR hay xuất bản như giáo trình đã kiểm chứng.</Text><PrimaryButton label={preview ? 'Ẩn bài thử' : 'Xem bài thử chưa duyệt'} onPress={() => setPreview(value => !value)} /></View>
    {error ? <Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text> : null}
    {preview ? englishReadingLessons.map(lesson => <Pressable key={lesson.id} accessibilityRole="button" onPress={() => router.push(`/english/reader?lesson=${lesson.id}&draft=1` as Href)} style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: 18, padding: 18, gap: 10 }}><Text style={{ color: p.reading }}>{lesson.type === 'Story' ? 'Truyện ngắn' : 'Bài đọc'} · {lesson.topic} · BÀI THỬ</Text><Text style={{ color: p.textPrimary, fontSize: 21, fontWeight: '800' }}>{lesson.title}</Text><Text style={{ color: p.textSecondary }}>{lesson.text.split(/\s+/u).length} từ · {progress[lesson.id]?.completed ? 'Đã đọc và trả lời câu hỏi' : progress[lesson.id]?.position ? 'Đang đọc' : 'Chưa bắt đầu'}</Text><Text style={{ color: p.primary }}>{progress[lesson.id]?.position ? 'Đọc tiếp' : 'Mở bài đọc'} →</Text></Pressable>) : null}
    <PrimaryButton label="Đọc tài liệu của bạn" onPress={() => router.push('/english/reader' as Href)} />
  </Screen>;
}
