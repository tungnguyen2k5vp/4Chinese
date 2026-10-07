import { describe, expect, it } from 'vitest';

import { type CurriculumDefinition, validateCurriculum } from './curriculum-validator';

const references = { vocabularyIds: new Set(['hsk-1-ni']), grammarIds: new Set(['grammar_hsk1_001']),
  sentenceIds: new Set(['sentence_hsk1_001']), storyIds: new Set(['story_hsk1_001']) };
const valid: CurriculumDefinition = { id: 'hsk1-course', title: 'HSK 1', hskBand: '1', units: [{ id: 'hsk1-unit-01', title: 'Chào hỏi', lessons: [
  { id: 'hsk1-lesson-01', title: 'Bạn là ai?', hskBand: '1', prerequisiteLessonIds: [], activities: [
    { id: 'hsk1-lesson-01-vocab', type: 'VOCABULARY', title: 'Từ mới', vocabularyIds: ['hsk-1-ni'], grammarIds: [], sentenceIds: [], storyIds: [] },
  ] },
] }] };

describe('curriculum validator', () => {
  it('accepts stable, referenced, non-empty curriculum content', () => {
    expect(validateCurriculum(valid, references).id).toBe('hsk1-course');
  });
  it('rejects missing content references and circular prerequisites', () => {
    const missing = structuredClone(valid); missing.units[0]!.lessons[0]!.activities[0]!.vocabularyIds = ['missing-word'];
    expect(() => validateCurriculum(missing, references)).toThrow('CURRICULUM_MISSING_VOCABULARY');
    const circular = structuredClone(valid); circular.units[0]!.lessons.push({ ...circular.units[0]!.lessons[0]!, id: 'hsk1-lesson-02', prerequisiteLessonIds: ['hsk1-lesson-01'], activities: [{ ...circular.units[0]!.lessons[0]!.activities[0]!, id: 'hsk1-lesson-02-vocab' }] });
    circular.units[0]!.lessons[0]!.prerequisiteLessonIds = ['hsk1-lesson-02'];
    expect(() => validateCurriculum(circular, references)).toThrow('CURRICULUM_CIRCULAR_PREREQUISITE');
  });
});
