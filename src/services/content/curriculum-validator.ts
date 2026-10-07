import { z } from 'zod';

const activityTypes = ['VOCABULARY', 'GRAMMAR', 'LISTENING', 'SPEAKING', 'READING', 'HANZI', 'QUIZ'] as const;
const hskBands = ['1', '2', '3', '4', '5', '6', '7-9'] as const;
const stableId = z.string().regex(/^[a-z][a-z0-9_-]{2,100}$/u);

const activitySchema = z.object({
  id: stableId,
  type: z.enum(activityTypes),
  title: z.string().min(1).max(160),
  vocabularyIds: z.array(stableId).default([]),
  grammarIds: z.array(stableId).default([]),
  sentenceIds: z.array(stableId).default([]),
  storyIds: z.array(stableId).default([]),
});
const lessonSchema = z.object({
  id: stableId,
  title: z.string().min(1).max(160),
  hskBand: z.enum(hskBands),
  prerequisiteLessonIds: z.array(stableId).default([]),
  activities: z.array(activitySchema).min(1),
});
const unitSchema = z.object({ id: stableId, title: z.string().min(1), lessons: z.array(lessonSchema).min(1) });
const curriculumSchema = z.object({ id: stableId, title: z.string().min(1), hskBand: z.enum(hskBands), units: z.array(unitSchema).min(1) });

export type CurriculumDefinition = z.infer<typeof curriculumSchema>;
export type CurriculumReferenceIndex = {
  vocabularyIds: ReadonlySet<string>;
  grammarIds: ReadonlySet<string>;
  sentenceIds: ReadonlySet<string>;
  storyIds: ReadonlySet<string>;
};

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => seen.has(id) || !seen.add(id));
}

function hasCycle(lessons: ReadonlyMap<string, CurriculumDefinition['units'][number]['lessons'][number]>): boolean {
  const visiting = new Set<string>();
  const completed = new Set<string>();
  const visit = (id: string): boolean => {
    if (completed.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const lesson = lessons.get(id);
    const cycle = !!lesson?.prerequisiteLessonIds.some(visit);
    visiting.delete(id); completed.add(id);
    return cycle;
  };
  return [...lessons.keys()].some(visit);
}

/** Validates static curriculum input before it is accepted as a content pack. */
export function validateCurriculum(input: unknown, references: CurriculumReferenceIndex): CurriculumDefinition {
  const curriculum = curriculumSchema.parse(input);
  const lessons = curriculum.units.flatMap((unit) => unit.lessons);
  const activities = lessons.flatMap((lesson) => lesson.activities);
  const duplicate = [...duplicateIds(curriculum.units.map((unit) => unit.id)), ...duplicateIds(lessons.map((lesson) => lesson.id)),
    ...duplicateIds(activities.map((activity) => activity.id))];
  if (duplicate.length) throw new Error(`CURRICULUM_DUPLICATE_ID:${duplicate[0]}`);
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  for (const lesson of lessons) {
    if (lesson.prerequisiteLessonIds.some((id) => !lessonMap.has(id))) throw new Error(`CURRICULUM_MISSING_PREREQUISITE:${lesson.id}`);
  }
  if (hasCycle(lessonMap)) throw new Error('CURRICULUM_CIRCULAR_PREREQUISITE');
  for (const activity of activities) {
    const checks: readonly [readonly string[], ReadonlySet<string>, string][] = [
      [activity.vocabularyIds, references.vocabularyIds, 'VOCABULARY'], [activity.grammarIds, references.grammarIds, 'GRAMMAR'],
      [activity.sentenceIds, references.sentenceIds, 'SENTENCE'], [activity.storyIds, references.storyIds, 'STORY'],
    ];
    for (const [ids, index, kind] of checks) if (ids.some((id) => !index.has(id))) throw new Error(`CURRICULUM_MISSING_${kind}:${activity.id}`);
  }
  return curriculum;
}
