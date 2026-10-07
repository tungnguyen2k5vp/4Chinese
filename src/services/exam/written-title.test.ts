import { describe,expect,it } from 'vitest';

import { writtenSnapshotTitle } from './written-practice';

import { writtenExercises } from '@/data/written-practice';

describe('stored written titles',()=>{
  it('uses the immutable snapshot for a timed/custom variant instead of a current bank lookup',()=>{
    const exercise={...writtenExercises[0]!,id:'saved-timed-variant',title:'Tiêu đề đã lưu'};
    expect(writtenSnapshotTitle(JSON.stringify(exercise))).toBe('Tiêu đề đã lưu');
  });
  it('does not crash the history on a corrupt legacy snapshot',()=>{
    expect(writtenSnapshotTitle('{bad')).toBe('Bài đã lưu');
    expect(writtenSnapshotTitle('{}')).toBe('Bài đã lưu');
  });
});
