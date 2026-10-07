import { locateReaderTokens, type LocatedReaderToken, type ReaderChunk } from './pages';
import { readerHanziTerms } from './segment';

import type { Vocabulary } from '@/types/models';

export class ReaderWorkCanceled extends Error {}

/** Bounded work only. Native/SQL promises may continue, but never publish after abort. */
export async function analyzeReaderChunk(chunk: ReaderChunk,
  lookup: (terms: string[]) => Promise<Vocabulary[]>, signal: AbortSignal): Promise<LocatedReaderToken[]> {
  const check = () => { if (signal.aborted) throw new ReaderWorkCanceled(); };
  check();
  // Let the loading state paint before synchronous candidate generation.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  check();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  try {
    const vocabulary = await Promise.race([
      lookup(readerHanziTerms(chunk.content)),
      new Promise<never>((_, reject) => {
        abort = () => reject(new ReaderWorkCanceled());
        signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => reject(new Error('Tra từ quá lâu. Hãy thử lại trang hiện tại.')), 10_000);
        if (signal.aborted) abort();
      }),
    ]);
    check();
    return locateReaderTokens(chunk.content, vocabulary);
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
