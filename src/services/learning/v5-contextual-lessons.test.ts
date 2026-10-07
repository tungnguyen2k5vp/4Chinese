import { describe, expect, it } from 'vitest';

import { getOfflineVocabulary } from '../../db/database';
import { grammarSeed } from '../../db/grammar';

import {
  createContextualLessonReferenceIndex, groupContextualLessonsByTopic, resolveContextualLessonAvailability,
  resolveContextualSemanticGroups, v5ContextualLessons, validateV5ContextualLessons,
  type ContextualLessonReferenceIndex,
} from './v5-contextual-lessons';

const references = createContextualLessonReferenceIndex({
  vocabulary: getOfflineVocabulary(), grammar: grammarSeed,
  sentences: grammarSeed.flatMap((point) => point.examples.map((_, i) => ({
    id: `sentence-${point.id}-${i + 1}`, grammarIds: [point.id],
    reviewStatus: point.id.startsWith('vn-') ? 'PENDING' : 'REVIEWED',
  }))),
});
const drafts = () => structuredClone([...v5ContextualLessons]);
const replaceIndex = (overrides: Partial<ContextualLessonReferenceIndex>) => ({ ...references, ...overrides });

describe('contextual curriculum draft snapshot', () => {
  it('validates all six original lessons against real stable seed references', () => {
    const parsed = validateV5ContextualLessons(v5ContextualLessons, references);
    expect(parsed).toHaveLength(6);
    expect(['1', '2', '3'].map((band) => parsed.filter((lesson) => lesson.internalHskBand === band).length)).toEqual([2, 2, 2]);
    expect(parsed.every((lesson) => lesson.vocabulary.length >= 8 && lesson.vocabulary.length <= 15)).toBe(true);
    expect(parsed.reduce((sum, lesson) => sum + lesson.dialogue.lines.length, 0)).toBe(24);
    expect(parsed.reduce((sum, lesson) => sum + lesson.practice.length, 0)).toBe(12);
    expect(parsed.every((lesson) => lesson.estimatedMinutes >= 5 && lesson.estimatedMinutes <= 12)).toBe(true);
  });
  it('never promotes resolved references to reviewed/official content', () => {
    for (const lesson of v5ContextualLessons) {
      const result = resolveContextualLessonAvailability(lesson, references);
      expect(result.referencesAvailable).toBe(true);
      expect(result.referencesCompatible).toBe(true);
      expect(result.canPreview).toBe(true);
      expect(result.canStartLearnerLesson).toBe(false);
      expect(result.publicationBlockedReasons).toContain('DRAFT_REQUIRES_INDEPENDENT_REVIEW');
      expect(lesson).toMatchObject({ reviewStatus: 'DRAFT', verificationStatus: 'UNVERIFIED', sourceType: 'AI_GENERATED', reviewer: null });
    }
  });
  it('labels pending shared anchors instead of claiming they reviewed the new dialogue', () => {
    const travel = v5ContextualLessons.find((lesson) => lesson.id.endsWith('travel-experience'))!;
    expect(resolveContextualLessonAvailability(travel, references).pendingSentenceReviewIds).toContain('sentence-vn-shi-de-1');
    expect(travel.dialogue.id).toMatch(/^ctx-v5-/u);
    expect(travel.sentenceIds).not.toContain(travel.dialogue.id);
  });
  it('does not reinterpret old completion or replace old pathway IDs', () => {
    const travel = v5ContextualLessons.find((lesson) => lesson.id.endsWith('travel-experience'))!;
    const oldCompleted = new Set(['hsk-1-words-1', 'hsk-2-grammar-gram-cong-dao', 'hsk-3-skill-reading']);
    const result = resolveContextualLessonAvailability(travel, references, oldCompleted);
    expect(result.prerequisitesMet).toBe(false);
    expect(result.inheritedLegacyCompletion).toBe(false);
    expect(result.unmetPrerequisiteIds).toEqual(['ctx-v5-hsk2-plan-class']);
    expect(resolveContextualLessonAvailability(travel, references, new Set(travel.prerequisiteLessonIds)).prerequisitesMet).toBe(true);
    expect(v5ContextualLessons.every((lesson) => lesson.id.startsWith('ctx-v5-'))).toBe(true);
    expect([...oldCompleted]).toEqual(['hsk-1-words-1', 'hsk-2-grammar-gram-cong-dao', 'hsk-3-skill-reading']);
  });
  it('is immutable and does not mutate its callers or a validated clone', () => {
    const before = JSON.stringify(v5ContextualLessons);
    const vocabularyBefore = JSON.stringify([...references.vocabulary.values()]);
    for (const lesson of v5ContextualLessons) {
      resolveContextualLessonAvailability(lesson, references);
      resolveContextualSemanticGroups(lesson, references);
    }
    const clone = validateV5ContextualLessons(v5ContextualLessons, references);
    clone[0]!.title = 'Only this validated clone changes';
    expect(Object.isFrozen(v5ContextualLessons)).toBe(true);
    expect(Object.isFrozen(v5ContextualLessons[0]!.dialogue.lines)).toBe(true);
    expect(JSON.stringify(v5ContextualLessons)).toBe(before);
    expect(JSON.stringify([...references.vocabulary.values()])).toBe(vocabularyBefore);
  });
});

