import { describe,expect,it } from 'vitest';

import { contextualReviewPrompt } from './contextual-prompt';

describe('contextual review prompt priority',()=>{
  it('prefers a user-selected local encounter over a bundled example',()=>{
    expect(contextualReviewPrompt('我在图书馆学习中文。',['我学习中文。'],['中文'])).toEqual({
      source:'PERSONAL_CONTEXT',prompt:'我在图书馆学习＿＿。',
    });
  });
  it('skips a sense/target mismatch and falls back to a valid example or standard prompt',()=>{
    expect(contextualReviewPrompt('今天天气很好。',['我学习中文。'],['中文'])).toMatchObject({source:'BUNDLED_EXAMPLE'});
    expect(contextualReviewPrompt('今天天气很好。',[],['中文'])).toEqual({source:'FALLBACK',prompt:null});
    expect(contextualReviewPrompt('我学习中文。',[],['学习','學習']).source).toBe('PERSONAL_CONTEXT');
  });
  it('rejects an oversized personal excerpt before using it as review material',()=>{
    expect(contextualReviewPrompt('你'.repeat(2001),['我学习中文。'],['中文']).source).toBe('BUNDLED_EXAMPLE');
  });
});
