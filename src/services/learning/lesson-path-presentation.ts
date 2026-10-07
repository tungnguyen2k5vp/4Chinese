import type { LearningLesson } from '@/db/learning-path';

export type LessonNodeState = 'locked' | 'available' | 'current' | 'completed';
export type LessonUnitGroup = { title: string; lessons: { lesson: LearningLesson; courseIndex: number }[] };

/** Presentation only: unlock truth remains owned by isLessonUnlocked and persisted status. */
export function lessonNodeState(lesson: LearningLesson, unlocked: boolean): LessonNodeState {
  if (lesson.status === 'COMPLETED') return 'completed';
  if (!unlocked) return 'locked';
  return lesson.status === 'IN_PROGRESS' ? 'current' : 'available';
}

/** Group only by persisted unit title, keeping the course sequence and original IDs untouched. */
export function groupLessonsByUnit(lessons: LearningLesson[]): LessonUnitGroup[] {
  const groups: LessonUnitGroup[] = [];
  lessons.forEach((lesson, courseIndex) => {
    let group = groups[groups.length - 1];
    if (!group || group.title !== lesson.unit_title) {
      group = { title: lesson.unit_title, lessons: [] };
      groups.push(group);
    }
    group.lessons.push({ lesson, courseIndex });
  });
  return groups;
}
