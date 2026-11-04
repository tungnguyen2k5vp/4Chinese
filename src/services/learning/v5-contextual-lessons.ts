import { z } from 'zod';

import { validateCurriculum } from '../content/curriculum-validator';
import { numericPinyinToMarks } from '../pinyin/pinyin';

import type { VocabularyTopicId } from './vocabulary-topics';

const stableId = z.string().regex(/^[a-z][a-z0-9_-]{2,100}$/u);
const ownedId = stableId.regex(/^ctx-v5-/u);
const text = z.string().trim().min(1).max(1000);
const ids = z.array(stableId);
const localIds = z.array(ownedId);
const wordSchema = z.object({
  vocabularyId: stableId, simplified: text, expectedPinyinNumeric: text,
  intendedUsageVi: text,
}).strict();
const activitySchema = z.object({
  id: ownedId, type: z.enum(['VOCABULARY', 'GRAMMAR', 'CONTEXT', 'LISTENING', 'SPEAKING', 'PRACTICE']),
  minutes: z.number().int().min(1).max(5), promptVi: text, goalIds: localIds.min(1),
  vocabularyIds: ids, grammarIds: ids, sentenceIds: ids, dialogueLineIds: localIds, practiceIds: localIds,
}).strict();
const lessonSchema = z.object({
  id: ownedId, title: text, topicId: z.enum(['people', 'food', 'school-work', 'places-travel', 'time-numbers', 'health-body', 'nature', 'actions', 'communication']),
  internalHskBand: z.enum(['1', '2', '3']), estimatedMinutes: z.number().int().min(5).max(12),
  contentVersion: z.literal(1), reviewStatus: z.literal('DRAFT'), verificationStatus: z.literal('UNVERIFIED'),
  sourceType: z.literal('AI_GENERATED'), source: z.literal('4Chinese original V5 contextual draft'), reviewer: z.null(),
  reviewNotesVi: z.array(text).min(1), prerequisiteLessonIds: localIds,
  goals: z.array(z.object({ id: ownedId, descriptionVi: text }).strict()).min(2).max(4),
  vocabulary: z.array(wordSchema).min(8).max(15), grammarIds: ids.min(1).max(2), sentenceIds: ids.min(1),
  semanticGroups: z.array(z.object({ id: ownedId, titleVi: text, vocabularyIds: ids.min(1) }).strict()).min(2),
  dialogue: z.object({ id: ownedId, settingVi: text, participants: z.array(text).min(2).max(4),
    audioSource: z.literal('SYSTEM_TTS'), lines: z.array(z.object({ id: ownedId, speaker: text, chinese: text, pinyin: text, vietnamese: text, vocabularyIds: ids }).strict()).min(2).max(8),
  }).strict(),
  practice: z.array(z.object({ id: ownedId, promptVi: text, options: z.array(text).min(2).max(4), answer: text,
    explanationVi: text, vocabularyIds: ids, grammarIds: ids, goalIds: localIds.min(1) }).strict()).min(2).max(5),
  activities: z.array(activitySchema).min(4).max(7),
}).strict();

export type V5ContextualLesson = z.infer<typeof lessonSchema>;
export type ContextualVocabularyReference = {
  id: string; simplified: string; pinyinNumeric: string; hskBand: string | number; active?: boolean;
};
export type ContextualGrammarReference = { id: string; hsk: string; active?: boolean };
export type ContextualSentenceReference = { id: string; grammarIds: readonly string[]; active?: boolean; reviewStatus?: string };
export interface ContextualLessonReferenceIndex {
  vocabulary: ReadonlyMap<string, ContextualVocabularyReference>;
  grammar: ReadonlyMap<string, ContextualGrammarReference>;
  sentences: ReadonlyMap<string, ContextualSentenceReference>;
}

function indexById<T extends { id: string }>(entries: readonly T[], kind: string): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const entry of entries) {
    if (!stableId.safeParse(entry.id).success || map.has(entry.id)) throw new Error(`CONTEXTUAL_INVALID_OR_DUPLICATE_${kind}_ID:${entry.id}`);
    map.set(entry.id, entry);
  }
  return map;
}

/** Supply seed snapshots or active local rows; this module never imports the DB/corpus. */
export function createContextualLessonReferenceIndex(input: {
  vocabulary: readonly ContextualVocabularyReference[];
  grammar: readonly ContextualGrammarReference[];
  sentences: readonly ContextualSentenceReference[];
}): ContextualLessonReferenceIndex {
  return {
    vocabulary: indexById(input.vocabulary, 'VOCABULARY'),
    grammar: indexById(input.grammar, 'GRAMMAR'),
    sentences: indexById(input.sentences, 'SENTENCE'),
  };
}

