import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { radius, spacing } from '@/constants/design';
import { isLessonUnlocked, listLearningLessons, listLessonActivities, type LearningActivity, type LearningLesson } from '@/db/learning-path';
import { groupLessonsByUnit, lessonNodeState } from '@/services/learning/lesson-path-presentation';
import { useTheme } from '@/theme/ThemeProvider';
import { visualModePresentation } from '@/theme/visual-modes';

const activityPresentation: Record<LearningActivity['activity_type'], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  VOCABULARY: { label: 'Từ vựng', icon: 'book-outline' },
  GRAMMAR: { label: 'Ngữ pháp', icon: 'git-branch-outline' },
  LISTENING: { label: 'Nghe', icon: 'headset-outline' },
  SPEAKING: { label: 'Nói', icon: 'mic-outline' },
  READING: { label: 'Đọc', icon: 'reader-outline' },
  HANZI: { label: 'Hán tự', icon: 'brush-outline' },
  QUIZ: { label: 'Ôn tập', icon: 'checkmark-circle-outline' },
};

export default function CourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = createStyles(theme);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [selected, setSelected] = useState<LearningLesson | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<LearningActivity[]>([]);
  const [activityLoadState, setActivityLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const selectionGeneration = useRef(0);
  const openLessonDetails = (lesson: LearningLesson) => {
    const generation = ++selectionGeneration.current;
    setSelected(lesson);
    setSelectedActivities([]);
    setActivityLoadState('loading');
    void listLessonActivities(db, lesson.id).then((rows) => {
      if (generation !== selectionGeneration.current) return;
      setSelectedActivities(rows);
      setActivityLoadState('ready');
    }).catch(() => {
      if (generation === selectionGeneration.current) setActivityLoadState('error');
    });
  };
  const closeLessonDetails = () => {
    selectionGeneration.current++;
    setSelected(null);
    setSelectedActivities([]);
    setActivityLoadState('idle');
  };
  useFocusEffect(useCallback(() => {
    let active = true;
    void listLearningLessons(db, courseId).then((rows) => { if (active) setLessons(rows); });
    return () => { active = false; };
  }, [courseId, db]));
  const completed = lessons.filter((lesson) => lesson.status === 'COMPLETED').length;
  const groups = useMemo(() => groupLessonsByUnit(lessons), [lessons]);
  const mode = visualModePresentation(theme, 'LEARN');
  const selectedIndex = selected ? lessons.findIndex((lesson) => lesson.id === selected.id) : -1;
  const selectedUnlocked = selectedIndex >= 0 && isLessonUnlocked(lessons, selectedIndex);
  const selectedState = selected ? lessonNodeState(selected, selectedUnlocked) : null;
  const courseTitle = `Lộ trình ${courseId.replace(/-path$/u, '').toUpperCase()}`;

  return <Screen title={courseTitle} subtitle="Chọn một nút để xem mục tiêu và bước học tiếp theo.">
    <View style={styles.worldHero}>
      <LearningLandscape mood="journey" scene="hsk" height={112} />
      <View style={styles.worldStamp}><Text style={styles.worldStampText}>学</Text></View>
      <View style={styles.worldHeroCopy}><Text style={styles.worldEyebrow}>BẢN ĐỒ HỌC TẬP</Text><Text style={styles.worldTitle}>{completed === lessons.length && lessons.length ? 'Chặng đường đã hoàn tất' : 'Con đường ghi nhớ'}</Text><Text style={styles.worldSub}>{lessons.length} bài · {groups.length} chặng</Text></View>
    </View>

    <View style={[styles.summary, { borderLeftColor: mode.accent }]}>
      <View style={styles.summaryRow}><Text style={[styles.eyebrow, { color: mode.accent }]}>TIẾN ĐỘ HÀNH TRÌNH</Text><Text style={styles.summaryCount}>{completed}/{lessons.length} bài</Text></View>
      <AnimatedProgressBar progress={lessons.length ? completed / lessons.length : 0} color={mode.accent} trackColor={theme.border} accessibilityLabel={`Đã hoàn thành ${completed} trong ${lessons.length} bài`} />
      <Text style={styles.summaryHint}>{completed === lessons.length && lessons.length > 0 ? 'Bạn đã hoàn thành toàn bộ chặng này.' : 'Chọn một nút trên bản đồ để xem mục tiêu và bắt đầu.'}</Text>
    </View>

    <View style={styles.timeline}>{groups.map((group, groupIndex) => {
      const unitCompleted = group.lessons.filter(({ lesson }) => lesson.status === 'COMPLETED').length;
      return <View key={`${group.title}-${groupIndex}`} style={styles.unitGroup}>
        <View style={styles.unitHeader}>
          <View style={[styles.unitMarker, { backgroundColor: theme.primarySoft }]}><Ionicons name="trail-sign-outline" size={21} color={mode.accent} /></View>
          <View style={styles.unitCopy}><Text style={[styles.unitKicker, { color: mode.accent }]}>CHẶNG {String(groupIndex + 1).padStart(2, '0')}</Text><Text style={styles.unitHeading}>{group.title}</Text></View>
          <Text style={styles.unitProgress}>{unitCompleted}/{group.lessons.length}</Text>
        </View>
        <View style={styles.mapNodes}>{group.lessons.map(({ lesson, courseIndex }, unitIndex) => {
          const unlocked = isLessonUnlocked(lessons, courseIndex);
          const state = lessonNodeState(lesson, unlocked);
          const completedLesson = state === 'completed';
          const current = state === 'current';
          const available = state === 'available';
          const stateLabel = completedLesson ? 'Đã hoàn thành' : current ? 'Đang học' : available ? 'Sẵn sàng học' : 'Chưa mở khóa';
          const icon = completedLesson ? 'checkmark' : current ? 'play' : available ? 'arrow-forward' : 'lock-closed';
          const alignRight = unitIndex % 2 === 1;
          return <View key={lesson.id} style={[styles.nodeRow, { justifyContent: alignRight ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.routeDot, { backgroundColor: completedLesson ? theme.success : current ? mode.accent : theme.surface, borderColor: completedLesson ? theme.success : current ? mode.accent : theme.border, left: alignRight ? undefined : 10, right: alignRight ? 10 : undefined }]}>
              <Ionicons name={icon} size={15} color={completedLesson || current ? '#FFFFFF' : available ? mode.accent : theme.textMuted} />
            </View>
            <MotionPressable haptic={unlocked} accessibilityLabel={`${lesson.title}. ${stateLabel}`} style={[styles.lesson, alignRight && styles.lessonRight, completedLesson && styles.lessonComplete, current && styles.lessonCurrent, state === 'locked' && styles.locked]} onPress={() => openLessonDetails(lesson)}>
              <View style={styles.lessonTop}><View style={styles.lessonCopy}><Text style={[styles.lessonStep, { color: mode.accent }]}>{String(courseIndex + 1).padStart(2, '0')} · {group.title}</Text><Text style={styles.lessonTitle}>{lesson.title}</Text></View><Text style={[styles.status, current && { color: mode.accent }, completedLesson && styles.statusComplete, state === 'locked' && styles.statusLocked]}>{stateLabel}</Text></View>
            </MotionPressable>
            {unitIndex < group.lessons.length - 1 ? <View style={[styles.routeConnector, alignRight && styles.routeConnectorRight, completedLesson && styles.routeConnectorDone]} /> : null}
          </View>;
        })}</View>
      </View>;
    })}</View>

    <Modal transparent visible={Boolean(selected)} animationType="slide" statusBarTranslucent onRequestClose={closeLessonDetails}>
      <View style={styles.modalRoot}>
        <MotionPressable accessibilityLabel="Đóng chi tiết bài học" style={styles.modalScrim} onPress={closeLessonDetails}><View style={{ flex: 1 }} /></MotionPressable>
        {selected ? <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetTop}><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={[styles.eyebrow, { color: mode.accent }]}>{selectedState === 'locked' ? 'NÚT CHƯA MỞ' : selectedState === 'completed' ? 'ĐÃ ĐI QUA' : selectedState === 'current' ? 'ĐANG HỌC' : 'BƯỚC TIẾP THEO'}</Text><Text style={styles.sheetTitle}>{selected.title}</Text></View><MotionPressable haptic accessibilityLabel="Đóng" style={styles.closeButton} onPress={closeLessonDetails}><Ionicons name="close" size={20} color={theme.textSecondary} /></MotionPressable></View>
          <Text style={styles.sheetUnit}>{selected.unit_title}</Text>
          <View style={styles.sheetFacts}><View style={styles.fact}><Ionicons name="time-outline" size={18} color={mode.accent} /><Text style={styles.factText}>{selected.estimated_minutes} phút</Text></View><View style={styles.fact}><Ionicons name="sparkles-outline" size={18} color={mode.accent} /><Text style={styles.factText}>{selected.xp_reward} XP</Text></View></View>
          <View style={styles.sheetActivities}>
            <Text style={styles.sheetActivitiesTitle}>Kỹ năng trong bài</Text>
            {activityLoadState === 'loading' ? <Text style={styles.sheetNote}>Đang đọc hoạt động của bài…</Text> : null}
            {activityLoadState === 'error' ? <Text style={styles.sheetNote}>Chưa tải được danh sách hoạt động. Bạn vẫn có thể mở bài nếu đã đủ điều kiện.</Text> : null}
            {activityLoadState === 'ready' && selectedActivities.length === 0 ? <Text style={styles.sheetNote}>Bài này chưa có hoạt động được liên kết.</Text> : null}
            {activityLoadState === 'ready' && selectedActivities.length > 0 ? <View style={styles.activityTags}>{selectedActivities.map((activity) => {
              const presentation = activityPresentation[activity.activity_type];
              return <View key={activity.id} style={styles.activityTag}><Ionicons name={presentation.icon} size={15} color={mode.accent} /><Text style={styles.activityTagText}>{presentation.label}</Text></View>;
            })}</View> : null}
          </View>
          <Text style={styles.sheetNote}>{selectedState === 'locked' ? 'Hoàn thành bài ngay trước đó để mở chặng này. Tiến độ vẫn được giữ nguyên.' : selectedState === 'completed' ? 'Bài đã hoàn thành. Bạn có thể mở lại để xem hoạt động.' : 'Một bài ngắn kết hợp các hoạt động trong lộ trình. Tiến độ chỉ được ghi nhận khi hoàn tất yêu cầu của bài.'}</Text>
          </ScrollView>
          <MotionPressable haptic={selectedUnlocked} disabled={!selectedUnlocked} accessibilityLabel={selectedUnlocked ? selectedState === 'completed' ? 'Mở lại bài học' : 'Bắt đầu bài học' : 'Cần hoàn thành bài trước'} style={[styles.sheetAction, !selectedUnlocked && styles.sheetActionDisabled]} onPress={() => { const id = selected.id; closeLessonDetails(); router.push(`/path/lesson/${id}` as Href); }}><Text style={[styles.sheetActionText, !selectedUnlocked && styles.sheetActionTextDisabled]}>{selectedUnlocked ? selectedState === 'completed' ? 'MỞ LẠI BÀI HỌC' : 'BẮT ĐẦU BÀI HỌC' : 'CẦN HOÀN THÀNH BÀI TRƯỚC'}</Text><Ionicons name={selectedUnlocked ? 'arrow-forward' : 'lock-closed'} size={18} color={selectedUnlocked ? '#FFFFFF' : theme.textMuted} /></MotionPressable>
        </View> : null}
      </View>
    </Modal>
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  worldHero: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }, worldStamp: { position: 'absolute', left: spacing.md, top: spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: '#A94D45', alignItems: 'center', justifyContent: 'center' }, worldStampText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' }, worldHeroCopy: { padding: spacing.md, gap: 4, backgroundColor: theme.surface }, worldEyebrow: { color: theme.success, fontSize: 10, letterSpacing: 1, fontWeight: '900' }, worldTitle: { color: theme.textPrimary, fontSize: 19, fontWeight: '900' }, worldSub: { color: theme.textMuted, fontSize: 12 },
  summary: { gap: spacing.sm, backgroundColor: theme.primarySoft, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderLeftWidth: 4, borderColor: theme.border }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }, summaryCount: { color: theme.textPrimary, fontSize: 14, fontWeight: '900' }, summaryHint: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  timeline: { gap: spacing.sm, paddingTop: spacing.sm }, unitGroup: { gap: spacing.xs, padding: spacing.xs, borderRadius: radius.lg, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }, unitHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xs }, unitMarker: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, unitCopy: { flex: 1, minWidth: 0, gap: 2 }, unitKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9 }, unitHeading: { color: theme.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '900' }, unitProgress: { color: theme.textSecondary, fontSize: 12, fontWeight: '900' }, mapNodes: { gap: 4 },
  nodeRow: { minHeight: 70, alignItems: 'center', position: 'relative' }, lesson: { width: '88%', minWidth: 0, minHeight: 62, alignSelf: 'flex-start', justifyContent: 'center', padding: spacing.xs, paddingLeft: 42, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, zIndex: 1 }, lessonRight: { alignSelf: 'flex-end', paddingLeft: spacing.xs, paddingRight: 42 }, lessonComplete: { borderColor: theme.success }, lessonCurrent: { borderColor: theme.primary, borderWidth: 2, backgroundColor: theme.surfaceSelected }, locked: { opacity: 0.66, shadowOpacity: 0, elevation: 0 }, routeDot: { position: 'absolute', zIndex: 2, top: 20, width: 32, height: 32, borderWidth: 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, routeConnector: { position: 'absolute', width: 2, top: 52, bottom: -4, left: 24, backgroundColor: theme.border }, routeConnectorRight: { left: undefined, right: 24 }, routeConnectorDone: { backgroundColor: theme.success }, lessonTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs, alignItems: 'flex-start' }, lessonCopy: { flex: 1, minWidth: 0, gap: 3 }, lessonStep: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }, lessonTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '900', lineHeight: 19 }, status: { color: theme.primaryText, fontSize: 9, fontWeight: '900', textAlign: 'right', maxWidth: 88 }, statusComplete: { color: theme.success }, statusLocked: { color: theme.textMuted }, lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, meta: { color: theme.textMuted, fontSize: 11, fontWeight: '700' }, metaDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.border },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay }, sheet: { maxHeight: '90%', backgroundColor: theme.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, borderWidth: 1, borderColor: theme.border }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: spacing.xs }, sheetScroll: { flexShrink: 1, minHeight: 0 }, sheetContent: { gap: spacing.md, paddingBottom: spacing.xs }, sheetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, sheetTitle: { color: theme.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: '900' }, closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary }, sheetUnit: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' }, sheetFacts: { flexDirection: 'row', gap: spacing.sm }, fact: { flex: 1, minHeight: 48, backgroundColor: theme.backgroundSecondary, borderRadius: radius.md, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, factText: { color: theme.textPrimary, fontWeight: '800', fontSize: 13 }, sheetActivities: { gap: spacing.xs }, sheetActivitiesTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '800' }, activityTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, activityTag: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.sm }, activityTagText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' }, sheetNote: { color: theme.textSecondary, fontSize: 14, lineHeight: 21 }, sheetAction: { minHeight: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: modeColor(theme), borderRadius: radius.md, paddingHorizontal: spacing.md }, sheetActionDisabled: { backgroundColor: theme.backgroundSecondary }, sheetActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 }, sheetActionTextDisabled: { color: theme.textMuted },
}); }

function modeColor(theme: ReturnType<typeof useTheme>) { return theme.mode === 'dark' ? '#527CCB' : '#315D42'; }
