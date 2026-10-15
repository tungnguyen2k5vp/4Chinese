import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { radius, spacing } from '@/constants/design';
import { listLearningCourses, type LearningCourse } from '@/db/learning-path';
import { useTheme } from '@/theme/ThemeProvider';

function courseLevel(course: LearningCourse, index: number) { return course.hsk_band.match(/\d+/u)?.[0] ?? String(index + 1); }

export default function LearningPathScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = createStyles(theme);
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  useFocusEffect(useCallback(() => { let active = true; void listLearningCourses(db).then((rows) => { if (active) setCourses(rows); }); return () => { active = false; }; }, [db]));

  const activeIndex = courses.findIndex((course) => course.completed_lessons < course.total_lessons);
  const activeCourse = courses[activeIndex >= 0 ? activeIndex : 0];
  const remainingCourses = courses.filter((course) => course.id !== activeCourse?.id);

  return <Screen title="Lộ trình học" hideTitle>
    {activeCourse ? (() => {
      const index = courses.findIndex((item) => item.id === activeCourse.id);
      const color = theme.hsk[index % theme.hsk.length] ?? theme.primary;
      const progress = activeCourse.total_lessons > 0 ? activeCourse.completed_lessons / activeCourse.total_lessons : 0;
      const isComplete = activeCourse.completed_lessons >= activeCourse.total_lessons && activeCourse.total_lessons > 0;
      return <MotionPressable haptic accessibilityLabel={`Tiếp tục ${activeCourse.title}, ${activeCourse.completed_lessons} trên ${activeCourse.total_lessons} bài`} style={styles.activeWorld} onPress={() => router.push(`/path/${activeCourse.id}` as Href)}>
        <View style={styles.worldArt}><LearningLandscape mood="journey" scene="hsk" height={84} /><View style={[styles.worldLevel, { backgroundColor: color }]}><Text style={styles.levelTop}>HSK</Text><Text style={styles.levelNumber}>{courseLevel(activeCourse, index)}</Text></View><Text style={styles.worldChinese}>山 · 路 · 学</Text></View>
        <View style={styles.worldBody}>
          <Text style={[styles.eyebrow, { color }]}>CHẶNG ĐANG MỞ</Text>
          <Text style={styles.worldTitle}>{activeCourse.title}</Text>
          <Text style={styles.note} numberOfLines={2}>{activeCourse.description}</Text>
          <AnimatedProgressBar progress={progress} color={color} trackColor={theme.border} accessibilityLabel={`${activeCourse.title}: ${Math.round(progress * 100)} phần trăm`} />
          <View style={styles.metaRow}><Text style={styles.meta}>{activeCourse.completed_lessons}/{activeCourse.total_lessons} bài</Text><Text style={[styles.meta, { color }]}>{isComplete ? 'Hoàn thành' : `${activeCourse.earned_xp} XP đã nhận`}</Text><Text style={[styles.continue, { color }]}>MỞ CHẶNG →</Text></View>
        </View>
      </MotionPressable>;
    })() : <View style={styles.empty}><Text style={styles.emptyTitle}>Chưa có lộ trình học</Text><Text style={styles.note}>Các chặng sẽ xuất hiện khi nội dung học được chuẩn bị trên thiết bị.</Text></View>}
    {remainingCourses.length ? <View style={styles.otherWorlds}>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>CÁC CHẶNG KHÁC</Text><Text style={styles.sectionHint}>Chọn cấp độ phù hợp</Text></View>
      <View style={styles.courseGrid}>{remainingCourses.map((course) => {
        const index = courses.findIndex((item) => item.id === course.id);
        const color = theme.hsk[index % theme.hsk.length] ?? theme.primary;
        const progress = course.total_lessons > 0 ? course.completed_lessons / course.total_lessons : 0;
        return <MotionPressable key={course.id} haptic accessibilityLabel={`Mở ${course.title}, ${course.completed_lessons} trên ${course.total_lessons} bài`} style={styles.courseTile} onPress={() => router.push(`/path/${course.id}` as Href)}>
          <View style={[styles.tileSeal, { borderColor: color }]}><Text style={[styles.tileBand, { color }]}>HSK</Text><Text style={[styles.tileLevel, { color }]}>{courseLevel(course, index)}</Text></View>
          <View style={styles.tileCopy}><Text style={styles.tileTitle} numberOfLines={1}>{course.title}</Text><Text style={styles.tileMeta}>{course.completed_lessons}/{course.total_lessons} bài · {course.earned_xp} XP</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} /></View></View>
        </MotionPressable>;
      })}</View>
    </View> : null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  activeWorld: { backgroundColor: theme.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  worldArt: { position: 'relative' }, worldLevel: { position: 'absolute', left: spacing.md, top: spacing.md, minWidth: 58, minHeight: 66, padding: spacing.xs, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, levelTop: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, levelNumber: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', lineHeight: 32 }, worldChinese: { position: 'absolute', right: spacing.md, bottom: spacing.md, color: '#FFFFFF', backgroundColor: '#253B31CC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, fontSize: 12, fontWeight: '800' },
  worldBody: { padding: spacing.lg, gap: spacing.sm }, eyebrow: { fontWeight: '900', fontSize: 11, letterSpacing: 1 }, worldTitle: { color: theme.textPrimary, fontWeight: '900', fontSize: 23, lineHeight: 29 }, note: { color: theme.textMuted, fontSize: 14, lineHeight: 21 }, metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }, meta: { color: theme.textMuted, fontSize: 12, fontWeight: '800' }, continue: { marginLeft: 'auto', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  otherWorlds: { gap: spacing.md, paddingTop: spacing.md }, sectionHead: { gap: 3 }, sectionTitle: { color: theme.textPrimary, fontWeight: '900', fontSize: 13, letterSpacing: 1 }, sectionHint: { color: theme.textMuted, fontSize: 13 }, courseGrid: { gap: spacing.sm }, courseTile: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }, tileSeal: { width: 44, height: 44, borderWidth: 1.5, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, tileBand: { fontSize: 9, fontWeight: '900' }, tileLevel: { fontSize: 17, fontWeight: '900', lineHeight: 20 }, tileCopy: { flex: 1, gap: 4 }, tileTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '800' }, tileMeta: { color: theme.textMuted, fontSize: 11 }, track: { height: 4, borderRadius: 2, backgroundColor: theme.border, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 2 }, empty: { padding: spacing.xl, borderRadius: radius.lg, backgroundColor: theme.surface, gap: spacing.sm }, emptyTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
}); }