// Convert only to compare notation; never substitute a word ID or ignore a tone.
const readingKey = (value: string) => numericPinyinToMarks(value.normalize('NFC').trim().toLowerCase().replace(/0(?=$|\s)/gu, '5')).replace(/[\s'’]/gu, '');
const isActive = (entry: { active?: boolean } | undefined) => !!entry && entry.active !== false;

/** Availability means reference resolution, not publication, mastery or official readiness. */
export function resolveContextualLessonAvailability(
  lesson: V5ContextualLesson,
  index: ContextualLessonReferenceIndex,
  completedLessonIds: ReadonlySet<string> = new Set(),
) {
  const missingVocabularyIds = lesson.vocabulary.filter((word) => !isActive(index.vocabulary.get(word.vocabularyId))).map((word) => word.vocabularyId);
  const missingGrammarIds = lesson.grammarIds.filter((id) => !isActive(index.grammar.get(id)));
  const missingSentenceIds = lesson.sentenceIds.filter((id) => !isActive(index.sentences.get(id)));
  const lexicalConflicts = lesson.vocabulary.flatMap((word) => {
    const actual = index.vocabulary.get(word.vocabularyId);
    if (!actual) return [];
    const reasons: string[] = [];
    if (actual.simplified !== word.simplified) reasons.push('SPELLING_MISMATCH');
    if (readingKey(actual.pinyinNumeric) !== readingKey(word.expectedPinyinNumeric)) reasons.push('READING_MISMATCH');
    if (!['1', '2', '3'].includes(String(actual.hskBand)) || Number(actual.hskBand) > Number(lesson.internalHskBand)) reasons.push('WORD_ABOVE_INTERNAL_LEVEL');
    return reasons.length ? [{ vocabularyId: word.vocabularyId, reasons }] : [];
  });
  const grammarLevelConflicts = lesson.grammarIds.filter((id) => {
    const actual = index.grammar.get(id);
    return actual && (!['1', '2', '3'].includes(actual.hsk) || Number(actual.hsk) > Number(lesson.internalHskBand));
  });
  const sentenceLinkConflicts = lesson.sentenceIds.filter((id) => {
    const actual = index.sentences.get(id);
    return actual && !actual.grammarIds.some((grammarId) => lesson.grammarIds.includes(grammarId));
  });
  const pendingSentenceReviewIds = lesson.sentenceIds.filter((id) => index.sentences.get(id)?.reviewStatus !== 'REVIEWED');
  const unmetPrerequisiteIds = lesson.prerequisiteLessonIds.filter((id) => !completedLessonIds.has(id));
  const referencesAvailable = !missingVocabularyIds.length && !missingGrammarIds.length && !missingSentenceIds.length;
  const referencesCompatible = referencesAvailable && !lexicalConflicts.length && !grammarLevelConflicts.length && !sentenceLinkConflicts.length;
  return {
    lessonId: lesson.id, reviewStatus: lesson.reviewStatus, referencesAvailable, referencesCompatible,
    missingVocabularyIds, missingGrammarIds, missingSentenceIds, lexicalConflicts, grammarLevelConflicts,
    sentenceLinkConflicts, pendingSentenceReviewIds, unmetPrerequisiteIds,
    prerequisitesMet: unmetPrerequisiteIds.length === 0,
    canPreview: referencesCompatible,
    canStartLearnerLesson: false as const,
    publicationBlockedReasons: ['DRAFT_REQUIRES_INDEPENDENT_REVIEW', ...(referencesCompatible ? [] : ['REFERENCE_RESOLUTION_FAILED'])],
    // Old bucket/skill completion is never reinterpreted as contextual completion.
    inheritedLegacyCompletion: false as const,
  };
}

/** Curated semantic roles inside a lesson; no meaning-regex/similarity inference. */
export function resolveContextualSemanticGroups(lesson: V5ContextualLesson, index: ContextualLessonReferenceIndex) {
  const bindings = new Map(lesson.vocabulary.map((word) => [word.vocabularyId, word]));
  return lesson.semanticGroups.map((group) => ({
    id: group.id, titleVi: group.titleVi,
    words: group.vocabularyIds.map((id) => ({
      binding: bindings.get(id) ?? null, reference: index.vocabulary.get(id) ?? null,
      available: isActive(index.vocabulary.get(id)) && !!bindings.get(id)
        && index.vocabulary.get(id)!.simplified === bindings.get(id)!.simplified
        && readingKey(index.vocabulary.get(id)!.pinyinNumeric) === readingKey(bindings.get(id)!.expectedPinyinNumeric)
        && ['1', '2', '3'].includes(String(index.vocabulary.get(id)!.hskBand))
        && Number(index.vocabulary.get(id)!.hskBand) <= Number(lesson.internalHskBand),
    })),
  }));
}

export function groupContextualLessonsByTopic(lessons: readonly V5ContextualLesson[] = v5ContextualLessons): ReadonlyMap<VocabularyTopicId, readonly V5ContextualLesson[]> {
  const groups = new Map<VocabularyTopicId, V5ContextualLesson[]>();
  for (const lesson of lessons) groups.set(lesson.topicId, [...(groups.get(lesson.topicId) ?? []), lesson]);
  return groups;
}

function assertUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`CONTEXTUAL_DUPLICATE_${label}`);
}
function assertSubset(values: readonly string[], allowed: ReadonlySet<string>, label: string) {
  if (values.some((id) => !allowed.has(id))) throw new Error(`CONTEXTUAL_INVALID_${label}_LINK`);
}

