/** Offline, non-mutating diagnostics. No heuristic can verify academic content. */
import { numericPinyinToMarks } from '../pinyin/pinyin';

import {
  auditHskCoverage,
  type AlignmentRow,
  type HskLevel,
  type OfficialVocabularyEntry,
  type VocabularyCandidate,
} from './alignment';

export const AUDIT_LEVELS: readonly HskLevel[] = ['1', '2', '3', '4', '5', '6', '7-9'];
export interface AuditExample {
  id: string;
  chinese: string;
  pinyin: string;
  vietnamese: string;
  vocabularyId?: string;
  vocabularyIds?: readonly string[];
  senseId?: string;
  reviewStatus?: string;
  reviewEvidence?: string;
  reviewedBy?: string;
  sourceType?: string;
}
export interface AuditWord extends VocabularyCandidate {
  traditional: string;
  pinyin: string;
  primaryMeaningVi: string;
  meaningsVi: readonly string[];
  meaningsEn: readonly string[];
  pos: readonly string[];
  translationStatus: string;
  examples: readonly AuditExample[];
  senseId?: string;
}
export interface AuditGrammar {
  id: string;
  title: string;
  pattern: string;
  explanation: string;
  hsk: string;
  answer: string;
  options: readonly string[];
  examples: readonly { hanzi: string; pinyin: string; vi: string; words: readonly string[] }[];
  sourceRef?: string;
  reviewStatus?: string;
  reviewedBy?: string;
  reviewEvidence?: string;
  relatedGrammarIds?: readonly string[];
  prerequisiteIds?: readonly string[];
}
/** Versioned evidence is required; a bare list or public URL is not a license. */
export interface ReferenceMetadata {
  standardId: string;
  version: string;
  sourceUrl: string;
  effectiveDate: string | null;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  reviewEvidence: string | null;
  licenseStatus: 'UNVERIFIED' | 'VERIFIED';
  licenseEvidence: string | null;
}
export interface AuditReference {
  metadata: ReferenceMetadata;
  vocabulary: readonly (OfficialVocabularyEntry & { senseId?: string })[];
  grammar?: readonly { identifier: string; level: HskLevel; pattern: string; sourceRef: string }[];
}
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const normalized = (value: string) => value.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const uniqueSorted = (values: readonly string[]) => [...new Set(values)].sort(compare);
const variants = (value: string) => value.normalize('NFC').split(/\s*(?:\/|\||;|；|、)\s*/u);
const compactMarks = (value: string) => normalized(value).replace(/[\s'’ʼ-]/gu, '');

export function auditPinyin(marked: string, numeric: string) {
  const reasons: string[] = [];
  const numericVariants = variants(numeric);
  const markedVariants = variants(marked);
  let neutralSyllables = 0;
  let erhua = false;
  if (!marked.trim()) reasons.push('MISSING_MARKED_PINYIN');
  if (!numeric.trim()) reasons.push('MISSING_NUMERIC_PINYIN');
  if (/[1-9]/u.test(marked)) reasons.push('NUMERIC_TONE_IN_MARKED_FIELD');
  if (numericVariants.length !== markedVariants.length) reasons.push('READING_COUNT_MISMATCH');
  numericVariants.forEach((reading, index) => {
    const tokens = normalized(reading).replace(/u:/gu, 'ü').replace(/v/gu, 'ü').split(/[\s'’ʼ-]+/u);
    let convertible = true;
    for (const token of tokens) {
      if (token === 'r') { erhua = true; continue; }
      const match = token.match(/^([a-zü]+)([0-5])$/u);
      if (!match) { reasons.push('INVALID_NUMERIC_SYLLABLE'); convertible = false; continue; }
      if (match[2] === '0' || match[2] === '5') neutralSyllables++;
      if (match[1]?.endsWith('r') && match[1] !== 'er') erhua = true;
      if (/^(m|n|ng)$/u.test(match[1] ?? '') && !/[05]/u.test(match[2] ?? '')) {
        reasons.push('SYLLABIC_TONE_NEEDS_REVIEW'); convertible = false;
      }
    }
    const expected = numericPinyinToMarks(tokens.map((token) => token.replace(/0$/u, '5')).join(' '));
    const actual = markedVariants[index];
    if (convertible && actual !== undefined && compactMarks(expected) !== compactMarks(actual)) reasons.push('MARK_NUMERIC_MISMATCH');
  });
  if (marked && !/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ\s'’ʼ/|;；、:-]+$/iu.test(marked.normalize('NFC'))) reasons.push('INVALID_MARKED_CHARACTERS');
  return {
    reasons: uniqueSorted(reasons),
    multipleReadings: numericVariants.length > 1 || markedVariants.length > 1,
    neutralSyllables,
    umlautNotation: /ü|[ǖǘǚǜ]|u:|v/iu.test(`${marked} ${numeric}`),
    erhua,
    // Agreement is not evidence that a lexical reading or tone is correct.
    pronunciationVerified: false as const,
  };
}

export function auditVietnameseMeaning(word: Pick<AuditWord, 'primaryMeaningVi' | 'meaningsVi' | 'meaningsEn' | 'pos' | 'translationStatus'>): string[] {
  const reasons: string[] = [];
  const primary = normalized(word.primaryMeaningVi);
  const meanings = word.meaningsVi.map(normalized);
  if (!primary || !meanings.some(Boolean)) reasons.push('MISSING_VI_MEANING');
  if (word.translationStatus !== 'verified') reasons.push('TRANSLATION_NOT_DECLARED_VERIFIED');
  if (new Set(meanings).size !== meanings.length) reasons.push('DUPLICATE_VI_MEANINGS');
  if (primary && word.meaningsEn.some((meaning) => normalized(meaning) === primary)) reasons.push('VI_IDENTICAL_TO_EN_REVIEW');
  const combined = [word.primaryMeaningVi, ...word.meaningsVi].join(' ');
  if (/\uFFFD|Ã[\x80-\xBF]|Â[\x80-\xBF]|á»|áº/u.test(combined)) reasons.push('POSSIBLE_ENCODING_DAMAGE');
  if (/\[[a-züv :]+[1-5][^\]]*\]|\b(?:CL|classifier|lit|fig)\s*:|~|\b(?:tbd|todo|placeholder)\b/iu.test(combined)) reasons.push('DICTIONARY_ARTIFACT_OR_PLACEHOLDER');
  if (/biến thể|chữ cổ|viết tắt|cũng đọc|variant|also pr\./iu.test(combined)) reasons.push('VARIANT_OR_READING_NOTE_NEEDS_CONTEXT');
  if (!word.pos.length || word.pos.some((pos) => /^[a-z]$/iu.test(pos.trim()))) reasons.push('POS_NEEDS_REVIEW');
  if (meanings.length >= 8 || primary.length > 140) reasons.push('BROAD_OR_LONG_GLOSS_REVIEW');
  return uniqueSorted(reasons);
}

export function auditExample(example: AuditExample): string[] {
  const reasons: string[] = [];
  const text = `${example.chinese} ${example.vietnamese}`;
  if (/我(?:正在|在)?学习[“「"'].*[”」"']?(?:这个)?词|这是.*(?:词的例子|例句)/u.test(example.chinese)
    || /^Tôi (?:đang )?học (?:(?:ý nghĩa|cách dùng) của từ|từ (?:[“「"']|X\b|\p{Script=Han}))/iu.test(example.vietnamese.trim())
    || /^Đây là (?:một )?ví dụ (?:của|cho) từ/iu.test(example.vietnamese.trim())
    || /this is an? example sentence/iu.test(text)) reasons.push('GENERIC_METALINGUISTIC_TEMPLATE');
  if (!example.chinese.trim() || !example.pinyin.trim() || !example.vietnamese.trim()) reasons.push('INCOMPLETE_EXAMPLE');
  if (/\uFFFD/u.test(text)) reasons.push('POSSIBLE_ENCODING_DAMAGE');
  if (/[1-5]/u.test(example.pinyin) || !/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ\s'’ʼ.,!?，。？！:;“”"()\-]+$/iu.test(example.pinyin.normalize('NFC'))) reasons.push('EXAMPLE_PINYIN_NEEDS_REVIEW');
  return uniqueSorted(reasons);
}

export function isReferenceUsable(reference: AuditReference | null): boolean {
  if (!reference) return false;
  const meta = reference.metadata;
  return !!(meta.standardId.trim() && meta.version.trim() && meta.sourceUrl.trim()
    && meta.verificationStatus === 'VERIFIED' && meta.reviewEvidence?.trim()
    && meta.licenseStatus === 'VERIFIED' && meta.licenseEvidence?.trim());
}

const reviewed = (example: AuditExample) => ['REVIEWED', 'VERIFIED', 'PUBLISHED'].includes(example.reviewStatus ?? '')
  && !!example.reviewEvidence?.trim()
  && (example.sourceType !== 'AI_GENERATED' || !!example.reviewedBy?.trim());
const independentReview = (example: AuditExample) => reviewed(example) && !!example.reviewedBy?.trim();
const buckets = () => ({ zero: 0, one: 0, two: 0, threePlus: 0 });
const incrementBucket = (target: ReturnType<typeof buckets>, count: number) => {
  if (count === 0) target.zero++;
  else if (count === 1) target.one++;
  else if (count === 2) target.two++;
  else target.threePlus++;
};
function assertIds(items: readonly { id: string }[], dimension: string) {
  if (items.some((item) => !item.id.trim()) || new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`INVALID_OR_DUPLICATE_${dimension}_ID`);
}

/** Flags observed one-to-many and common contextual merges, never converts text. */
export function auditTraditionalMappings(words: readonly Pick<AuditWord, 'id' | 'simplified' | 'traditional'>[]) {
  const bySimplified = new Map<string, Set<string>>();
  for (const word of words) {
    const key = word.simplified.normalize('NFC').trim();
    const forms = bySimplified.get(key) ?? new Set<string>();
    if (word.traditional.trim()) forms.add(word.traditional.normalize('NFC').trim());
    bySimplified.set(key, forms);
  }
  return [...words].sort((a, b) => compare(a.id, b.id)).map((word) => {
    const reasons: string[] = [];
    if (!word.traditional.trim()) reasons.push('MISSING_TRADITIONAL');
    if (/[/|、;]/u.test(word.traditional)) reasons.push('MULTIPLE_TRADITIONAL_FORMS');
    if ((bySimplified.get(word.simplified.normalize('NFC').trim())?.size ?? 0) > 1) reasons.push('OBSERVED_ONE_TO_MANY_MAPPING');
    if (/[发干后面里台钟复系只斗]/u.test(word.simplified)) reasons.push('CONTEXT_SENSITIVE_CHARACTER_REVIEW');
    return { vocabularyId: word.id, reasons, mappingVerified: false as const };
  });
}

export function auditV5Content(input: {
  words: readonly AuditWord[];
  grammar: readonly AuditGrammar[];
  sharedExamples?: readonly AuditExample[];
  reference?: AuditReference | null;
}) {
  const words = [...input.words].sort((a, b) => compare(a.id, b.id));
  const grammar = [...input.grammar].sort((a, b) => compare(a.id, b.id));
  assertIds(words, 'VOCABULARY');
  assertIds(grammar, 'GRAMMAR');
  if ([...words.map((word) => String(word.hskBand)), ...grammar.map((point) => point.hsk)].some((level) => !AUDIT_LEVELS.includes(level as HskLevel))) throw new Error('INVALID_INTERNAL_HSK_LEVEL');
  const reference = input.reference ?? null;
  const usable = isReferenceUsable(reference);
  const referenceWords = usable && reference ? [...reference.vocabulary].sort((a, b) => compare(a.identifier, b.identifier)) : null;
  // Reuse stable lexical alignment and its duplicate/reference validation.
  const alignment = auditHskCoverage(words, referenceWords);
  const referenceById = new Map(referenceWords?.map((entry) => [entry.identifier, entry]));
  const wordsById = new Map(words.map((word) => [word.id, word]));
  const rows: AlignmentRow[] = alignment.rows.map((row) => {
    const word = row.vocabularyId ? wordsById.get(row.vocabularyId) : undefined;
    const entry = row.officialIdentifier ? referenceById.get(row.officialIdentifier) : undefined;
    return word?.senseId && entry?.senseId && word.senseId !== entry.senseId
      && ['EXACT', 'NORMALIZED_MATCH'].includes(row.status) ? { ...row, status: 'SENSE_CONFLICT' } : row;
  });
  const senseComparable = !!referenceWords && referenceWords.every((entry) => !!entry.senseId)
    && rows.filter((row) => row.vocabularyId && row.officialIdentifier).every((row) => !!wordsById.get(row.vocabularyId!)?.senseId);
  const traditional = new Map(auditTraditionalMappings(words).map((row) => [row.vocabularyId, row]));
  const shared = [...(input.sharedExamples ?? [])].sort((a, b) => compare(a.id, b.id));
  assertIds(shared, 'SHARED_EXAMPLE');
  const danglingExampleLinks: { exampleId: string; vocabularyId: string }[] = [];
  const sharedByWord = new Map<string, AuditExample[]>();
  for (const example of shared) {
    for (const id of uniqueSorted([...(example.vocabularyIds ?? []), ...(example.vocabularyId ? [example.vocabularyId] : [])])) {
      if (!wordsById.has(id)) danglingExampleLinks.push({ exampleId: example.id, vocabularyId: id });
      else sharedByWord.set(id, [...(sharedByWord.get(id) ?? []), example]);
    }
  }
  const spellingGroups = new Map<string, AuditWord[]>();
  for (const word of words) {
    const spelling = normalized(word.simplified);
    spellingGroups.set(spelling, [...(spellingGroups.get(spelling) ?? []), word]);
  }
  const wordRows = words.map((word) => {
    const pinyin = auditPinyin(word.pinyin, word.pinyinNumeric);
    const meaningReasons = auditVietnameseMeaning(word);
    const group = spellingGroups.get(normalized(word.simplified)) ?? [];
    const senseReasons: string[] = [];
    if (!word.senseId) senseReasons.push('NO_EXPLICIT_SENSE_ID');
    if (uniqueSorted(group.map((item) => normalized(item.pinyinNumeric))).length > 1) senseReasons.push('MULTIPLE_LEXICAL_READINGS_PRESERVE');
    if (group.filter((item) => normalized(item.pinyinNumeric) === normalized(word.pinyinNumeric)).length > 1) senseReasons.push('DUPLICATE_LEXEME_NEEDS_REVIEW');
    const examples = [...word.examples, ...(sharedByWord.get(word.id) ?? [])];
    const exampleIdCounts = new Map<string, number>();
    examples.forEach((example) => exampleIdCounts.set(example.id, (exampleIdCounts.get(example.id) ?? 0) + 1));
    const exampleRows = examples.map((example) => {
      const reasons = auditExample(example);
      if (!example.id.trim() || (exampleIdCounts.get(example.id) ?? 0) > 1) reasons.push('DUPLICATE_OR_EMPTY_EXAMPLE_ID');
      if (example.vocabularyId && example.vocabularyId !== word.id) reasons.push('WRONG_VOCABULARY_LINK');
      if (word.senseId && example.senseId && word.senseId !== example.senseId) reasons.push('EXAMPLE_SENSE_CONFLICT');
      return { id: example.id, reasons: uniqueSorted(reasons), declaredReviewed: reviewed(example), independentReview: independentReview(example) };
    }).sort((a, b) => compare(a.id, b.id));
    const reviewedExamples = new Set(exampleRows.filter((example) => example.declaredReviewed && !example.reasons.length).map((example) => example.id)).size;
    const independentlyReviewedExamples = new Set(exampleRows.filter((example) => example.independentReview && !example.reasons.length).map((example) => example.id)).size;
    return {
      vocabularyId: word.id, simplified: word.simplified, level: String(word.hskBand),
      pinyin, meaningReasons, traditionalReasons: traditional.get(word.id)!.reasons,
      senseReasons, translationStatusDeclared: word.translationStatus,
      storedExamples: word.examples.length, linkedSharedExamples: sharedByWord.get(word.id)?.length ?? 0,
      reviewedExamples, independentlyReviewedExamples, examples: exampleRows,
      needsReview: !!(pinyin.reasons.length || meaningReasons.length || traditional.get(word.id)!.reasons.length || senseReasons.length || exampleRows.some((example) => example.reasons.length)),
    };
  });
  const grammarIds = new Set(grammar.map((point) => point.id));
  const spellings = new Set(words.map((word) => word.simplified));
  const grammarReference = usable && reference?.grammar ? [...reference.grammar].sort((a, b) => compare(a.identifier, b.identifier)) : null;
  if (grammarReference) {
    if (!grammarReference.length) throw new Error('EMPTY_GRAMMAR_REFERENCE');
    const ids = new Set<string>();
    const keys = new Set<string>();
    for (const entry of grammarReference) {
      const key = normalized(entry.pattern);
      if (!entry.identifier.trim() || !entry.sourceRef.trim() || !key || !AUDIT_LEVELS.includes(entry.level)) throw new Error('INVALID_GRAMMAR_REFERENCE');
      if (ids.has(entry.identifier) || keys.has(key)) throw new Error('DUPLICATE_GRAMMAR_REFERENCE');
      ids.add(entry.identifier); keys.add(key);
    }
  }
  const usedGrammarRefs = new Set<string>();
  const grammarRows = grammar.map((point) => {
    const reasons: string[] = [];
    if (!point.sourceRef?.trim()) reasons.push('NO_POINT_SOURCE_REFERENCE');
    if (!['REVIEWED', 'VERIFIED', 'PUBLISHED'].includes(point.reviewStatus ?? '') || !point.reviewEvidence || !point.reviewedBy) reasons.push('NO_INDEPENDENT_POINT_REVIEW');
    if (!point.title.trim() || !point.pattern.trim() || !point.explanation.trim()) reasons.push('INCOMPLETE_GRAMMAR_POINT');
    if (!point.options.includes(point.answer) || !point.answer.trim()) reasons.push('MISSING_QUIZ_ANSWER');
    if (new Set(point.options).size !== point.options.length) reasons.push('DUPLICATE_QUIZ_OPTION');
    const missingTokens = uniqueSorted(point.examples.flatMap((example) => example.words.filter((token) => !spellings.has(token))));
    if (missingTokens.length) reasons.push('UNLINKED_EXAMPLE_TOKENS');
    const missingGrammarIds = uniqueSorted([...(point.relatedGrammarIds ?? []), ...(point.prerequisiteIds ?? [])].filter((id) => !grammarIds.has(id)));
    if (missingGrammarIds.length) reasons.push('DANGLING_GRAMMAR_REFERENCE');
    point.examples.forEach((example) => {
      if (auditExample({ id: point.id, chinese: example.hanzi, pinyin: example.pinyin, vietnamese: example.vi }).length) reasons.push('EXAMPLE_QUALITY_REVIEW');
    });
    const entry = grammarReference?.find((item) => normalized(item.pattern) === normalized(point.pattern));
    let status = grammarReference ? 'EXTRA' : 'MISSING_REFERENCE';
    if (entry) {
      status = usedGrammarRefs.has(entry.identifier) ? 'NEEDS_REVIEW' : point.hsk !== entry.level ? 'LEVEL_CONFLICT' : 'COVERED';
      usedGrammarRefs.add(entry.identifier);
    }
    return { grammarId: point.id, level: point.hsk, referenceLevel: entry?.level ?? null, officialIdentifier: entry?.identifier ?? null, status, reasons: uniqueSorted(reasons), missingTokens, missingGrammarIds, reviewStatusDeclared: point.reviewStatus ?? null, independentlyReviewed: !reasons.includes('NO_INDEPENDENT_POINT_REVIEW') };
  });
  const levels = AUDIT_LEVELS.map((level) => {
    const local = wordRows.filter((word) => word.level === level);
    const aligned = rows.filter((row) => row.level === level);
    const count = (status: AlignmentRow['status']) => usable ? aligned.filter((row) => row.status === status).length : null;
    const reviewedBuckets = buckets();
    const independentBuckets = buckets();
    local.forEach((word) => { incrementBucket(reviewedBuckets, word.reviewedExamples); incrementBucket(independentBuckets, word.independentlyReviewedExamples); });
    const points = grammarRows.filter((point) => point.level === level);
    return {
      level, internal: local.length,
      officialExpected: referenceWords ? referenceWords.filter((entry) => entry.level === level).length : null,
      exact: count('EXACT'), normalized: count('NORMALIZED_MATCH'), missing: count('MISSING_REFERENCE'), extra: count('EXTRA'),
      levelConflict: count('LEVEL_CONFLICT'), senseConflict: senseComparable ? count('SENSE_CONFLICT') : null, needsReview: count('NEEDS_REVIEW'),
      internalNeedsReview: local.filter((word) => word.needsReview).length,
      meaning: { suspect: local.filter((word) => word.meaningReasons.length).length, declaredVerified: local.filter((word) => word.translationStatusDeclared === 'verified').length, independentVerification: null },
      pinyin: { flagged: local.filter((word) => word.pinyin.reasons.length).length, neutral: local.filter((word) => word.pinyin.neutralSyllables > 0).length, umlaut: local.filter((word) => word.pinyin.umlautNotation).length, multipleReadings: local.filter((word) => word.pinyin.multipleReadings).length, erhua: local.filter((word) => word.pinyin.erhua).length },
      traditionalNeedsReview: local.filter((word) => word.traditionalReasons.length).length,
      examples: { reviewedBuckets, independentBuckets, stored: local.reduce((sum, word) => sum + word.storedExamples, 0), linkedShared: local.reduce((sum, word) => sum + word.linkedSharedExamples, 0), generic: local.reduce((sum, word) => sum + word.examples.filter((example) => example.reasons.includes('GENERIC_METALINGUISTIC_TEMPLATE')).length, 0) },
      grammar: { internal: points.length, verifiedRequired: grammarReference ? grammarReference.filter((entry) => entry.level === level).length : null,
        covered: grammarReference ? grammarRows.filter((point) => point.referenceLevel === level && point.status === 'COVERED').length : null,
        missing: grammarReference ? grammarReference.filter((entry) => entry.level === level && !usedGrammarRefs.has(entry.identifier)).length : null,
        needsReview: points.filter((point) => point.reasons.length || ['NEEDS_REVIEW', 'LEVEL_CONFLICT'].includes(point.status)).length,
        independentlyReviewed: points.filter((point) => point.independentlyReviewed).length,
        withSourceReference: grammar.filter((point) => point.hsk === level && !!point.sourceRef?.trim()).length },
    };
  });
  const matched = usable ? rows.filter((row) => ['EXACT', 'NORMALIZED_MATCH'].includes(row.status)).length : null;
  return {
    auditVersion: 1, scope: 'BUNDLED_SEEDS_NOT_DEVICE_DATABASE',
    reference: { supplied: !!reference, usable, metadata: reference?.metadata ?? null, senseComparable, coveragePercent: referenceWords && matched !== null ? matched / referenceWords.length * 100 : null },
    totals: { vocabulary: words.length, grammar: grammar.length, sharedExamples: shared.length },
    levels, alignmentRows: rows, wordRows, grammarRows, danglingExampleLinks,
    missingGrammarReferences: grammarReference?.filter((entry) => !usedGrammarRefs.has(entry.identifier)) ?? null,
    limitations: ['Internal counts are not official coverage.', 'No licensed reviewed reference means null, not zero.', 'Pinyin checks syntax/agreement, not lexical pronunciation.', 'Meaning/traditional flags are heuristic review queues, never automatic corrections.', 'Seed-declared REVIEWED sentences are not independent academic verification.', 'No sense ID means unknown sense alignment; no inference from translation strings.', 'Published/AI-generated labels alone are not independent review evidence.'],
  };
}
