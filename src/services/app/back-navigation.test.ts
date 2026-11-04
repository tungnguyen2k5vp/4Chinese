import { describe, expect, it } from 'vitest';

import { backFallback } from './back-navigation';

describe('visible back button fallback', () => {
  it('returns to an existing parent for direct learning and review links', () => {
    for (const [route, parent] of [
      ['/stats/words', '/(tabs)/stats'],
      ['/path', '/(tabs)/hsk'], ['/hsk/syllabus', '/(tabs)/hsk'],
      ['/path/hsk-1-path', '/path'], ['/path/lesson/hsk-1-lesson-1', '/path'],
      ['/review/session', '/review'], ['/review/result', '/review'],
      ['/learn/session', '/learn/setup'], ['/learn/setup', '/(tabs)'], ['/word/id', '/(tabs)/vocabulary'],
      ['/decks', '/(tabs)/vocabulary'], ['/memory/words', '/memory'],
      ['/memory', '/practice'], ['/speaking/tones', '/speaking'],
      ['/exam/session', '/exam'], ['/grammar/id', '/grammar'],
      ['/english/word', '/english'], ['/english/decks/id/learn', '/english/decks/id'],
      ['/english/deck-trash', '/english/decks'], ['/search', '/(tabs)'],
    ]) expect(backFallback(route!)).toBe(parent);
  });
});
