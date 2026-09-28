import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { isLessonUnlocked, listLearningLessons, type LearningLesson } from '@/db/learning-path';

export default function CourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const db = useSQLiteContext();
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void listLearningLessons(db, courseId).then((rows) => { if (active) setLessons(rows); });
    return () => { active = false; };
  }, [courseId, db]));
  return <Screen title={`Lộ trình ${courseId.replace(/-path$/u, '').toUpperCase()}`}
    subtitle="Hoàn thành bài trước để mở bài tiếp theo.">
    {lessons.map((lesson, index) => {
      const unlocked = isLessonUnlocked(lessons, index);
      return <Pressable key={lesson.id} style={[card, styles.lesson, !unlocked && styles.locked]}
        disabled={!unlocked} accessibilityRole="button"
        onPress={() => router.push(`/path/lesson/${lesson.id}` as Href)}>
        <View style={styles.row}><Text style={styles.title}>{index + 1}. {lesson.title}</Text>
          <Text style={styles.status}>{!unlocked ? 'Đã khóa' : lesson.status === 'COMPLETED' ? 'Đã học' : 'Bắt đầu'}</Text></View>
        <Text style={styles.meta}>{lesson.unit_title} · {lesson.estimated_minutes} phút · {lesson.xp_reward} XP</Text>
      </Pressable>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  lesson: { gap: spacing.sm }, locked: { opacity: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', flex: 1 },
  status: { color: colors.primary, fontWeight: '700' },
  meta: { color: colors.textMuted },
});
