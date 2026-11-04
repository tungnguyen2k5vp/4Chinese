import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { radius, spacing } from '@/constants/design';
import { isLessonUnlocked, listLearningLessons, listLessonActivities, type LearningActivity, type LearningLesson } from '@/db/learning-path';
import { usePathAccess } from '@/hooks/use-path-access';
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import { groupLessonsByUnit, hskPathVocabulary, lessonNodeState } from '@/services/learning/lesson-path-presentation';
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
  const pathAccess = usePathAccess();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const focused = useIsFocused();
  const modalAnimation = useModalAnimationType();
  const styles = createStyles(theme);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [expandedUnit, setExpandedUnit] = useState<{ courseId: string; index: number | null } | null>(null);
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
  useEffect(() => {
    if (!focused) return;
    let active = true;
    void listLearningLessons(db, courseId).then((rows) => { if (active) { setLessons(rows); setLoadState('ready'); } })
      .catch(() => { if (active) setLoadState('error'); });
    return () => { active = false; };
  }, [courseId, db, focused, retry]);
  const completed = lessons.filter((lesson) => lesson.status === 'COMPLETED').length;
  const groups = useMemo(() => groupLessonsByUnit(lessons), [lessons]);
  const mode = visualModePresentation(theme, 'LEARN');
  const selectedIndex = selected ? lessons.findIndex((lesson) => lesson.id === selected.id) : -1;
  const selectedUnlocked = pathAccess.ready && selectedIndex >= 0 && (pathAccess.allOpen || isLessonUnlocked(lessons, selectedIndex));
  const selectedState = selected ? lessonNodeState(selected, selectedUnlocked) : null;
  const band = courseId.replace(/^hsk-|-path$/gu, '');
  const syllabus = hskPathVocabulary(band);
  const nextIndex = lessons.findIndex((lesson, index) => lesson.status !== 'COMPLETED' && isLessonUnlocked(lessons, index));
  const nextLesson = lessons[nextIndex];
  const nextGroup = groups.findIndex(group => group.lessons.some(({ courseIndex }) => courseIndex === nextIndex));
  const openUnit = expandedUnit?.courseId === courseId ? expandedUnit.index : Math.max(0, nextGroup);
  const courseTitle = syllabus ? `Lộ trình HSK ${band}` : 'Lộ trình học';

  return <Screen title={courseTitle}>
    {pathAccess.allOpen ? <Text style={styles.summaryHint}>Học tự do · Tất cả bài đã mở. Đổi về tuần tự trong Cài đặt.</Text> : null}
    <View style={styles.summary}>
      <View style={styles.summaryRow}><Text style={[styles.eyebrow, { color: mode.accent }]}>BÀI HỌC CỦA BẠN</Text><Text style={styles.summaryCount}>{completed}/{lessons.length}</Text></View>
      <AnimatedProgressBar progress={lessons.length ? completed / lessons.length : 0} color={mode.accent} trackColor={theme.border} accessibilityLabel={`Đã hoàn thành ${completed} trong ${lessons.length} bài`} />
      <Text style={styles.summaryHint}>{completed === lessons.length && lessons.length > 0 ? 'Bạn đã hoàn thành toàn bộ bài học.' : `${groups.length} chặng · Mở từng chặng để xem bài học`}</Text>
    </View>

    {syllabus ? <MotionPressable haptic accessibilityLabel={`Xem đủ ${syllabus.added} mục từ HSK ${band} theo đề cương 3.0`} style={styles.syllabusCard}
      onPress={() => router.push({ pathname: '/hsk/syllabus', params: { band, section: 'vocabulary' } } as Href)}>
      <View style={styles.syllabusIcon}><Ionicons name="book-outline" size={23} color={theme.primaryText} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text style={styles.syllabusTitle}>Từ vựng HSK 3.0</Text><Text testID="path-vocabulary-count" style={styles.syllabusMeta}>{syllabus.added.toLocaleString('vi-VN')} mục mới · {syllabus.cumulative.toLocaleString('vi-VN')} lũy kế</Text><Text style={styles.syllabusNote}>{band === '7-9' ? '11/2025 · Đề cương chung cho cấp 7–9' : 'Đề cương 11/2025 · Xem danh sách đầy đủ'}</Text></View>
      <Ionicons name="arrow-forward" size={20} color={theme.primaryText} />
    </MotionPressable> : null}

    {loadState === 'loading' ? <ActivityIndicator accessibilityLabel="Đang tải lộ trình" color={theme.primary} /> : null}
    {loadState === 'error' ? <View style={styles.loadMessage}><Text style={styles.summaryHint}>Chưa tải được bài học. Tiến độ đã lưu vẫn được giữ.</Text><PrimaryButton label="Thử tải lại" onPress={() => { setLoadState('loading'); setRetry(value => value + 1); }} /></View> : null}
    {loadState === 'ready' && !lessons.length ? <Text style={styles.summaryHint}>Chưa có bài học trong khóa này. Bạn vẫn có thể xem đề cương từ vựng.</Text> : null}
    {loadState === 'ready' && nextLesson ? <StudyTransition active={focused} turnKey={nextLesson.id} effect="reveal" durationMs={240} animateOnMount>
      <MotionPressable haptic accessibilityLabel={`Tiếp tục: ${nextLesson.title}`} style={styles.nextCard} onPress={() => openLessonDetails(nextLesson)}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}><Text style={styles.nextEyebrow}>BƯỚC TIẾP THEO · BÀI {String(nextIndex + 1).padStart(2, '0')}</Text><Text style={styles.nextTitle}>{nextLesson.title}</Text><Text style={styles.nextMeta}>{nextLesson.estimated_minutes} phút · {nextLesson.xp_reward} XP</Text></View>
        <View style={styles.nextArrow}><Ionicons name="play" size={22} color="#FFFFFF" /></View>
      </MotionPressable>
    </StudyTransition> : null}

    <View style={styles.timeline}>{loadState === 'ready' ? groups.map((group, groupIndex) => {
      const unitCompleted = group.lessons.filter(({ lesson }) => lesson.status === 'COMPLETED').length;
      const groupTitle = group.title.replace(/^Từ vựng HSK .+ · chặng (\d+)$/u, 'Từ vựng · nhóm $1');
      return <View key={`${group.title}-${groupIndex}`} style={styles.unitGroup}>
        <Disclosure title={`${String(groupIndex + 1).padStart(2, '0')} · ${groupTitle}`} expanded={openUnit === groupIndex}
          onPress={() => setExpandedUnit({ courseId, index: openUnit === groupIndex ? null : groupIndex })} testID={`path-unit-${groupIndex}`}
          trailing={<View style={[styles.unitBadge, unitCompleted === group.lessons.length && { backgroundColor: theme.primarySoft }]}><Text style={styles.unitProgress}>{unitCompleted}/{group.lessons.length}</Text></View>}>
        <View style={styles.mapNodes}>{group.lessons.map(({ lesson, courseIndex }, unitIndex) => {
          const unlocked = pathAccess.ready && (pathAccess.allOpen || isLessonUnlocked(lessons, courseIndex));
          const state = lessonNodeState(lesson, unlocked);
          const completedLesson = state === 'completed';
          const current = courseIndex === nextIndex;
          const available = state === 'available';
          const stateLabel = completedLesson ? 'Đã hoàn thành' : state === 'current' ? 'Đang học' : current ? 'Tiếp theo' : available ? 'Sẵn sàng học' : 'Chưa mở khóa';
          const icon = completedLesson ? 'checkmark' : current ? 'play' : available ? 'arrow-forward' : 'lock-closed';
          return <MotionPressable key={lesson.id} haptic={unlocked} accessibilityLabel={`${lesson.title}. ${stateLabel}`} style={[styles.lesson, current && styles.lessonCurrent]} onPress={() => openLessonDetails(lesson)}>
            {unitIndex < group.lessons.length - 1 ? <View pointerEvents="none" accessible={false} style={[styles.routeConnector, completedLesson && { backgroundColor: theme.success }]} /> : null}
            <StudyTransition active={focused && openUnit === groupIndex} turnKey={`${lesson.id}:${state}`} effect={current ? 'bounce' : 'stamp'} animateOnMount={current} durationMs={420} style={[styles.routeDot, { backgroundColor: completedLesson ? theme.success : current ? mode.accent : theme.backgroundSecondary, borderColor: completedLesson ? theme.success : current ? mode.accent : theme.border }]}>
              <Ionicons name={icon} size={15} color={completedLesson || current ? '#FFFFFF' : available ? mode.accent : theme.textMuted} />
            </StudyTransition>
            <View style={styles.lessonCopy}><Text style={[styles.lessonTitle, state === 'locked' && { color: theme.textSecondary }]}>{lesson.title}</Text><Text style={[styles.status, current && { color: mode.accent }, completedLesson && { color: theme.success }]}>{String(courseIndex + 1).padStart(2, '0')} · {stateLabel}{unlocked && !completedLesson ? ` · ${lesson.estimated_minutes} phút` : ''}</Text></View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </MotionPressable>;
        })}</View>
        </Disclosure>
      </View>;
    }) : null}</View>

    <Modal transparent visible={Boolean(selected)} animationType={modalAnimation} statusBarTranslucent navigationBarTranslucent onRequestClose={closeLessonDetails}>
      <View style={styles.modalRoot}>
        <MotionPressable accessibilityLabel="Đóng chi tiết bài học" style={styles.modalScrim} onPress={closeLessonDetails}><View style={{ flex: 1 }} /></MotionPressable>
        {selected ? <StudyTransition turnKey={selected.id} effect="reveal" animateOnMount style={[styles.sheet, { maxHeight: Math.min(height * 0.82, height - insets.top - 24), paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
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
            {activityLoadState === 'ready' && selectedActivities.length > 0 ? <View style={styles.activityTags}>{selectedActivities.filter((activity, index, rows) => rows.findIndex(row => row.activity_type === activity.activity_type) === index).map((activity) => {
              const presentation = activityPresentation[activity.activity_type];
              return <View key={activity.id} style={styles.activityTag}><Ionicons name={presentation.icon} size={15} color={mode.accent} /><Text style={styles.activityTagText}>{presentation.label}</Text></View>;
            })}</View> : null}
          </View>
          {selectedState === 'locked' ? <Text style={styles.sheetNote}>Hoàn thành bài trước hoặc bật học tự do trong Cài đặt.</Text> : null}
          </ScrollView>
          <MotionPressable haptic={selectedUnlocked} disabled={!selectedUnlocked} accessibilityLabel={selectedUnlocked ? selectedState === 'completed' ? 'Mở lại bài học' : 'Bắt đầu bài học' : 'Cần hoàn thành bài trước'} style={[styles.sheetAction, !selectedUnlocked && styles.sheetActionDisabled]} onPress={() => { const id = selected.id; closeLessonDetails(); router.push(`/path/lesson/${id}` as Href); }}><Text style={[styles.sheetActionText, !selectedUnlocked && styles.sheetActionTextDisabled]}>{selectedUnlocked ? selectedState === 'completed' ? 'MỞ LẠI BÀI HỌC' : 'BẮT ĐẦU BÀI HỌC' : 'CẦN HOÀN THÀNH BÀI TRƯỚC'}</Text><Ionicons name={selectedUnlocked ? 'arrow-forward' : 'lock-closed'} size={18} color={selectedUnlocked ? '#FFFFFF' : theme.textMuted} /></MotionPressable>
        </StudyTransition> : null}
      </View>
    </Modal>
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  summary: { gap: spacing.sm, paddingVertical: spacing.sm }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }, summaryCount: { color: theme.textPrimary, fontSize: 22, fontWeight: '900' }, summaryHint: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  syllabusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: theme.primarySoft, borderRadius: radius.md }, syllabusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface }, syllabusTitle: { color: theme.primaryText, fontSize: 15, fontWeight: '800' }, syllabusMeta: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' }, syllabusNote: { color: theme.textSecondary, fontSize: 11, lineHeight: 16 },
  nextCard: { backgroundColor: theme.mode === 'dark' ? '#1B4D45' : theme.primaryText, padding: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: 14 }, nextEyebrow: { color: '#DFEDE6', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, nextTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 25, fontWeight: '800' }, nextMeta: { color: '#DFEDE6', fontSize: 12 }, nextArrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF24', alignItems: 'center', justifyContent: 'center' }, loadMessage: { gap: 12, padding: 12 },
  timeline: { gap: 12, paddingTop: 4 }, unitGroup: { padding: 12, borderRadius: radius.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, unitBadge: { minWidth: 40, minHeight: 30, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary }, unitProgress: { color: theme.textSecondary, fontSize: 12, fontWeight: '800' }, mapNodes: { gap: 4 },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingVertical: 12, minHeight: 72, borderRadius: radius.md }, lessonCurrent: { backgroundColor: theme.surfaceSelected }, routeDot: { width: 40, height: 40, borderWidth: 2, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 1 }, routeConnector: { position: 'absolute', width: 2, top: 45, bottom: -18, left: 27, backgroundColor: theme.border }, lessonCopy: { flex: 1, minWidth: 0, gap: 4 }, lessonTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '800', lineHeight: 21 }, status: { color: theme.textMuted, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay }, sheet: { maxHeight: '90%', backgroundColor: theme.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, borderWidth: 1, borderColor: theme.border }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: spacing.xs }, sheetScroll: { flexShrink: 1, minHeight: 0 }, sheetContent: { gap: spacing.md, paddingBottom: spacing.xs }, sheetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, sheetTitle: { color: theme.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: '900' }, closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary }, sheetUnit: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' }, sheetFacts: { flexDirection: 'row', gap: spacing.sm }, fact: { flex: 1, minHeight: 48, backgroundColor: theme.backgroundSecondary, borderRadius: radius.md, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, factText: { color: theme.textPrimary, fontWeight: '800', fontSize: 13 }, sheetActivities: { gap: spacing.xs }, sheetActivitiesTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '800' }, activityTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, activityTag: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.sm }, activityTagText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' }, sheetNote: { color: theme.textSecondary, fontSize: 14, lineHeight: 21 }, sheetAction: { minHeight: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: modeColor(theme), borderRadius: radius.md, paddingHorizontal: spacing.md }, sheetActionDisabled: { backgroundColor: theme.backgroundSecondary }, sheetActionText: { flexShrink: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 }, sheetActionTextDisabled: { color: theme.textMuted },
}); }

function modeColor(theme: ReturnType<typeof useTheme>) { return theme.mode === 'dark' ? '#527CCB' : '#315D42'; }
