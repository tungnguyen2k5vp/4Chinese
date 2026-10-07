import { describe, expect, it } from 'vitest';

import { REVIEW_DASHBOARD_DEFINITIONS } from './review-dashboard';

describe('content review dashboard definitions', () => {
  it('covers every V5.1 quality-sensitive content family without claiming availability', () => {
    const keys = new Set(REVIEW_DASHBOARD_DEFINITIONS.map((item) => item.key));
    expect(keys).toEqual(new Set([
      'hsk-mappings', 'word-senses', 'examples', 'collocations', 'grammar', 'stories',
      'dialogues', 'listening', 'exam-questions', 'writing-prompts', 'speaking-prompts', 'translation-prompts',
    ]));
  });

  it('uses only fixed local table identifiers', () => {
    expect(REVIEW_DASHBOARD_DEFINITIONS.every((item) => /^[a-z_]+$/u.test(item.table))).toBe(true);
  });
});

