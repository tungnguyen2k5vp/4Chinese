import { z } from 'zod';

export const hskBandSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal('7-9')]);

export const vocabularyImportSchema = z.object({
  id: z.string().min(1), simplified: z.string().min(1), traditional: z.string().min(1),
  pinyin: z.string().min(1), pinyinNumeric: z.string().regex(/[1-5]/), primaryMeaningVi: z.string().min(1),
  meaningsVi: z.array(z.string().min(1)).min(1), meaningsEn: z.array(z.string()), pos: z.array(z.string()),
  hskBand: hskBandSchema, frequencyRank: z.number().int().positive().nullable(), classifiers: z.array(z.string()),
  radical: z.string().nullable(), strokeCount: z.number().int().positive().nullable(),
  source: z.string().min(1), sourceVersion: z.string().min(1), sourceUrl: z.string().url(),
  translationStatus: z.enum(['verified','machine','missing']),
});

export type ValidationIssue = { id?: string; reason: string };

export function validateVocabularyDataset(input: unknown[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []; const ids = new Set<string>(); const words = new Set<string>();
  input.forEach((item, index) => {
    const result = vocabularyImportSchema.safeParse(item);
    if (!result.success) { issues.push({ id: typeof item === 'object' && item && 'id' in item ? String(item.id) : undefined, reason: `Record ${index}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}` }); return; }
    const value = result.data;
    if (ids.has(value.id)) issues.push({ id: value.id, reason: 'duplicated ID' });
    if (words.has(`${value.simplified}:${value.pinyinNumeric}`)) issues.push({ id: value.id, reason: 'duplicate word and pronunciation' });
    if (value.translationStatus === 'missing' || /^Chưa có/.test(value.primaryMeaningVi)) issues.push({ id: value.id, reason: 'missing Vietnamese meaning' });
    ids.add(value.id); words.add(`${value.simplified}:${value.pinyinNumeric}`);
  });
  return issues;
}