describe('availability and authored semantic groups', () => {
  it('resolves explicit semantic roles in stable authored order', () => {
    const lesson = v5ContextualLessons[0]!;
    const groups = resolveContextualSemanticGroups(lesson, references);
    expect(groups.map((group) => group.titleVi)).toEqual(['Người và quan hệ', 'Chào và giới thiệu', 'Bối cảnh học tập']);
    expect(groups[0]!.words.map((word) => word.binding?.simplified)).toEqual(['我', '你', '学生', '老师', '朋友']);
    expect(groups.flatMap((group) => group.words).every((word) => word.available)).toBe(true);
    expect(groupContextualLessonsByTopic().get('food')?.map((item) => item.id)).toEqual(['ctx-v5-hsk1-offer-drink']);
  });
  it.each(['vocabulary', 'grammar', 'sentences'] as const)('reports absent %s without falling back to spelling lookup', (dimension) => {
    const lesson = v5ContextualLessons[0]!;
    const index = replaceIndex({ [dimension]: new Map() });
    const result = resolveContextualLessonAvailability(lesson, index);
    expect(result.referencesAvailable).toBe(false);
    expect(result.canPreview).toBe(false);
    expect(() => validateV5ContextualLessons(v5ContextualLessons, index)).toThrow('CONTEXTUAL_MISSING_REFERENCE');
  });
  it('treats explicitly inactive rows as unavailable', () => {
    const lesson = v5ContextualLessons[0]!;
    const id = lesson.vocabulary[0]!.vocabularyId;
    const words = new Map(references.vocabulary);
    words.set(id, { ...words.get(id)!, active: false });
    const index = replaceIndex({ vocabulary: words });
    expect(resolveContextualLessonAvailability(lesson, index).missingVocabularyIds).toEqual([id]);
    expect(resolveContextualSemanticGroups(lesson, index)[0]!.words[0]?.available).toBe(false);
  });
  it('reports reading/spelling/level conflicts and keeps the original ID', () => {
    const lesson = v5ContextualLessons[0]!;
    const id = lesson.vocabulary[0]!.vocabularyId;
    const words = new Map(references.vocabulary);
    words.set(id, { ...words.get(id)!, pinyinNumeric: 'wo2', simplified: '他', hskBand: 4 });
    const index = replaceIndex({ vocabulary: words });
    expect(resolveContextualLessonAvailability(lesson, index).lexicalConflicts).toEqual([{ vocabularyId: id, reasons: ['SPELLING_MISMATCH', 'READING_MISMATCH', 'WORD_ABOVE_INTERNAL_LEVEL'] }]);
    expect(resolveContextualSemanticGroups(lesson, index)[0]!.words[0]?.available).toBe(false);
    expect(() => validateV5ContextualLessons(v5ContextualLessons, index)).toThrow('CONTEXTUAL_REFERENCE_CONFLICT');
    expect(lesson.vocabulary[0]?.vocabularyId).toBe(id);
  });
  it('compares neutral notation without ignoring actual tones', () => {
    const lesson = v5ContextualLessons[0]!;
    const id = lesson.vocabulary.find((word) => word.simplified === '朋友')!.vocabularyId;
    const words = new Map(references.vocabulary);
    words.set(id, { ...words.get(id)!, pinyinNumeric: ' peng2  you0 ' });
    expect(resolveContextualLessonAvailability(lesson, replaceIndex({ vocabulary: words })).lexicalConflicts).toEqual([]);
  });
  it('rejects a sentence attached to the wrong grammar or a higher-level grammar', () => {
    const lesson = v5ContextualLessons[0]!;
    const sentenceId = lesson.sentenceIds[0]!;
    const sentences = new Map(references.sentences);
    sentences.set(sentenceId, { ...sentences.get(sentenceId)!, grammarIds: ['gram-bi'] });
    expect(resolveContextualLessonAvailability(lesson, replaceIndex({ sentences })).sentenceLinkConflicts).toEqual([sentenceId]);
    const grammar = new Map(references.grammar);
    grammar.set(lesson.grammarIds[0]!, { id: lesson.grammarIds[0]!, hsk: '3' });
    expect(resolveContextualLessonAvailability(lesson, replaceIndex({ grammar })).grammarLevelConflicts).toEqual([lesson.grammarIds[0]]);
  });
  it('rejects duplicate IDs when building a reference index', () => {
    const word = [...references.vocabulary.values()][0]!;
    expect(() => createContextualLessonReferenceIndex({ vocabulary: [word, word], grammar: [], sentences: [] })).toThrow('CONTEXTUAL_INVALID_OR_DUPLICATE_VOCABULARY_ID');
  });
});

