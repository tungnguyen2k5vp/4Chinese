import { describe, expect, it } from 'vitest';

import { groupLessonsByUnit, hskPathVocabulary, lessonNodeState } from './lesson-path-presentation';

import type { LearningLesson } from '@/db/learning-path';

function lesson(id: string, unit_title: string, status: LearningLesson['status'] = null): LearningLesson {
  return { id, course_id: 'course-1', unit_title, title: id, estimated_minutes: 8, xp_reward: 10, status, sort_order: 0 };
}

describe('learning path presentation', () => {
  it('separates new and cumulative syllabus items across HSK 1–6 and the combined 7–9 band', () => {
    expect(['1', '2', '3', '4', '5', '6', '7-9'].map(hskPathVocabulary)).toEqual([
      { added: 300, cumulative: 300 }, { added: 200, cumulative: 500 },
      { added: 500, cumulative: 1000 }, { added: 1000, cumulative: 2000 },
      { added: 1600, cumulative: 3600 }, { added: 1800, cumulative: 5400 },
      { added: 5600, cumulative: 11000 },
    ]);
    expect(hskPathVocabulary('7')).toBeNull();
  });
  it('shows persisted progress and unlock availability as distinct node states', () => {
    expect(lessonNodeState(lesson('done', 'Unit', 'COMPLETED'), true)).toBe('completed');
    expect(lessonNodeState(lesson('active', 'Unit', 'IN_PROGRESS'), true)).toBe('current');
    expect(lessonNodeState(lesson('next', 'Unit'), true)).toBe('available');
    expect(lessonNodeState(lesson('locked', 'Unit'), false)).toBe('locked');
  });

  it('groups only by stored unit title and preserves course order/indexes', () => {
    const groups = groupLessonsByUnit([lesson('one', 'Nền tảng'), lesson('two', 'Nền tảng'), lesson('three', 'Ngữ pháp')]);
    expect(groups.map((group) => [group.title, group.lessons.map(({ lesson: item, courseIndex }) => [item.id, courseIndex])])).toEqual([
      ['Nền tảng', [['one', 0], ['two', 1]]],
      ['Ngữ pháp', [['three', 2]]],
    ]);
  });
});
