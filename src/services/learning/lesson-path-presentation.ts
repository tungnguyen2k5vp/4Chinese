import type { LearningLesson } from '@/db/learning-path';
import { HSK30_COUNTS, HSK30_LEVELS } from '@/services/hsk/hsk30-source';

/** Syllabus item counts, not a claim that old lessons/progress equal syllabus mastery. */
export function hskPathVocabulary(band: string) {
  const index = HSK30_LEVELS.findIndex(level => level === band);
  return index < 0 ? null : {
    added: HSK30_COUNTS.vocabulary[index]!,
    cumulative: HSK30_COUNTS.vocabulary.slice(0, index + 1).reduce((sum, count) => sum + count, 0),
  };
}

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
