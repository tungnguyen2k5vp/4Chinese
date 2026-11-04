import { contextCloze } from '@/db/vocabulary-context';

export type ContextualPromptSource = 'PERSONAL_CONTEXT' | 'BUNDLED_EXAMPLE' | 'FALLBACK';
export type ContextualPrompt = { source: ContextualPromptSource; prompt: string | null };

/** Personal, user-confirmed text wins; unusable context safely falls back to a sentence. */
export function contextualReviewPrompt(personalSentence: string | null, examples: readonly string[], answers: readonly string[]): ContextualPrompt {
  if (personalSentence && personalSentence.length <= 2000) {
    const prompt = contextCloze(personalSentence,answers);
    if (prompt) return { source:'PERSONAL_CONTEXT',prompt };
  }
  for (const example of examples.slice(0,5)) {
    if (!example || example.length > 2000) continue;
    const prompt = contextCloze(example,answers);
    if (prompt) return { source:'BUNDLED_EXAMPLE',prompt };
  }
  return { source:'FALLBACK',prompt:null };
}
