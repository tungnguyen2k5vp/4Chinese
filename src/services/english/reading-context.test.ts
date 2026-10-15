import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { addEnglishDictionaryCard, createEnglishDeck, initializeEnglishLearner, listEnglishCards } from '@/db/english/learner';
import { expoAdapter } from '@/db/fixtures/legacy_database';
import { lookupEnglishForms } from '@/services/english/dictionary-intelligence';
import { notesWithEnglishContext, readEnglishContext, readerLookupTarget, replaceVisibleEnglishNotes, visibleEnglishNotes } from '@/services/english/reading-context';

const sourcePath = 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db';

describe('English sense-bound local Reader context', () => {
  it('rejects malformed imported context titles and offsets instead of rendering invalid notes', () => {
    const context = readerLookupTarget('I am learning English.', 5).context;
    for (const invalid of [{ sourceTitle: { unexpected: true } }, { sourceTitle: 'x'.repeat(201) }, { sentenceStart: -1 }]) {
      const notes = '\n[4Chinese English context v1]\n' + JSON.stringify({ ...context, senseId: 'en:sky:wd:1', ...invalid });
      expect(readEnglishContext(notes, 'en:sky:wd:1')).toBeNull();
      expect(visibleEnglishNotes(notes)).toBe(notes);
    }
  });
  it('edits visible notes without exposing or losing structured consented context', () => {
    const context = readerLookupTarget('I am learning English.', 5).context;
    const original = notesWithEnglishContext('My notes', context, 'en:sky:wd:1', true);
    expect(visibleEnglishNotes(original)).toBe('My notes');
    const changed = replaceVisibleEnglishNotes(original, 'Edited notes');
    expect(visibleEnglishNotes(changed)).toBe('Edited notes');
    expect(readEnglishContext(changed, 'en:sky:wd:1')?.sentence).toBe('I am learning English.');
    expect(visibleEnglishNotes('Plain existing notes')).toBe('Plain existing notes');
  });
  it('requires consent and exact token; cloze retains grammatical surface and punctuation', () => {
    const text = 'I am learning English every day. We went home.';
    const target = readerLookupTarget(text, 5);
    expect(target.query).toBe('learning');
    expect(notesWithEnglishContext('My notes', target.context, 'en:sky:wd:1', false)).toBe('My notes');
    const notes = notesWithEnglishContext('My notes', target.context, 'en:sky:wd:1', true);
    expect(notes.startsWith('My notes')).toBe(true);
    expect(readEnglishContext(notes, 'en:sky:wd:1')?.cloze).toBe('I am ____ English every day.');
    expect(readEnglishContext(notes, 'en:sky:wd:2')).toBeNull();
    expect(readEnglishContext('malformed', 'en:sky:wd:1')).toBeNull();
  });
  it('keeps known phrases intact without discarding contractions and whitespace', () => {
    const text = "Don't give up. Please look up this word.";
    expect(readerLookupTarget(text, text.indexOf('give')).query).toBe('give up');
    expect(readerLookupTarget(text, text.indexOf('up this')).query).toBe('look up');
    expect(readerLookupTarget(text, 0).query).toBe("Don't");
  });
  it.skipIf(!existsSync(sourcePath))('atomically saves only an explicit sense with context in existing notes, no corpus/schema writes', async () => {
    const raw = new DatabaseSync(':memory:');
    const corpus = new DatabaseSync(sourcePath, { readOnly: true });
    try {
      const db = expoAdapter(raw);
      await initializeEnglishLearner(db);
      await createEnglishDeck(db, 'en:deck:context', 'Context QA');
      const candidates = await lookupEnglishForms(expoAdapter(corpus), 'learning');
      expect(await listEnglishCards(db, 'en:deck:context')).toEqual([]);
      const selected = candidates.find(row => row.headword === 'learn' && row.rawPos === 'V')!;
      const context = readerLookupTarget('I am learning English.', 5).context;
      await addEnglishDictionaryCard(db, { id: 'en:card:context', deck_id: 'en:deck:context', headword: 'learning', meaning_vi: selected.shortMeaning, pos: selected.pos, ipa: '', sense_id: selected.senseId, source_id: selected.source, notes: notesWithEnglishContext('', context, selected.senseId, true) });
      const card = (await listEnglishCards(db, 'en:deck:context'))[0]!;
      expect(card.sense_id).toBe(selected.senseId);
      expect(readEnglishContext(card.notes, card.sense_id)?.cloze).toBe('I am ____ English.');
      expect(raw.prepare('PRAGMA user_version').get()?.user_version).toBe(1);
      expect(raw.prepare('SELECT count(*) n FROM en_reviews').get()?.n).toBe(0);
    } finally { raw.close(); corpus.close(); }
  });
});