/** Parse untrusted input strictly, reject broken requirements, then reuse graph validation. */
export function validateV5ContextualLessons(input: unknown, index: ContextualLessonReferenceIndex): V5ContextualLesson[] {
  const lessons = z.array(lessonSchema).min(1).parse(input);
  const ownedIds = lessons.flatMap((lesson) => [lesson.id, lesson.dialogue.id, ...lesson.goals.map((goal) => goal.id),
    ...lesson.semanticGroups.map((group) => group.id), ...lesson.dialogue.lines.map((line) => line.id),
    ...lesson.practice.map((item) => item.id), ...lesson.activities.map((activity) => activity.id)]);
  assertUnique(ownedIds, 'CONTENT_ID');
  const allLessonIds = new Set(lessons.map((lesson) => lesson.id));
  for (const lesson of lessons) {
    const vocabularyIds = lesson.vocabulary.map((word) => word.vocabularyId);
    const vocabularySet = new Set(vocabularyIds);
    const grammarSet = new Set(lesson.grammarIds);
    const sentenceSet = new Set(lesson.sentenceIds);
    const goalSet = new Set(lesson.goals.map((goal) => goal.id));
    const lineSet = new Set(lesson.dialogue.lines.map((line) => line.id));
    const practiceSet = new Set(lesson.practice.map((item) => item.id));
    assertUnique(vocabularyIds, 'VOCABULARY_LINK');
    assertUnique(lesson.grammarIds, 'GRAMMAR_LINK');
    assertUnique(lesson.sentenceIds, 'SENTENCE_LINK');
    assertUnique(lesson.prerequisiteLessonIds, 'PREREQUISITE_LINK');
    assertSubset(lesson.prerequisiteLessonIds, allLessonIds, 'PREREQUISITE');
    const availability = resolveContextualLessonAvailability(lesson, index);
    if (!availability.referencesAvailable) throw new Error(`CONTEXTUAL_MISSING_REFERENCE:${lesson.id}`);
    if (!availability.referencesCompatible) throw new Error(`CONTEXTUAL_REFERENCE_CONFLICT:${lesson.id}`);
    const semanticIds = lesson.semanticGroups.flatMap((group) => group.vocabularyIds);
    assertUnique(semanticIds, 'SEMANTIC_LINK');
    assertSubset(semanticIds, vocabularySet, 'SEMANTIC');
    if (semanticIds.length !== vocabularyIds.length) throw new Error(`CONTEXTUAL_INCOMPLETE_SEMANTIC_GROUPS:${lesson.id}`);
    assertUnique(lesson.dialogue.participants, 'PARTICIPANT');
    for (const line of lesson.dialogue.lines) {
      if (!lesson.dialogue.participants.includes(line.speaker)) throw new Error('CONTEXTUAL_UNKNOWN_SPEAKER');
      assertUnique(line.vocabularyIds, 'DIALOGUE_VOCABULARY');
      assertSubset(line.vocabularyIds, vocabularySet, 'DIALOGUE_VOCABULARY');
      for (const id of line.vocabularyIds) {
        const word = lesson.vocabulary.find((item) => item.vocabularyId === id)!;
        if (!line.chinese.includes(word.simplified)) throw new Error('CONTEXTUAL_DIALOGUE_WORD_NOT_PRESENT');
      }
    }
    const usedWords = new Set(lesson.dialogue.lines.flatMap((line) => line.vocabularyIds));
    if (vocabularyIds.some((id) => !usedWords.has(id))) throw new Error(`CONTEXTUAL_WORD_UNUSED_IN_CONTEXT:${lesson.id}`);
    for (const item of lesson.practice) {
      assertUnique(item.options, 'PRACTICE_OPTION');
      if (!item.options.includes(item.answer)) throw new Error('CONTEXTUAL_PRACTICE_MISSING_ANSWER');
      if (!item.vocabularyIds.length && !item.grammarIds.length) throw new Error('CONTEXTUAL_UNTARGETED_PRACTICE');
      assertUnique(item.vocabularyIds, 'PRACTICE_VOCABULARY');
      assertUnique(item.grammarIds, 'PRACTICE_GRAMMAR');
      assertUnique(item.goalIds, 'PRACTICE_GOAL');
      assertSubset(item.vocabularyIds, vocabularySet, 'PRACTICE_VOCABULARY');
      assertSubset(item.grammarIds, grammarSet, 'PRACTICE_GRAMMAR');
      assertSubset(item.goalIds, goalSet, 'PRACTICE_GOAL');
    }
    const types = new Set(lesson.activities.map((activity) => activity.type));
    if (['VOCABULARY', 'GRAMMAR', 'CONTEXT', 'PRACTICE'].some((type) => !types.has(type as typeof activitySchema._output.type))) throw new Error('CONTEXTUAL_MISSING_REQUIRED_ACTIVITY');
    if (!types.has('LISTENING') && !types.has('SPEAKING')) throw new Error('CONTEXTUAL_MISSING_COMMUNICATION_ACTIVITY');
    if (lesson.activities.reduce((sum, activity) => sum + activity.minutes, 0) !== lesson.estimatedMinutes) throw new Error('CONTEXTUAL_DURATION_MISMATCH');
    for (const activity of lesson.activities) {
      const checks = [[activity.vocabularyIds, vocabularySet, 'ACTIVITY_VOCABULARY'], [activity.grammarIds, grammarSet, 'ACTIVITY_GRAMMAR'],
        [activity.sentenceIds, sentenceSet, 'ACTIVITY_SENTENCE'], [activity.goalIds, goalSet, 'ACTIVITY_GOAL'],
        [activity.dialogueLineIds, lineSet, 'ACTIVITY_DIALOGUE'], [activity.practiceIds, practiceSet, 'ACTIVITY_PRACTICE']] as const;
      for (const [links, allowed, label] of checks) { assertUnique(links, label); assertSubset(links, allowed, label); }
      if (activity.type === 'VOCABULARY' && !activity.vocabularyIds.length
        || activity.type === 'GRAMMAR' && !activity.grammarIds.length
        || ['CONTEXT', 'LISTENING', 'SPEAKING'].includes(activity.type) && !activity.dialogueLineIds.length
        || activity.type === 'PRACTICE' && !activity.practiceIds.length) throw new Error('CONTEXTUAL_ACTIVITY_MISSING_TARGET');
    }
    const assessedGoals = new Set(lesson.practice.flatMap((item) => item.goalIds));
    if (lesson.goals.some((goal) => !assessedGoals.has(goal.id))) throw new Error('CONTEXTUAL_UNASSESSED_GOAL');
    const scheduledPractice = new Set(lesson.activities.flatMap((activity) => activity.practiceIds));
    if (lesson.practice.some((item) => !scheduledPractice.has(item.id))) throw new Error('CONTEXTUAL_UNSCHEDULED_PRACTICE');
  }
  validateCurriculum({
    id: 'ctx-v5-curriculum', title: 'V5 contextual drafts', hskBand: '1',
    units: [{ id: 'ctx-v5-unit', title: 'Draft topics', lessons: lessons.map((lesson) => ({
      id: lesson.id, title: lesson.title, hskBand: lesson.internalHskBand, prerequisiteLessonIds: lesson.prerequisiteLessonIds,
      activities: lesson.activities.map((activity) => ({ id: activity.id, title: activity.promptVi,
        type: activity.type === 'PRACTICE' ? 'QUIZ' : activity.type === 'CONTEXT' ? 'READING' : activity.type,
        vocabularyIds: activity.vocabularyIds, grammarIds: activity.grammarIds, sentenceIds: activity.sentenceIds, storyIds: [],
      })),
    })) }],
  }, { vocabularyIds: new Set(index.vocabulary.keys()), grammarIds: new Set(index.grammar.keys()), sentenceIds: new Set(index.sentences.keys()), storyIds: new Set() });
  return lessons;
}

