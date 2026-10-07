import { describe, expect, it } from 'vitest';

import { getOfflineVocabulary } from '../../db/database';
import { grammarSeed } from '../../db/grammar';

import {
  auditExample, auditPinyin, auditTraditionalMappings, auditV5Content,
  auditVietnameseMeaning, isReferenceUsable,
  type AuditExample, type AuditGrammar, type AuditReference, type AuditWord,
} from './v5-audit';

const word: AuditWord = {
  id: 'hello', simplified: '你好', traditional: '你好', hskBand: 1,
  pinyin: 'nǐ hǎo', pinyinNumeric: 'ni3 hao3', primaryMeaningVi: 'xin chào',
  meaningsVi: ['xin chào'], meaningsEn: ['hello'], pos: ['expression'],
  translationStatus: 'verified', examples: [],
};
const grammar: AuditGrammar = {
  id: 'gram-shi', hsk: '1', title: '是', pattern: 'A + 是 + B', explanation: 'A là B.',
  answer: '是', options: ['是', '在'], examples: [],
};
const reference: AuditReference = {
  metadata: { standardId: 'test-only', version: '1', sourceUrl: 'fixture://reference', effectiveDate: null,
    verificationStatus: 'VERIFIED', reviewEvidence: 'fixture-review', licenseStatus: 'VERIFIED', licenseEvidence: 'fixture-license' },
  vocabulary: [{ identifier: 'ref-hello', simplified: '你好', pinyinNumeric: 'ni3 hao3', level: '1', sourceRef: 'fixture-only' }],
  grammar: [{ identifier: 'ref-shi', level: '1', pattern: 'A + 是 + B', sourceRef: 'fixture-only' }],
};
const example: AuditExample = {
  id: 'ex', chinese: '你好！', pinyin: 'Nǐ hǎo!', vietnamese: 'Xin chào!',
  reviewStatus: 'REVIEWED', reviewEvidence: 'fixture-only',
};
const audit = (words: readonly AuditWord[] = [word], extra: Partial<Parameters<typeof auditV5Content>[0]> = {}) => auditV5Content({ words, grammar: [grammar], ...extra });

