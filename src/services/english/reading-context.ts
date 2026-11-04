import { tokenizeEnglishReading } from '@/services/reader/english-tokenizer';

export interface EnglishReadingContext { surface: string; sentence: string; sourceTitle: string; sourceStart: number; sentenceStart: number }
const marker = '\n[4Chinese English context v1]\n';
const phrases = new Set(['look up', 'give up', 'take off', 'look after']);
export function readerLookupTarget(text: string, start: number): { query: string; context: EnglishReadingContext } {
  const tokens = tokenizeEnglishReading(text);
  const index = tokens.findIndex(token => token.word && token.start === start);
  const selected = tokens[index];
  if (!selected) throw new Error('ENGLISH_READER_TOKEN_NOT_FOUND');
  let surface = selected.text, surfaceStart = start;
  for (const i of [index - 2, index]) {
    const a = tokens[i], space = tokens[i + 1], b = tokens[i + 2];
    if (!a?.word || !b?.word || space?.word || !/^\s+$/u.test(space?.text ?? '')) continue;
    const phrase = `${a.text} ${b.text}`;
    if (phrases.has(phrase.toLowerCase())) { surface = phrase; surfaceStart = a.start; break; }
  }
  let left = surfaceStart, right = surfaceStart + surface.length;
  while (left > 0 && !/[.!?\n]/u.test(text[left - 1]!)) left--;
  while (right < text.length && !/[.!?\n]/u.test(text[right]!)) right++;
  if (right < text.length && /[.!?]/u.test(text[right]!)) right++;
  return { query: surface, context: { surface, sentence: right - left <= 1200 ? text.slice(left, right) : '', sourceTitle: '', sourceStart: surfaceStart, sentenceStart: left } };
}
export function notesWithEnglishContext(notes: string, context: EnglishReadingContext, senseId: string, consent: boolean): string {
  if (!consent || !context.sentence || context.sentence.length > 1200 || !senseId.startsWith('en:sky:wd:')) return notes;
  const offset = context.sourceStart - context.sentenceStart;
  if (offset < 0 || context.sentence.slice(offset, offset + context.surface.length) !== context.surface) return notes;
  return `${notes}${marker}${JSON.stringify({ ...context, sourceTitle: context.sourceTitle.slice(0, 200), senseId })}`;
}
/** Exact offset and confirmed sense only. Context for one sense cannot grade another sense. */
export function readEnglishContext(notes: string, senseId: string | null): (EnglishReadingContext & { cloze: string }) | null {
  const index = notes.lastIndexOf(marker);
  if (index < 0 || !senseId) return null;
  try {
    const row = JSON.parse(notes.slice(index + marker.length));
    if (row.senseId !== senseId || typeof row.sentence !== 'string' || typeof row.surface !== 'string' || row.sentence.length > 1200 || !row.surface.length || row.surface.length > 1200 || typeof row.sourceTitle !== 'string' || row.sourceTitle.length > 200) return null;
    if (!Number.isSafeInteger(row.sourceStart) || !Number.isSafeInteger(row.sentenceStart) || row.sourceStart < 0 || row.sentenceStart < 0) return null;
    const offset = row.sourceStart - row.sentenceStart;
    if (offset < 0 || row.sentence.slice(offset, offset + row.surface.length) !== row.surface) return null;
    return { ...row, cloze: `${row.sentence.slice(0, offset)}____${row.sentence.slice(offset + row.surface.length)}` };
  } catch { return null; }
}

/** Notes editors expose human notes without destroying the consented context payload. */
function contextPayloadIndex(notes: string): number {
  const index = notes.lastIndexOf(marker);
  if (index < 0) return -1;
  try {
    const payload = JSON.parse(notes.slice(index + marker.length));
    return readEnglishContext(notes, payload.senseId) ? index : -1;
  } catch { return -1; }
}
export function visibleEnglishNotes(notes: string): string {
  const index = contextPayloadIndex(notes);
  return index < 0 ? notes : notes.slice(0, index);
}
export function replaceVisibleEnglishNotes(original: string, value: string): string {
  const index = contextPayloadIndex(original);
  return index < 0 ? value : value + original.slice(index);
}