// Explicit stable-ID bindings, checked against existing seeds in tests; no spelling lookup at runtime.
const words = {
  我: ['hsk-e2cf20315d5d', 'wo3', 'tôi; người đang nói'], 你: ['hsk-d26258016093', 'ni3', 'bạn; người được hỏi'],
  你好: ['starter-001', 'ni3 hao3', 'lời chào'], 是: ['hsk-69577dc60100', 'shi4', 'là; nối người với vai trò'],
  学生: ['hsk-b3d937c9a35a', 'xue2 sheng5', 'học sinh'], 老师: ['hsk-cd4699becedc', 'lao3 shi1', 'giáo viên'],
  中国: ['hsk-a65845872b47', 'zhong1 guo2', 'Trung Quốc'], 汉语: ['hsk-84d2096d920e', 'han4 yu3', 'tiếng Trung'],
  学习: ['hsk-845302d31504', 'xue2 xi2', 'học'], 朋友: ['hsk-26b3272d3df5', 'peng2 you5', 'bạn bè'],
  有: ['hsk-09c405eb8955', 'you3', 'có đồ uống'], 没有: ['hsk-215acdf43177', 'mei2 you3', 'không có'],
  水: ['hsk-161b2bf07cfd', 'shui3', 'nước uống'], 茶: ['hsk-da190c72d1a4', 'cha2', 'trà'],
  喝: ['hsk-55aa51625e57', 'he1', 'uống'], 想: ['hsk-09f6080cf699', 'xiang3', 'muốn'],
  好: ['hsk-631b2a9d50a8', 'hao3', 'đồng ý; được'], 谢谢: ['hsk-3a489a560ed3', 'xie4 xie5', 'cảm ơn'],
  今天: ['hsk-144993166da9', 'jin1 tian1', 'hôm nay'], 明天: ['hsk-5b5440ea1bab', 'ming2 tian1', 'ngày mai'],
  时间: ['hsk-27e9e80a2b8e', 'shi2 jian1', 'thời gian'], 几: ['hsk-93e960acb924', 'ji3', 'mấy; hỏi giờ'],
  点: ['hsk-ad2e0f420b28', 'dian3', 'giờ; mốc giờ, không phải điểm số'], 从: ['hsk-762bb259334a', 'cong2', 'từ mốc bắt đầu'],
  到: ['hsk-5ae1111f29ea', 'dao4', 'đến mốc kết thúc'], 上课: ['hsk-3fa453bb2ef4', 'shang4 ke4', 'học trên lớp'],
  学校: ['hsk-fb1573ce5c43', 'xue2 xiao4', 'trường học'], 准备: ['hsk-ae96b01fe087', 'zhun3 bei4', 'chuẩn bị'],
  衣服: ['hsk-7ad3c5af2814', 'yi1 fu5', 'quần áo'], 这: ['hsk-b1139f496e42', 'zhe4', 'này'],
  比: ['hsk-eea0bc284dff', 'bi3', 'so sánh hai đồ vật'], 贵: ['hsk-fb7f888d647a', 'gui4', 'đắt'],
  大: ['hsk-f2f161f7da15', 'da4', 'cỡ lớn'], 小: ['hsk-63c28c3cb7c2', 'xiao3', 'cỡ nhỏ'],
  买: ['hsk-24d67409bc4b', 'mai3', 'mua'], 件: ['hsk-ea6c0a50d398', 'jian4', 'lượng từ cho quần áo'],
  颜色: ['hsk-d1731a1a750d', 'yan2 se4', 'màu sắc'], 红: ['hsk-1ca490738d63', 'hong2', 'đỏ'],
  昨天: ['hsk-cef991ea15e2', 'zuo2 tian1', 'hôm qua'], 坐: ['hsk-52dd59b172e2', 'zuo4', 'đi bằng phương tiện'],
  火车: ['hsk-62857a4751c2', 'huo3 che1', 'tàu hỏa'], 来: ['hsk-2c9959ac66b2', 'lai2', 'đến chỗ người nói'],
  去: ['hsk-bd2efaef6f28', 'qu4', 'đi đến nơi khác'], 旅行: ['hsk-611b5250809e', 'lv3 xing2', 'du lịch'],
  票: ['hsk-8ed70bb0fb96', 'piao4', 'vé'], 已经: ['hsk-ccc74542e030', 'yi3 jing1', 'đã'],
  练习: ['hsk-aa081b771b3b', 'lian4 xi2', 'luyện tập'], 越来越: ['hsk-fe684dc7525e', 'yue4 lai2 yue4', 'ngày càng'],
  努力: ['hsk-894f20950b45', 'nu3 li4', 'cố gắng'], 方法: ['hsk-054d7d0aed81', 'fang1 fa3', 'phương pháp'],
  作业: ['hsk-1580664f0642', 'zuo4 ye4', 'bài tập về nhà'], 认真: ['hsk-f34c48117d16', 'ren4 zhen1', 'làm một cách nghiêm túc'],
  忙: ['hsk-baa28a7103a6', 'mang2', 'bận'], 累: ['hsk-e1df682fb20b', 'lei4', 'mệt'],
} as const;
type WordKey = keyof typeof words;
type DraftSpec = {
  slug: string; title: string; topic: V5ContextualLesson['topicId']; band: '1' | '2' | '3'; minutes: number;
  goals: [string, string]; vocabulary: WordKey[]; groups: [string, WordKey[]][]; grammarIds: string[]; sentenceIds: string[];
  setting: string; lines: [string, string, string][];
  practice: [string, [string, string], string, string, WordKey[], string[]][];
  speaking: string; prerequisiteSlugs?: string[]; reviewNote?: string;
};

