import type { SQLiteDatabase } from 'expo-sqlite';

import { confusablePairs } from '@/data/confusable-words';
import { normalizeSearch } from '@/services/search/normalize';

export type SearchKind = 'VOCABULARY' | 'GRAMMAR' | 'STORY' | 'LESSON' | 'CONFUSABLE';
export type UnifiedSearchResult = { id: string; kind: SearchKind; title: string; subtitle: string; pathname: string; params: Record<string, string> };
type WordRow = { id: string; simplified: string; pinyin: string; primary_meaning_vi: string };
type ContentRow = { id: string; title: string; subtitle: string };
const perGroup = 8;
const like = (value: string) => `%${value.replace(/[\\%_]/gu, '\\$&')}%`;

/** Bounded local results. Native vocabulary uses the existing maintained FTS index. */
export async function searchAllContent(db: SQLiteDatabase, input: string): Promise<UnifiedSearchResult[]> {
  const raw = input.trim().normalize('NFC').slice(0, 100);
  const normalized = normalizeSearch(raw);
  if (!normalized) return [];
  const tokens = normalized.split(' ').filter(Boolean).slice(0, 8);
  const expression = tokens.map(token => `"${token.replace(/"/gu, '""')}"*`).join(' AND ');
  let words: WordRow[];
  try {
    // FTS5's hidden rank keeps BM25 scoring valid alongside the window function.
    words = await db.getAllAsync<WordRow>(`WITH candidates AS (
      SELECT v.id,v.simplified,v.pinyin,v.primary_meaning_vi,
        vocabulary_search_fts.rank AS relevance,COALESCE(v.frequency_rank,999999) AS frequency_rank,
        ROW_NUMBER() OVER (PARTITION BY v.simplified,LOWER(REPLACE(v.pinyin,' ',''))
          ORDER BY CASE WHEN COALESCE(p.studied,0)=1 OR p.status='KNOWN' THEN 0 ELSE 1 END,
            COALESCE(p.memory_level,0) DESC,COALESCE(p.review_count,0) DESC,
            COALESCE(p.updated_at,v.updated_at,v.created_at,'') DESC,v.id) AS identity_rank
      FROM vocabulary_search_fts JOIN vocabulary v ON v.id=vocabulary_search_fts.vocabulary_id
      LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
      WHERE vocabulary_search_fts MATCH ?
        AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck_vocabulary m
          JOIN personal_deck d ON d.id=m.deck_id AND d.deleted_at IS NULL WHERE m.vocabulary_id=v.id))
    ) SELECT id,simplified,pinyin,primary_meaning_vi FROM candidates WHERE identity_rank=1
      ORDER BY relevance,frequency_rank,id LIMIT ?`, expression, perGroup);
  } catch (error) {
    // Web SQLite lacks the optional native FTS table; other database errors must surface.
    if (!/no such (table|module).*fts|fts5.*unavailable/iu.test(String(error))) throw error;
    words = await db.getAllAsync<WordRow>(`WITH candidates AS (
      SELECT v.id,v.simplified,v.pinyin,v.primary_meaning_vi,COALESCE(v.frequency_rank,999999) AS frequency_rank,
        ROW_NUMBER() OVER (PARTITION BY v.simplified,LOWER(REPLACE(v.pinyin,' ',''))
          ORDER BY CASE WHEN COALESCE(p.studied,0)=1 OR p.status='KNOWN' THEN 0 ELSE 1 END,
            COALESCE(p.memory_level,0) DESC,COALESCE(p.review_count,0) DESC,
            COALESCE(p.updated_at,v.updated_at,v.created_at,'') DESC,v.id) AS identity_rank
      FROM vocabulary v LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
      WHERE v.search_text LIKE ? ESCAPE '\\'
        AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck_vocabulary m
          JOIN personal_deck d ON d.id=m.deck_id AND d.deleted_at IS NULL WHERE m.vocabulary_id=v.id))
    ) SELECT id,simplified,pinyin,primary_meaning_vi FROM candidates WHERE identity_rank=1
      ORDER BY frequency_rank,id LIMIT ?`, like(normalized), perGroup);
  }
  const query = like(raw.toLowerCase());
  const grammar = await db.getAllAsync<ContentRow>(`SELECT id,title,pattern AS subtitle FROM grammar_points
    WHERE is_active=1 AND id NOT GLOB 'v5-*' AND (LOWER(title) LIKE ? ESCAPE '\\' OR pattern LIKE ? ESCAPE '\\') ORDER BY hsk_level,id LIMIT ?`, query, query, perGroup);
  const stories = await db.getAllAsync<ContentRow>(`SELECT id,title,description AS subtitle FROM stories
    WHERE is_active=1 AND (LOWER(title) LIKE ? ESCAPE '\\' OR LOWER(description) LIKE ? ESCAPE '\\') ORDER BY hsk_level,id LIMIT ?`, query, query, perGroup);
  const lessons = await db.getAllAsync<ContentRow & { course_id: string }>(`SELECT l.id,l.title,u.title AS subtitle,u.course_id FROM lessons l
    JOIN units u ON u.id=l.unit_id WHERE LOWER(l.title) LIKE ? ESCAPE '\\' OR LOWER(u.title) LIKE ? ESCAPE '\\'
    ORDER BY u.sort_order,l.sort_order,l.id LIMIT ?`, query, query, perGroup);
  const pairs = confusablePairs.filter(pair => normalizeSearch([pair.title,...pair.words.map(word => `${word.hanzi} ${word.meaning} ${word.usage}`)].join(' ')).includes(normalized)).slice(0, perGroup);
  return [
    ...words.map(word => ({ id: word.id, kind: 'VOCABULARY' as const, title: `${word.simplified} · ${word.pinyin}`, subtitle: word.primary_meaning_vi, pathname: '/word/[id]', params: { id: word.id } })),
    ...grammar.map(item => ({ ...item, kind: 'GRAMMAR' as const, pathname: '/grammar/[id]', params: { id: item.id } })),
    ...stories.map(item => ({ ...item, kind: 'STORY' as const, pathname: '/reader', params: { storyId: item.id } })),
    ...lessons.map(item => ({ id: item.id, title: item.title, subtitle: item.subtitle, kind: 'LESSON' as const, pathname: '/path/[courseId]', params: { courseId: item.course_id } })),
    ...pairs.map(pair => ({ id: pair.id, kind: 'CONFUSABLE' as const, title: pair.title, subtitle: pair.words.map(word => `${word.hanzi}: ${word.meaning}`).join(' · '), pathname: '/confusables/[id]', params: { id: pair.id } })),
  ];
}