describe('V5 evidence-gated content audit', () => {
  it('keeps every comparison count unknown without a licensed reference', () => {
    for (const level of audit().levels) {
      for (const key of ['officialExpected', 'exact', 'normalized', 'missing', 'extra', 'levelConflict', 'senseConflict', 'needsReview'] as const) expect(level[key]).toBeNull();
      expect(level.grammar.verifiedRequired).toBeNull();
      expect(level.grammar.covered).toBeNull();
      expect(level.grammar.missing).toBeNull();
    }
    expect(audit().reference.coveragePercent).toBeNull();
    expect(audit().levels[0]?.internal).toBe(1);
  });
  it('does not accept public availability, metadata labels or license alone as verification', () => {
    for (const metadata of [
      { ...reference.metadata, licenseStatus: 'UNVERIFIED' as const },
      { ...reference.metadata, verificationStatus: 'UNVERIFIED' as const },
      { ...reference.metadata, licenseEvidence: null },
      { ...reference.metadata, reviewEvidence: null },
      { ...reference.metadata, standardId: ' ' },
    ]) {
      expect(isReferenceUsable({ ...reference, metadata })).toBe(false);
      expect(audit([word], { reference: { ...reference, metadata } }).levels[0]?.exact).toBeNull();
    }
  });
  it('reuses exact and normalized alignment without stripping tones', () => {
    expect(audit([word], { reference }).levels[0]?.exact).toBe(1);
    expect(audit([{ ...word, pinyinNumeric: ' NI3  HAO3 ' }], { reference }).levels[0]?.normalized).toBe(1);
    const wrongTone = audit([{ ...word, pinyinNumeric: 'ni2 hao3' }], { reference });
    expect(wrongTone.levels[0]?.missing).toBe(1);
    expect(wrongTone.levels[0]?.extra).toBe(1);
    expect(wrongTone.reference.coveragePercent).toBe(0);
    expect(wrongTone.levels[0]?.senseConflict).toBeNull();
  });
  it('counts level conflicts under required reference level and excludes them from coverage', () => {
    const report = audit([{ ...word, hskBand: 2 }], { reference });
    expect(report.levels[0]?.levelConflict).toBe(1);
    expect(report.levels[1]?.internal).toBe(1);
    expect(report.reference.coveragePercent).toBe(0);
  });
  it('does not award duplicate lexical coverage', () => {
    const report = audit([word, { ...word, id: 'duplicate' }], { reference });
    expect(report.levels[0]?.exact).toBe(1);
    expect(report.levels[0]?.needsReview).toBe(1);
    expect(report.wordRows.every((row) => row.senseReasons.includes('DUPLICATE_LEXEME_NEEDS_REVIEW'))).toBe(true);
  });
  it('only identifies a sense conflict with explicit comparable sense IDs', () => {
    expect(audit([word], { reference }).levels[0]?.senseConflict).toBeNull();
    const sensedReference = { ...reference, vocabulary: reference.vocabulary.map((entry) => ({ ...entry, senseId: 'greeting' })) };
    const report = audit([{ ...word, senseId: 'other' }], { reference: sensedReference });
    expect(report.levels[0]?.senseConflict).toBe(1);
    expect(report.levels[0]?.exact).toBe(0);
    expect(report.reference.coveragePercent).toBe(0);
  });
  it('rejects invalid IDs/levels, empty references and duplicate reference mappings', () => {
    expect(() => audit([word, word])).toThrow('DUPLICATE_VOCABULARY_ID');
    expect(() => audit([{ ...word, hskBand: 9 }])).toThrow('INVALID_INTERNAL_HSK_LEVEL');
    expect(() => audit([word], { reference: { ...reference, vocabulary: [] } })).toThrow('EMPTY_OFFICIAL_REFERENCE');
    expect(() => audit([word], { reference: { ...reference, vocabulary: [...reference.vocabulary, ...reference.vocabulary] } })).toThrow('DUPLICATE_OFFICIAL_MAPPING');
    expect(() => audit([word], { grammar: [grammar, grammar] })).toThrow('DUPLICATE_GRAMMAR_ID');
    expect(() => audit([word], { reference: { ...reference, grammar: [...reference.grammar!, ...reference.grammar!] } })).toThrow('DUPLICATE_GRAMMAR_REFERENCE');
  });
  it('counts 0/1/2/3+ unique reviewed examples with explicit seed evidence', () => {
    const words = [0, 1, 2, 3].map((count) => ({ ...word, id: `word-${count}`, examples: Array.from({ length: count }, (_, i) => ({ ...example, id: `ex-${count}-${i}` })) }));
    const report = audit(words);
    expect(report.levels[0]?.examples.reviewedBuckets).toEqual({ zero: 1, one: 1, two: 1, threePlus: 1 });
    expect(report.levels[0]?.examples.independentBuckets).toEqual({ zero: 4, one: 0, two: 0, threePlus: 0 });
  });
  it('does not infer reviewed examples from translations, missing evidence or AI labels', () => {
    const report = audit([{ ...word, examples: [
      { ...example, id: 'no-status', reviewStatus: undefined },
      { ...example, id: 'no-evidence', reviewEvidence: undefined },
      { ...example, id: 'AI', sourceType: 'AI_GENERATED', reviewStatus: 'VERIFIED' },
      { ...example, id: 'pending', reviewStatus: 'PENDING' },
    ] }]);
    expect(report.wordRows[0]?.reviewedExamples).toBe(0);
  });
  it('deduplicates links, rejects wrong/dangling links and tracks independent review', () => {
    const report = audit([{ ...word, examples: [{ ...example, id: 'wrong', vocabularyId: 'other' }] }], {
      sharedExamples: [{ ...example, vocabularyIds: ['hello', 'hello', 'missing'], reviewedBy: 'reviewer-fixture' }],
    });
    expect(report.wordRows[0]?.reviewedExamples).toBe(1);
    expect(report.wordRows[0]?.independentlyReviewedExamples).toBe(1);
    expect(report.wordRows[0]?.examples.find((row) => row.id === 'wrong')?.reasons).toContain('WRONG_VOCABULARY_LINK');
    expect(report.danglingExampleLinks).toEqual([{ exampleId: 'ex', vocabularyId: 'missing' }]);
  });
  it('rejects generic examples even when marked reviewed', () => {
    for (const text of ['我正在学习“你好”这个词。', '这是这个词的例子。', 'Tôi đang học từ X.', 'Đây là ví dụ của từ X.']) {
      expect(auditExample({ ...example, chinese: text, vietnamese: text })).toContain('GENERIC_METALINGUISTIC_TEMPLATE');
    }
    const report = audit([{ ...word, examples: [{ ...example, vietnamese: 'Tôi đang học từ X.' }] }]);
    expect(report.wordRows[0]?.reviewedExamples).toBe(0);
    expect(report.levels[0]?.examples.generic).toBe(1);
  });
  it('flags duplicate IDs and mismatched example senses', () => {
    const report = audit([{ ...word, senseId: 'greeting', examples: [example, example, { ...example, id: 'sense', senseId: 'other' }] }]);
    expect(report.wordRows[0]?.reviewedExamples).toBe(0);
    expect(report.wordRows[0]?.examples.flatMap((row) => row.reasons)).toContain('DUPLICATE_OR_EMPTY_EXAMPLE_ID');
    expect(report.wordRows[0]?.examples.flatMap((row) => row.reasons)).toContain('EXAMPLE_SENSE_CONFLICT');
  });
  it('checks grammar coverage and does not infer review from lexical alignment', () => {
    const report = audit([word], { reference });
    expect(report.levels[0]?.grammar.covered).toBe(1);
    expect(report.levels[0]?.grammar.independentlyReviewed).toBe(0);
    expect(report.levels[0]?.grammar.needsReview).toBe(1);
    expect(report.grammarRows[0]?.reasons).toContain('NO_POINT_SOURCE_REFERENCE');
    expect(audit([word], { reference, grammar: [] }).levels[0]?.grammar.missing).toBe(1);
  });
  it('does not mistake studying from a time for studying a word template', () => {
    expect(auditExample({ ...example, chinese: '我们从九点到十一点上课。', vietnamese: 'Chúng tôi học từ chín giờ đến mười một giờ.' })).toEqual([]);
    expect(auditExample({ ...example, chinese: '我从九点开始学习。', vietnamese: 'Tôi học từ chín giờ.' })).toEqual([]);
  });
  it('checks dangling grammar prerequisites, quiz options and token links', () => {
    const point = { ...grammar, answer: 'missing', options: ['是', '是'], prerequisiteIds: ['missing'],
      examples: [{ hanzi: '你好！', pinyin: 'Nǐ hǎo!', vi: 'Xin chào!', words: ['你好', '未知'] }] };
    const row = audit([word], { grammar: [point] }).grammarRows[0];
    expect(row?.missingTokens).toEqual(['未知']);
    expect(row?.reasons).toEqual(expect.arrayContaining(['MISSING_QUIZ_ANSWER', 'DUPLICATE_QUIZ_OPTION', 'DANGLING_GRAMMAR_REFERENCE', 'UNLINKED_EXAMPLE_TOKENS']));
  });
  it('is deterministic across input order and never mutates frozen inputs', () => {
    const other = { ...word, id: 'another', hskBand: 2 };
    const before = JSON.stringify([word, other, grammar, reference]);
    Object.freeze(word); Object.freeze(grammar);
    expect(audit([word, other], { reference })).toEqual(audit([other, word], { reference }));
    expect(JSON.stringify([word, other, grammar, reference])).toBe(before);
  });
});

