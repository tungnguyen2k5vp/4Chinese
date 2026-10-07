import { describe, expect, it } from 'vitest';

import { groupLessonsByUnit, lessonNodeState } from './lesson-path-presentation';

import type { LearningLesson } from '@/db/learning-path';

function lesson(id: string, unit_title: string, status: LearningLesson['status'] = null): LearningLesson {
  return { id, course_id: 'course-1', unit_title, title: id, estimated_minutes: 8, xp_reward: 10, status, sort_order: 0 };
}

describe('learning path presentation', () => {
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
