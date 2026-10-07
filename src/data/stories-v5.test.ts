import { describe, expect, it } from 'vitest';

import { getStoryDraftPreview, storiesV5Drafts, validatePublishedStoryPack, validateStoryPreview } from './stories-v5';

describe('V5 unreviewed story previews', () => {
  it('has two original drafts per estimated band, aligned sentences, and 42 grounded questions', () => {
    expect(storiesV5Drafts).toHaveLength(14);
    expect(new Set(storiesV5Drafts.map((s) => s.id)).size).toBe(14);
    expect(new Set(storiesV5Drafts.map((s) => s.title)).size).toBe(14);
    for (const band of ['1', '2', '3', '4', '5', '6', '7-9']) expect(storiesV5Drafts.filter((s) => s.level === band)).toHaveLength(2);
    expect(storiesV5Drafts.flatMap((s) => s.questions)).toHaveLength(42);
    for (const story of storiesV5Drafts) {
      expect(validateStoryPreview(story)).toEqual(story);
      expect(story.review).toEqual({ id: story.id, origin: 'AI_ASSISTED', state: 'DRAFT', revision: 0 });
      expect(story.levelBasis).toBe('EDITORIAL_ESTIMATE_NOT_OFFICIAL');
      expect(story.characters).toEqual(['小明', '小雨']);
      expect(story.sentences.map((s) => s.hanzi).join('')).toContain('小明');
      expect(story.sentences.map((s) => s.hanzi).join('')).toContain('小雨');
      for (const line of story.sentences) {
        expect(line.hanzi).toMatch(/\p{Script=Han}/u);
        expect(line.pinyin).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔù]/u);
        expect(line.translationVi.length).toBeGreaterThan(10);
        expect(line.hanzi).not.toMatch(/TODO|placeholder|lorem/iu);
      }
      for (const q of story.questions) {
        expect(story.sentences[q.evidenceSentence]).toBeDefined();
        expect(q.explanationVi.length).toBeGreaterThan(10);
        expect(q.choices[q.answer]).toBeTruthy();
      }
    }
  });

  it('never treats structural validation or the preview route as publication', () => {
    expect(() => validatePublishedStoryPack(storiesV5Drafts)).toThrow('STORY_PUBLICATION_GATE_REQUIRED');
    const story = getStoryDraftPreview(storiesV5Drafts[0]!.id)!;
    story.review.state = 'PUBLISHED';
    expect(getStoryDraftPreview(story.id)!.review.state).toBe('DRAFT');
    expect(() => validatePublishedStoryPack([story])).toThrow('STORY_PUBLICATION_GATE_REQUIRED');
    expect(getStoryDraftPreview('story-unknown')).toBeNull();
  });

  it('rejects broken alignment, out-of-range evidence, repeated choices and unmatched review IDs', () => {
    const story = storiesV5Drafts[0]!;
    expect(() => validateStoryPreview({ ...story, sentences: [{ ...story.sentences[0], pinyin: '' }] })).toThrow();
    expect(() => validateStoryPreview({ ...story, questions: story.questions.map((q) => ({ ...q, evidenceSentence: 100 })) })).toThrow();
    expect(() => validateStoryPreview({ ...story, questions: story.questions.map((q) => ({ ...q, choices: ['A', 'A', 'B'] })) })).toThrow();
    expect(() => validateStoryPreview({ ...story, review: { ...story.review, id: 'story-different' } })).toThrow();
    expect(() => validateStoryPreview({ ...story, targetWords: ['不存在的目标词'] })).toThrow();
  });
});