describe('pinyin diagnostics', () => {
  it.each([
    ['nǐ hǎo', 'ni3 hao3'], ['nǚ', 'nv3'], ['nǚ', 'nü3'], ['lǜ', 'lu:4'],
    ['péngyou', 'peng2 you5'], ['péngyou', 'peng2 you0'], ['ma', 'ma5'],
    ['huār', 'hua1 r'], ['huār', 'huar1'], ['ér', 'er2'],
    ['chóng / zhòng', 'chong2 / zhong4'], ["Xī'ān", 'xi1 an1'],
    ['nu\u0308\u030c', 'nv3'],
  ])('accepts notation agreement %s / %s without verifying pronunciation', (marked, numeric) => {
    const result = auditPinyin(marked, numeric);
    expect(result.reasons).toEqual([]);
    expect(result.pronunciationVerified).toBe(false);
  });
  it('keeps tones and ü distinctions; flags invalid and unnumbered syllables', () => {
    expect(auditPinyin('nǔ', 'nv3').reasons).toContain('MARK_NUMERIC_MISMATCH');
    expect(auditPinyin('nǐ', 'ni2').reasons).toContain('MARK_NUMERIC_MISMATCH');
    expect(auditPinyin('ni3', 'ni3').reasons).toContain('NUMERIC_TONE_IN_MARKED_FIELD');
    expect(auditPinyin('nǐ', 'ni6').reasons).toContain('INVALID_NUMERIC_SYLLABLE');
    expect(auditPinyin('ma', 'ma').reasons).toContain('INVALID_NUMERIC_SYLLABLE');
    expect(auditPinyin('chóng', 'chong2 / zhong4').reasons).toContain('READING_COUNT_MISMATCH');
    expect(auditPinyin('ḿ', 'm2').reasons).toContain('SYLLABIC_TONE_NEEDS_REVIEW');
  });
});