describe('strict contextual validation', () => {
  it('rejects fewer than eight or more than fifteen target words', () => {
    const tooFew = drafts(); tooFew[0]!.vocabulary = tooFew[0]!.vocabulary.slice(0, 7);
    const tooMany = drafts(); tooMany[0]!.vocabulary.push(...tooMany[0]!.vocabulary.slice(0, 6));
    expect(() => validateV5ContextualLessons(tooFew, references)).toThrow();
    expect(() => validateV5ContextualLessons(tooMany, references)).toThrow();
  });
  it('rejects misleading metadata, unknown keys, old IDs and invalid minute limits', () => {
    for (const fields of [{ reviewStatus: 'REVIEWED' }, { verificationStatus: 'VERIFIED' }, { official: true }, { id: 'hsk-1-words-1' }, { estimatedMinutes: 13 }]) {
      const input = drafts(); Object.assign(input[0]!, fields);
      expect(() => validateV5ContextualLessons(input, references)).toThrow();
    }
  });
  it('rejects duplicate owned IDs and duplicate word/reference links', () => {
    const duplicateLesson = drafts(); duplicateLesson.push(structuredClone(duplicateLesson[0]!));
    expect(() => validateV5ContextualLessons(duplicateLesson, references)).toThrow('CONTEXTUAL_DUPLICATE_CONTENT_ID');
    const duplicateWord = drafts(); duplicateWord[0]!.vocabulary[1] = duplicateWord[0]!.vocabulary[0]!;
    expect(() => validateV5ContextualLessons(duplicateWord, references)).toThrow('CONTEXTUAL_DUPLICATE_VOCABULARY_LINK');
    const duplicateGrammar = drafts(); duplicateGrammar[0]!.grammarIds[1] = duplicateGrammar[0]!.grammarIds[0]!;
    expect(() => validateV5ContextualLessons(duplicateGrammar, references)).toThrow('CONTEXTUAL_DUPLICATE_GRAMMAR_LINK');
  });
  it('requires exhaustive disjoint semantic groups', () => {
    const missing = drafts(); missing[0]!.semanticGroups[0]!.vocabularyIds.pop();
    expect(() => validateV5ContextualLessons(missing, references)).toThrow('CONTEXTUAL_INCOMPLETE_SEMANTIC_GROUPS');
    const duplicate = drafts(); duplicate[0]!.semanticGroups[1]!.vocabularyIds.push(duplicate[0]!.semanticGroups[0]!.vocabularyIds[0]!);
    expect(() => validateV5ContextualLessons(duplicate, references)).toThrow('CONTEXTUAL_DUPLICATE_SEMANTIC_LINK');
  });
  it('rejects missing targets, invalid dialogue speakers and words not present', () => {
    const speaker = drafts(); speaker[0]!.dialogue.lines[0]!.speaker = 'Unknown';
    expect(() => validateV5ContextualLessons(speaker, references)).toThrow('CONTEXTUAL_UNKNOWN_SPEAKER');
    const wrongWord = drafts(); wrongWord[0]!.dialogue.lines[0]!.vocabularyIds.push(wrongWord[0]!.vocabulary.find((word) => word.simplified === '朋友')!.vocabularyId);
    expect(() => validateV5ContextualLessons(wrongWord, references)).toThrow('CONTEXTUAL_DIALOGUE_WORD_NOT_PRESENT');
    const unused = drafts(); const id = unused[0]!.vocabulary.find((word) => word.simplified === '朋友')!.vocabularyId;
    unused[0]!.dialogue.lines.forEach((line) => { line.vocabularyIds = line.vocabularyIds.filter((value) => value !== id); });
    expect(() => validateV5ContextualLessons(unused, references)).toThrow('CONTEXTUAL_WORD_UNUSED_IN_CONTEXT');
  });
  it('rejects an invalid activity link, duration mismatch and missing required skill', () => {
    const link = drafts(); link[0]!.activities[0]!.vocabularyIds.push('missing-word');
    expect(() => validateV5ContextualLessons(link, references)).toThrow('CONTEXTUAL_INVALID_ACTIVITY_VOCABULARY_LINK');
    const duration = drafts(); duration[0]!.estimatedMinutes++;
    expect(() => validateV5ContextualLessons(duration, references)).toThrow('CONTEXTUAL_DURATION_MISMATCH');
    const missing = drafts(); missing[0]!.activities = missing[0]!.activities.filter((activity) => activity.type !== 'GRAMMAR');
    expect(() => validateV5ContextualLessons(missing, references)).toThrow('CONTEXTUAL_MISSING_REQUIRED_ACTIVITY');
    const target = drafts(); target[0]!.activities[0]!.vocabularyIds = [];
    expect(() => validateV5ContextualLessons(target, references)).toThrow('CONTEXTUAL_ACTIVITY_MISSING_TARGET');
  });
  it('rejects duplicate options, missing answers and goals without assessment', () => {
    const duplicate = drafts(); duplicate[0]!.practice[0]!.options[1] = duplicate[0]!.practice[0]!.options[0]!;
    expect(() => validateV5ContextualLessons(duplicate, references)).toThrow('CONTEXTUAL_DUPLICATE_PRACTICE_OPTION');
    const answer = drafts(); answer[0]!.practice[0]!.answer = 'not an option';
    expect(() => validateV5ContextualLessons(answer, references)).toThrow('CONTEXTUAL_PRACTICE_MISSING_ANSWER');
    const goal = drafts(); goal[0]!.practice[1]!.goalIds = [goal[0]!.goals[0]!.id];
    expect(() => validateV5ContextualLessons(goal, references)).toThrow('CONTEXTUAL_UNASSESSED_GOAL');
    const practice = drafts(); practice[0]!.activities.find((activity) => activity.type === 'PRACTICE')!.practiceIds.pop();
    expect(() => validateV5ContextualLessons(practice, references)).toThrow('CONTEXTUAL_UNSCHEDULED_PRACTICE');
  });
  it('reuses existing graph validation to reject missing/circular prerequisites', () => {
    const missing = drafts(); missing[0]!.prerequisiteLessonIds = ['ctx-v5-missing'];
    expect(() => validateV5ContextualLessons(missing, references)).toThrow('CONTEXTUAL_INVALID_PREREQUISITE_LINK');
    const circular = drafts(); circular[0]!.prerequisiteLessonIds = [circular[1]!.id]; circular[1]!.prerequisiteLessonIds = [circular[0]!.id];
    expect(() => validateV5ContextualLessons(circular, references)).toThrow('CURRICULUM_CIRCULAR_PREREQUISITE');
  });
});