function freezeTree<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

function draft(spec: DraftSpec): V5ContextualLesson {
  const id = `ctx-v5-${spec.slug}`;
  const vocabulary = spec.vocabulary.map((key) => ({ vocabularyId: words[key][0], simplified: key, expectedPinyinNumeric: words[key][1], intendedUsageVi: words[key][2] }));
  const goals = spec.goals.map((descriptionVi, i) => ({ id: `${id}-goal-${i + 1}`, descriptionVi }));
  const goalIds = goals.map((goal) => goal.id);
  const lines = spec.lines.map(([chinese, pinyin, vietnamese], i) => ({ id: `${id}-line-${i + 1}`, speaker: i % 2 ? 'B' : 'A', chinese, pinyin, vietnamese,
    vocabularyIds: vocabulary.filter((word) => chinese.includes(word.simplified)).map((word) => word.vocabularyId) }));
  const practice = spec.practice.map(([promptVi, options, answer, explanationVi, targetWords, grammarIds], i) => ({ id: `${id}-practice-${i + 1}`, promptVi, options, answer, explanationVi,
    vocabularyIds: targetWords.map((key) => words[key][0]), grammarIds: [...grammarIds], goalIds: [goalIds[i % goalIds.length]!] }));
  const activityPlan: Pick<V5ContextualLesson['activities'][number], 'type' | 'minutes' | 'promptVi'>[] = [
    { type: 'VOCABULARY', minutes: spec.minutes - 6, promptVi: 'Đọc từ theo nhóm nghĩa; chú ý cách đọc và nghĩa dùng trong tình huống.' },
    { type: 'GRAMMAR', minutes: 1, promptVi: 'Đối chiếu cấu trúc với câu tham khảo đã liên kết; không suy ra nghĩa từ chỉ từ cách viết.' },
    { type: 'CONTEXT', minutes: 1, promptVi: 'Đọc hội thoại nháp và xác định người nói muốn làm gì.' },
    { type: 'LISTENING', minutes: 1, promptVi: 'Nghe TTS hội thoại rồi đối chiếu bản chép lời. Không có giọng TTS: chuyển sang đọc, không ghi nhận đã nghe.' },
    { type: 'SPEAKING', minutes: 1, promptVi: spec.speaking },
    { type: 'PRACTICE', minutes: 2, promptVi: 'Làm hai câu thực hành; đọc giải thích và tự kiểm tra lại mục tiêu.' },
  ];
  const activities: V5ContextualLesson['activities'] = activityPlan.map((activity, i) => ({ ...activity, id: `${id}-activity-${i + 1}`, goalIds: [...goalIds],
    vocabularyIds: activity.type === 'VOCABULARY' || activity.type === 'SPEAKING' ? vocabulary.map((word) => word.vocabularyId) : [],
    grammarIds: activity.type === 'GRAMMAR' ? [...spec.grammarIds] : [],
    sentenceIds: activity.type === 'GRAMMAR' ? [...spec.sentenceIds] : [],
    dialogueLineIds: ['CONTEXT', 'LISTENING', 'SPEAKING'].includes(activity.type) ? lines.map((line) => line.id) : [],
    practiceIds: activity.type === 'PRACTICE' ? practice.map((item) => item.id) : [],
  }));
  return {
    id, title: spec.title, topicId: spec.topic, internalHskBand: spec.band, estimatedMinutes: spec.minutes,
    contentVersion: 1, reviewStatus: 'DRAFT', verificationStatus: 'UNVERIFIED', sourceType: 'AI_GENERATED',
    source: '4Chinese original V5 contextual draft', reviewer: null,
    reviewNotesVi: ['Chưa có biên tập viên độc lập kiểm tra hội thoại, pinyin, dịch Việt, nghĩa mục tiêu và độ khó. Nhãn HSK là cấp nội bộ, không phải syllabus chính thức.',
      'Ngữ cảnh có từ hỗ trợ ngoài 10 từ mục tiêu; kiểm tra trước khi xuất bản. Câu tham khảo cũ không xác minh hội thoại mới.', ...(spec.reviewNote ? [spec.reviewNote] : [])],
    prerequisiteLessonIds: (spec.prerequisiteSlugs ?? []).map((slug) => `ctx-v5-${slug}`), goals, vocabulary,
    grammarIds: [...spec.grammarIds], sentenceIds: [...spec.sentenceIds],
    semanticGroups: spec.groups.map(([titleVi, keys], i) => ({ id: `${id}-group-${i + 1}`, titleVi, vocabularyIds: keys.map((key) => words[key][0]) })),
    dialogue: { id: `${id}-dialogue`, settingVi: spec.setting, participants: ['A', 'B'], audioSource: 'SYSTEM_TTS', lines },
    practice, activities,
  };
}