describe('Vietnamese and traditional diagnostics', () => {
  it('flags glossary artifacts/duplicates/POS without certifying naturalness', () => {
    const reasons = auditVietnameseMeaning({ ...word, primaryMeaningVi: 'cũng đọc [di4]; ~', meaningsVi: ['nghĩa', 'nghĩa'], pos: ['g'], translationStatus: 'machine' });
    expect(reasons).toEqual(expect.arrayContaining(['DUPLICATE_VI_MEANINGS', 'DICTIONARY_ARTIFACT_OR_PLACEHOLDER', 'VARIANT_OR_READING_NOTE_NEEDS_CONTEXT', 'POS_NEEDS_REVIEW', 'TRANSLATION_NOT_DECLARED_VERIFIED']));
    expect(auditVietnameseMeaning(word)).toEqual([]);
  });
  it('flags English equality for review and does not assume no accents is wrong', () => {
    expect(auditVietnameseMeaning({ ...word, primaryMeaningVi: 'hello' })).toContain('VI_IDENTICAL_TO_EN_REVIEW');
    expect(auditVietnameseMeaning({ ...word, primaryMeaningVi: 'nam', meaningsVi: ['nam'] })).toEqual([]);
  });
  it('reports observed/contextual ambiguities and leaves source forms unchanged', () => {
    const words = [{ id: 'a', simplified: '发', traditional: '發' }, { id: 'b', simplified: '发', traditional: '髮' }];
    const before = JSON.stringify(words);
    expect(auditTraditionalMappings(words)[0]?.reasons).toEqual(['OBSERVED_ONE_TO_MANY_MAPPING', 'CONTEXT_SENSITIVE_CHARACTER_REVIEW']);
    expect(auditTraditionalMappings([{ id: 'c', simplified: '字', traditional: '' }])[0]?.reasons).toEqual(['MISSING_TRADITIONAL']);
    expect(JSON.stringify(words)).toBe(before);
  });
});

describe('actual bundled seeds (read-only)', () => {
  it('accounts for every word/point and keeps all reference quantities unknown', () => {
    const words = getOfflineVocabulary();
    const before = JSON.stringify(words);
    const report = auditV5Content({ words, grammar: grammarSeed });
    expect(report.totals.vocabulary).toBe(words.length);
    expect(report.totals.grammar).toBe(grammarSeed.length);
    expect(report.levels.reduce((sum, level) => sum + level.internal, 0)).toBe(words.length);
    expect(report.levels.reduce((sum, level) => sum + level.grammar.internal, 0)).toBe(grammarSeed.length);
    for (const level of report.levels) {
      expect(Object.values(level.examples.reviewedBuckets).reduce((sum, count) => sum + count, 0)).toBe(level.internal);
      expect(Object.values(level.examples.independentBuckets).reduce((sum, count) => sum + count, 0)).toBe(level.internal);
      expect(level.officialExpected).toBeNull();
      expect(level.grammar.verifiedRequired).toBeNull();
    }
    expect(JSON.stringify(words)).toBe(before);
    expect(report.reference.coveragePercent).toBeNull();
  });
});
