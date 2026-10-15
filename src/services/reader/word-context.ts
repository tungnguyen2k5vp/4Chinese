import type { SQLiteDatabase } from 'expo-sqlite';

import { sentenceAtCharacter, type ReaderChunk } from './pages';

import { getReadingDeckCopyId, getReadingSentence } from '@/db/reading';
import { saveVocabularyContext, type ContextSource } from '@/db/vocabulary-context';
import type { Vocabulary } from '@/types/models';

/** Invoke only after a successful deck save. No transport, truncation, or shared-schema ownership. */
export async function saveReaderWordContext(db: SQLiteDatabase, input: {
  vocabularyId: string; chunk: ReaderChunk; localCharacterOffset: number; tokenIndex: number;
  documentId: string | null; draftText: string; sourceId: string; sourceType: ContextSource;
  userConfirmed: true;
  deckCopy?: { deckId: string; word: Pick<Vocabulary, 'simplified' | 'pinyinNumeric' | 'pinyin'> };
}): Promise<void> {
  const offset = input.chunk.char_start + input.localCharacterOffset;
  const sentence = input.documentId
    ? await getReadingSentence(db, input.documentId, input.chunk, input.localCharacterOffset)
    : sentenceAtCharacter(input.draftText, offset).sentence;
  const payload = { sentence,
    sourceType: input.sourceType, sourceId: input.sourceId,
    location: `chunk:${input.chunk.chunk_index}:token:${input.tokenIndex}:char:${offset}`,
    userConfirmed: input.userConfirmed };
  const ids = new Set([input.vocabularyId]);
  if (input.deckCopy) {
    const copyId = await getReadingDeckCopyId(db, input.deckCopy.deckId, input.deckCopy.word);
    if (!copyId) throw new Error('READER_DECK_CONTEXT_TARGET_NOT_FOUND');
    ids.add(copyId);
  }
  for (const vocabularyId of ids) await saveVocabularyContext(db, { ...payload, vocabularyId });
}