/** Six original drafts only. They do not replace or seed any old pathway lesson. */
export const v5ContextualLessons: readonly V5ContextualLesson[] = freezeTree([
  draft({ slug: 'hsk1-meet-classmate', title: 'Làm quen với bạn học', topic: 'people', band: '1', minutes: 8,
    goals: ['Chào và giới thiệu vai trò của mình.', 'Nói mình học ngôn ngữ nào và kết bạn.'],
    vocabulary: ['我', '你', '你好', '是', '学生', '老师', '中国', '汉语', '学习', '朋友'],
    groups: [['Người và quan hệ', ['我', '你', '学生', '老师', '朋友']], ['Chào và giới thiệu', ['你好', '是']], ['Bối cảnh học tập', ['中国', '汉语', '学习']]],
    grammarIds: ['gram-shi', 'gram-ma'], sentenceIds: ['sentence-gram-shi-1', 'sentence-gram-ma-1'],
    setting: 'Hai người gặp nhau trước buổi học tiếng Trung.',
    lines: [['你好！你是学生吗？', 'Nǐ hǎo! Nǐ shì xuésheng ma?', 'Chào bạn! Bạn là học sinh à?'],
      ['是，我是学生。我学习汉语。', 'Shì, wǒ shì xuésheng. Wǒ xuéxí Hànyǔ.', 'Đúng, mình là học sinh. Mình học tiếng Trung.'],
      ['我也是学生。我的老师是中国人。', 'Wǒ yě shì xuésheng. Wǒ de lǎoshī shì Zhōngguó rén.', 'Mình cũng là học sinh. Giáo viên của mình là người Trung Quốc.'],
      ['我们可以一起学习汉语，做朋友。', 'Wǒmen kěyǐ yìqǐ xuéxí Hànyǔ, zuò péngyou.', 'Chúng mình có thể cùng học tiếng Trung và làm bạn.']],
    practice: [['Điền từ giới thiệu vai trò: 我___学生。', ['是', '学习'], '是', '是 nối 我 với danh từ 学生; 学习 là hành động học.', ['我', '是', '学生'], ['gram-shi']],
      ['Câu nào nói về việc học tiếng Trung?', ['我学习汉语。', '我的老师是中国人。'], '我学习汉语。', '汉语 là ngôn ngữ đang học; 中国人 nói về quốc tịch.', ['学习', '汉语', '老师', '中国'], []]],
    speaking: 'Giới thiệu mình trong hai câu rồi mời người kia cùng học; có thể dùng vai trò giả định.',
    reviewNote: '是 có gloss biến thể trong corpus; 吗 trong hội thoại dùng thanh nhẹ nhưng không phải từ mục tiêu (corpus có cách đọc khác). Cần kiểm tra sense/tra từ trước khi cho học.' }),
  draft({ slug: 'hsk1-offer-drink', title: 'Mời bạn uống trà', topic: 'food', band: '1', minutes: 7,
    goals: ['Nêu loại đồ uống mình muốn.', 'Nói có hoặc không có một đồ uống.'],
    vocabulary: ['我', '你', '有', '没有', '水', '茶', '喝', '想', '好', '谢谢'],
    groups: [['Người và phép lịch sự', ['我', '你', '好', '谢谢']], ['Đồ uống', ['水', '茶']], ['Muốn, uống và có', ['喝', '想', '有', '没有']]],
    grammarIds: ['gram-you', 'gram-bu'], sentenceIds: ['sentence-gram-you-2', 'sentence-gram-bu-2'],
    setting: 'Chủ nhà hỏi khách muốn uống gì; khách chọn đồ uống đang có.',
    lines: [['你想喝水还是喝茶？', 'Nǐ xiǎng hē shuǐ háishi hē chá?', 'Bạn muốn uống nước hay trà?'],
      ['我想喝茶。谢谢！', 'Wǒ xiǎng hē chá. Xièxie!', 'Mình muốn uống trà. Cảm ơn!'],
      ['好。我有茶，没有水。', 'Hǎo. Wǒ yǒu chá, méiyǒu shuǐ.', 'Được. Mình có trà, không có nước.'],
      ['好，我们喝茶。', 'Hǎo, wǒmen hē chá.', 'Được, chúng mình uống trà nhé.']],
    practice: [['Chọn câu nói muốn uống trà.', ['我想喝茶。', '我没有茶。'], '我想喝茶。', '想 nêu mong muốn; 没有 nêu không có.', ['想', '喝', '茶', '没有'], []],
      ['Điền phủ định sở hữu: 我___水。', ['没有', '不是'], '没有', 'Phủ định 有 là 没有, không phải 不是.', ['我', '有', '没有', '水'], ['gram-you']]],
    speaking: 'Đóng vai khách: chọn trà hoặc nước, rồi cảm ơn. Đóng vai chủ: nói đồ uống mình có.' }),
  draft({ slug: 'hsk2-plan-class', title: 'Sắp xếp giờ học ngày mai', topic: 'time-numbers', band: '2', minutes: 9,
    goals: ['Hỏi mốc giờ bắt đầu và kết thúc buổi học.', 'Nêu kế hoạch chuẩn bị hôm nay cho buổi học ngày mai.'],
    vocabulary: ['今天', '明天', '时间', '几', '点', '从', '到', '上课', '学校', '准备'],
    groups: [['Ngày và mốc giờ', ['今天', '明天', '时间', '几', '点']], ['Khoảng thời gian', ['从', '到']], ['Học và chuẩn bị', ['上课', '学校', '准备']]],
    grammarIds: ['gram-cong-dao', 'vn-time-position'], sentenceIds: ['sentence-gram-cong-dao-1', 'sentence-vn-time-position-1'],
    setting: 'Hai bạn xác nhận giờ học và quyết định khi nào đến trường chuẩn bị.',
    lines: [['明天几点上课？', 'Míngtiān jǐ diǎn shàngkè?', 'Ngày mai mấy giờ học?'],
      ['从九点到十一点。', 'Cóng jiǔ diǎn dào shíyī diǎn.', 'Từ chín giờ đến mười một giờ.'],
      ['今天有时间准备吗？', 'Jīntiān yǒu shíjiān zhǔnbèi ma?', 'Hôm nay bạn có thời gian chuẩn bị không?'],
      ['有。我今天去学校准备。', 'Yǒu. Wǒ jīntiān qù xuéxiào zhǔnbèi.', 'Có. Hôm nay mình đến trường chuẩn bị.']],
    practice: [['从九点到十一点 diễn tả điều gì?', ['Khoảng từ 9 giờ đến 11 giờ', 'Chỉ một mốc 11 giờ'], 'Khoảng từ 9 giờ đến 11 giờ', '从 đánh dấu điểm bắt đầu và 到 đánh dấu điểm kết thúc.', ['从', '到', '点'], ['gram-cong-dao']],
      ['Chọn trật tự diễn tả ngày mai đến trường.', ['我明天去学校。', '我去明天学校。'], '我明天去学校。', '明天 là thời điểm, thường đặt trước động từ 去.', ['明天', '学校'], ['vn-time-position']]],
    speaking: 'Nói giờ bắt đầu và kết thúc một buổi học giả định; thêm một câu về lúc chuẩn bị.',
    reviewNote: '点 được dùng với nghĩa mốc giờ; gloss corpus chỉ ghi điểm. vn-time-position là seed PENDING, không phải điểm ngữ pháp đã xác minh.' }),
  draft({ slug: 'hsk2-choose-clothes', title: 'So sánh và chọn quần áo', topic: 'actions', band: '2', minutes: 8,
    goals: ['So sánh giá giữa hai cỡ quần áo.', 'Nói cỡ và màu mình muốn mua.'],
    vocabulary: ['衣服', '这', '比', '贵', '大', '小', '买', '件', '颜色', '红'],
    groups: [['Đồ vật và màu', ['衣服', '颜色', '红']], ['Cỡ và giá', ['大', '小', '贵', '比']], ['Chọn và mua', ['这', '件', '买']]],
    grammarIds: ['gram-bi', 'gram-ma'], sentenceIds: ['sentence-gram-bi-1', 'sentence-gram-ma-2'],
    setting: 'Khách so sánh hai cỡ của một mẫu quần áo màu đỏ.',
    lines: [['这件红衣服很贵。', 'Zhè jiàn hóng yīfu hěn guì.', 'Bộ quần áo đỏ này đắt quá.'],
      ['大的比小的贵吗？', 'Dà de bǐ xiǎo de guì ma?', 'Cỡ lớn đắt hơn cỡ nhỏ à?'],
      ['是，大的比小的贵。', 'Shì, dà de bǐ xiǎo de guì.', 'Đúng, cỡ lớn đắt hơn cỡ nhỏ.'],
      ['我想买小的。我喜欢这个颜色。', 'Wǒ xiǎng mǎi xiǎo de. Wǒ xǐhuan zhège yánsè.', 'Mình muốn mua cỡ nhỏ. Mình thích màu này.']],
    practice: [['Trong 大的比小的贵, cỡ nào đắt hơn?', ['Cỡ lớn', 'Cỡ nhỏ'], 'Cỡ lớn', 'Đối tượng đứng trước 比 có đặc điểm cao hơn: 大的 đắt hơn 小的.', ['大', '小', '比', '贵'], ['gram-bi']],
      ['Chọn câu nói muốn mua một món quần áo đỏ.', ['我想买这件红衣服。', '我想买这个颜色。'], '我想买这件红衣服。', '件 đi với 衣服; 颜色 chỉ màu sắc, không phải món quần áo.', ['买', '这', '件', '红', '衣服', '颜色'], []]],
    speaking: 'So sánh hai cỡ bằng 比 rồi chọn một món, nêu màu và cỡ.',
    reviewNote: '大的/小的 là lược bỏ danh từ sau 的, cấu trúc hỗ trợ ngoài hai điểm mục tiêu. Cần biên tập giải thích và độ khó trước tích hợp.' }),
  draft({ slug: 'hsk3-travel-experience', title: 'Kể chuyến đi và kế hoạch tiếp theo', topic: 'places-travel', band: '3', minutes: 10,
    goals: ['Nhấn mạnh thời điểm và phương tiện của chuyến đã đến.', 'Phân biệt trải nghiệm đã từng đi với kế hoạch có vé.'],
    vocabulary: ['我', '昨天', '坐', '火车', '来', '去', '中国', '旅行', '票', '已经'],
    groups: [['Người và thời điểm', ['我', '昨天', '已经']], ['Di chuyển', ['坐', '火车', '来', '去']], ['Chuyến đi', ['中国', '旅行', '票']]],
    grammarIds: ['vn-shi-de', 'gram-guo'], sentenceIds: ['sentence-vn-shi-de-1', 'sentence-gram-guo-1'],
    prerequisiteSlugs: ['hsk2-plan-class'], setting: 'Hai người trò chuyện sau khi gặp nhau ở điểm đến.',
    lines: [['你是怎么来的？', 'Nǐ shì zěnme lái de?', 'Bạn đến đây bằng cách nào?'],
      ['我是昨天坐火车来的。', 'Wǒ shì zuótiān zuò huǒchē lái de.', 'Mình đến bằng tàu hỏa hôm qua.'],
      ['你去过中国吗？', 'Nǐ qù guo Zhōngguó ma?', 'Bạn từng đến Trung Quốc chưa?'],
      ['去过。我已经买了票，明天去中国旅行。', 'Qù guo. Wǒ yǐjīng mǎi le piào, míngtiān qù Zhōngguó lǚxíng.', 'Từng đến rồi. Mình đã mua vé và ngày mai đi du lịch Trung Quốc.']],
    practice: [['我是昨天坐火车来的 nhấn mạnh gì?', ['Thời điểm và phương tiện của lần đến', 'Mong muốn mua vé'], 'Thời điểm và phương tiện của lần đến', '是…的 làm nổi bật chi tiết của một sự việc đã xảy ra.', ['我', '昨天', '坐', '火车', '来'], ['vn-shi-de']],
      ['Câu nào nói về trải nghiệm đã từng đi?', ['我去过中国。', '我明天去中国。'], '我去过中国。', '过 chỉ trải nghiệm; 明天 diễn tả kế hoạch ngày mai.', ['我', '去', '中国'], ['gram-guo']]],
    speaking: 'Kể một chuyến đi giả định bằng 是…的, rồi nói đã từng đến đâu bằng 过.',
    reviewNote: 'vn-shi-de là seed PENDING. 坐 dùng nghĩa đi bằng phương tiện, cần liên kết sense thích hợp thay vì chỉ gloss ngồi.' }),
  draft({ slug: 'hsk3-study-habits', title: 'Trao đổi cách học khi bận', topic: 'school-work', band: '3', minutes: 10,
    goals: ['Nói vẫn học dù bận hoặc mệt.', 'Nhận xét sự tiến bộ và nêu cách luyện tập.'],
    vocabulary: ['学习', '汉语', '练习', '越来越', '努力', '方法', '作业', '认真', '忙', '累'],
    groups: [['Học và thực hành', ['学习', '汉语', '练习', '作业']], ['Cách học và tiến bộ', ['越来越', '努力', '方法', '认真']], ['Khó khăn', ['忙', '累']]],
    grammarIds: ['gram-yue-lai-yue', 'gram-suiran-danshi'], sentenceIds: ['sentence-gram-yue-lai-yue-1', 'sentence-gram-suiran-danshi-1'],
    prerequisiteSlugs: ['hsk1-meet-classmate'], setting: 'Bạn học trao đổi thói quen luyện tập và động viên nhau.',
    lines: [['你最近忙吗？', 'Nǐ zuìjìn máng ma?', 'Dạo này bạn bận không?'],
      ['很忙。虽然有点累，但是我认真做作业。', 'Hěn máng. Suīrán yǒudiǎn lèi, dànshì wǒ rènzhēn zuò zuòyè.', 'Bận lắm. Dù hơi mệt, mình vẫn làm bài tập nghiêm túc.'],
      ['你的汉语越来越好！', 'Nǐ de Hànyǔ yuèláiyuè hǎo!', 'Tiếng Trung của bạn ngày càng tốt!'],
      ['谢谢。我努力练习，也想找到更好的学习方法。', 'Xièxie. Wǒ nǔlì liànxí, yě xiǎng zhǎodào gèng hǎo de xuéxí fāngfǎ.', 'Cảm ơn. Mình cố gắng luyện tập và cũng muốn tìm cách học tốt hơn.']],
    practice: [['Chọn liên từ cho 虽然很忙，___我还学习汉语。', ['但是', '所以'], '但是', '虽然…但是… nêu sự nhượng bộ; 所以 thường nối nguyên nhân với kết quả.', ['忙', '学习', '汉语'], ['gram-suiran-danshi']],
      ['越来越好 mô tả điều gì?', ['Ngày càng tốt hơn', 'Chỉ tốt trong quá khứ'], 'Ngày càng tốt hơn', '越来越 biểu thị xu hướng thay đổi dần, không phải một lần trong quá khứ.', ['越来越'], ['gram-yue-lai-yue']]],
    speaking: 'Nói một khó khăn bằng 虽然…但是…, rồi nêu cách luyện tập và một điểm tiến bộ.' }),
]);
