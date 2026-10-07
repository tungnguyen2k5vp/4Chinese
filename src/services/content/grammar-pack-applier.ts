import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import type { ContentPackApplier } from './content-delivery';

const stableId = z.string().regex(/^[a-z][a-z0-9_-]{2,100}$/u);
const hsk = z.enum(['1', '2', '3', '4', '5', '6', '7-9']);
const sentenceSchema = z.object({ id: stableId, hanzi: z.string().min(2), pinyin: z.string().min(2),
  translationVi: z.string().min(2), translationEn: z.string().optional(), difficulty: z.int().min(1).max(10),
  reviewStatus: z.literal('REVIEWED'), provenance: z.enum(['CURRICULUM', 'EDITORIAL']), sourceUrl: z.url().optional() });
const grammarSchema = z.object({ id: stableId, title: z.string().min(1), pattern: z.string().min(1),
  explanationVi: z.string().min(1), explanationEn: z.string().optional(), hskLevel: hsk, difficulty: z.int().min(1).max(10),
  sentences: z.array(sentenceSchema).max(100).default([]) });
const payloadSchema = z.object({ operations: z.array(z.union([
  z.object({ operation: z.literal('UPSERT'), grammar: grammarSchema }),
  z.object({ operation: z.literal('DEPRECATE'), grammarId: stableId }),
])).min(1).max(500) });

export type GrammarPackPayload = z.infer<typeof payloadSchema>;

export const grammarPackApplier: ContentPackApplier = {
  type: 'GRAMMAR',
  validate(payload) { payloadSchema.parse(payload); },
  async apply(db: SQLiteDatabase, payload: unknown): Promise<void> {
    const parsed = payloadSchema.parse(payload);
    const now = new Date().toISOString();
    for (const item of parsed.operations) {
      if (item.operation === 'DEPRECATE') {
        await db.runAsync('UPDATE grammar_points SET is_active=0,deprecated_at=? WHERE id=?', now, item.grammarId);
        continue;
      }
      const grammar = item.grammar;
      await db.runAsync(`INSERT INTO grammar_points(id,title,pattern,explanation_vi,explanation_en,hsk_level,difficulty,notes,created_at,is_active,deprecated_at)
        VALUES(?,?,?,?,?,?,?,?,?,1,NULL) ON CONFLICT(id) DO UPDATE SET title=excluded.title,pattern=excluded.pattern,
        explanation_vi=excluded.explanation_vi,explanation_en=excluded.explanation_en,hsk_level=excluded.hsk_level,
        difficulty=excluded.difficulty,is_active=1,deprecated_at=NULL`, grammar.id, grammar.title, grammar.pattern,
      grammar.explanationVi, grammar.explanationEn ?? null, grammar.hskLevel, grammar.difficulty, null, now);
      for (const [sortOrder, sentence] of grammar.sentences.entries()) {
        await db.runAsync(`INSERT INTO sentences(id,hanzi,pinyin,translation_vi,translation_en,hsk_level,difficulty,topic,audio_uri,
          source,created_at,source_url,provenance,review_status,reviewed_at,is_active,deprecated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,NULL) ON CONFLICT(id) DO UPDATE SET hanzi=excluded.hanzi,pinyin=excluded.pinyin,
          translation_vi=excluded.translation_vi,translation_en=excluded.translation_en,hsk_level=excluded.hsk_level,
          difficulty=excluded.difficulty,source=excluded.source,source_url=excluded.source_url,provenance=excluded.provenance,
          review_status='REVIEWED',reviewed_at=excluded.reviewed_at,is_active=1,deprecated_at=NULL`,
        sentence.id, sentence.hanzi, sentence.pinyin, sentence.translationVi, sentence.translationEn ?? null, grammar.hskLevel,
        sentence.difficulty, 'grammar', null, 'remote-content-pack', now, sentence.sourceUrl ?? null, sentence.provenance,
        sentence.reviewStatus, now);
        await db.runAsync('INSERT OR IGNORE INTO grammar_examples(grammar_id,sentence_id,sort_order) VALUES(?,?,?)',
          grammar.id, sentence.id, sortOrder);
        await db.runAsync('INSERT OR IGNORE INTO sentence_grammar(sentence_id,grammar_id) VALUES(?,?)', sentence.id, grammar.id);
      }
    }
  },
};
