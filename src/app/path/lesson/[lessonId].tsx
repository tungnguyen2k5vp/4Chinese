import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { completeLesson, completeLessonActivity, getLessonCourseId, listCompletedLessonActivityIds,
  listLearningLessons, listLessonActivities, startLesson,
  type LearningActivity, type LearningLesson } from '@/db/learning-path';

const routes: Record<LearningActivity['activity_type'], (target: string | null) => string | null> = {
  VOCABULARY: (target) => target ? `/(tabs)/vocabulary?band=${encodeURIComponent(target)}` : null,
  GRAMMAR: () => '/grammar',
  LISTENING: () => '/speaking/tones',
  SPEAKING: () => '/speaking/shadowing',
  READING: () => '/reader',
  HANZI: () => '/writing',
  QUIZ: () => '/review',
};

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const db = useSQLiteContext();
  const [lesson, setLesson] = useState<LearningLesson | null>(null);
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void listCompletedLessonActivityIds(db, lessonId)
      .then((ids) => { if (active) setVisited(ids); })
      .catch((error) => {
        if (active) Alert.alert('Chưa tải được tiến độ', error instanceof Error ? error.message : 'Vui lòng thử lại.');
      });
    return () => { active = false; };
  }, [db, lessonId]));
  useEffect(() => {
    let active = true;
    void getLessonCourseId(db, lessonId).then(async (courseId) => {
      if (!courseId) throw new Error('Không tìm thấy bài học.');
      return Promise.all([listLearningLessons(db, courseId), listLessonActivities(db, lessonId)]);
    })
      .then(async ([lessons, rows]) => {
        const index = lessons.findIndex((item) => item.id === lessonId);
        if (index < 0 || (index > 0 && lessons[index - 1]?.status !== 'COMPLETED')) {
          Alert.alert('Bài chưa mở', 'Hoàn thành bài trước để tiếp tục.');
          router.back();
          return;
        }
        if (!active) return;
        setLesson(lessons[index] ?? null);
        setActivities(rows);
        await startLesson(db, lessonId);
      }).catch((error) => { if (active) Alert.alert('Không thể mở bài', error instanceof Error ? error.message : 'Vui lòng thử lại.'); });
    return () => { active = false; };
  }, [db, lessonId]);
  return <Screen title={lesson?.title ?? 'Bài học'} subtitle="Mở các hoạt động rồi đánh dấu hoàn thành.">
    {activities.map((activity) => {
      const route = routes[activity.activity_type](activity.target);
      return <Pressable key={activity.id} style={card} disabled={!route} accessibilityRole="button"
        onPress={() => void (async () => {
          if (!route) return;
          try {
            await completeLessonActivity(db, activity.id);
            setVisited((current) => current.includes(activity.id) ? current : [...current, activity.id]);
            if (activity.activity_type === 'VOCABULARY' && activity.target) {
              router.push({
                pathname: '/(tabs)/vocabulary',
                params: {
                  band: activity.target,
                  returnTo: '/path/lesson/' + lessonId,
                },
              } as Href);
            } else {
              router.push(route as Href);
            }
          } catch (error) {
            Alert.alert('Chưa mở được hoạt động', error instanceof Error ? error.message : 'Vui lòng thử lại.');
          }
        })()}>
        <Text style={styles.activity}>{activity.title}{visited.includes(activity.id) ? ' ✓' : ''}</Text>
        {!route ? <Text style={styles.pending}>Nội dung sẽ mở ở bản cập nhật sau</Text> : null}
      </Pressable>;
    })}
    <Pressable style={[styles.button, visited.length < activities.length && styles.disabled]}
      disabled={!lesson || activities.length === 0 || visited.length < activities.length}
      onPress={() => void completeLesson(db, lessonId).then(() => router.back())
        .catch((error) => Alert.alert('Chưa lưu được', error instanceof Error ? error.message : 'Vui lòng thử lại.'))}>
      <Text style={styles.buttonText}>Đánh dấu đã học</Text>
    </Pressable>
  </Screen>;
}

const styles = StyleSheet.create({
  activity: { color: colors.text, fontSize: 17, fontWeight: '700' },
  pending: { color: colors.textMuted, marginTop: spacing.xs },
  button: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: 12, alignItems: 'center' },
  disabled: { opacity: 0.45 }, buttonText: { color: '#fff', fontWeight: '800' },
});
