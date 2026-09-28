import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { listLearningCourses, type LearningCourse } from '@/db/learning-path';

export default function LearningPathScreen() {
  const db = useSQLiteContext();
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void listLearningCourses(db).then((rows) => { if (active) setCourses(rows); });
    return () => { active = false; };
  }, [db]));
  return <Screen title="Lộ trình học" subtitle="Học từng chặng. Tiến độ được lưu trên máy.">
    {courses.map((course) => <Pressable key={course.id} style={[card, styles.course]}
      onPress={() => router.push(`/path/${course.id}` as Href)} accessibilityRole="button">
      <View style={styles.row}><Text style={styles.title}>{course.title}</Text>
        <Text style={styles.progress}>{course.completed_lessons}/{course.total_lessons}</Text></View>
      <Text style={styles.note}>{course.description}</Text>
      <Text style={styles.meta}>{course.earned_xp} XP · {course.total_lessons} bài học</Text>
    </Pressable>)}
  </Screen>;
}

const styles = StyleSheet.create({
  course: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  progress: { color: colors.primary, fontWeight: '800' },
  note: { color: colors.textMuted },
  meta: { color: colors.primary, fontWeight: '700' },
});
