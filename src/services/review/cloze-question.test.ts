import { describe, expect, it } from 'vitest';

import { buildClozeQuestion } from './cloze-question';

import type { Vocabulary } from '@/types/models';

const word = { id: 'book', simplified: '书', traditional: '書', pinyin: 'shū', pinyinNumeric: 'shu1', primaryMeaningVi: 'sách', hskBand: 1, pos: ['danh từ'], examples: [] } as unknown as Vocabulary;
const pool = [word, ...[['水', '水', 'nước'], ['猫', '貓', 'mèo'], ['车', '車', 'xe'], ['书籍', '書籍', 'sách']].map(([simplified, traditional, primaryMeaningVi], i) => ({ id: `other-${i}`, simplified: simplified!, traditional: traditional!, primaryMeaningVi: primaryMeaningVi!, hskBand: 1 as const }))];

describe('Chinese sentence cloze choices', () => {
  it('uses a real sentence, exactly one blank and four distinct Hanzi answers', () => {
    const question = buildClozeQuestion(word, null, pool)!;
    expect(question.prompt).toBe('我借了一本＿＿。');
    expect(question.sentence).toBe('我借了一本书。');
    expect(question.translation).toBe('Tôi mượn một quyển sách.');
    expect(new Set(question.options)).toEqual(new Set(['书', '水', '猫', '车']));
    expect(question.options.filter(value => value === question.answer)).toHaveLength(1);
    expect(buildClozeQuestion(word, null, pool)).toEqual(question);
  });
  it('prefers personal context and follows the selected writing system', () => {
    const question = buildClozeQuestion(word, '这本书很好看。', pool, true)!;
    expect(question.source).toBe('personal');
    expect(question.prompt).toBe('这本＿＿很好看。');
    expect(question.answer).toBe('書');
    expect(question.sentence).toBe('这本書很好看。');
    expect(question.options).toContain('貓');
    expect(question.options).not.toContain('书籍');
  });
  it('does not create fake questions from bare glosses, repeated words or missing choices', () => {
    const unknown = { ...word, simplified: '测试词', traditional: '測試詞', primaryMeaningVi: 'từ kiểm tra' };
    expect(buildClozeQuestion(unknown, null, pool)).toBeNull();
    expect(buildClozeQuestion(unknown, '测试词', pool)).toBeNull();
    expect(buildClozeQuestion(unknown, '测试词和测试词。', pool)).toBeNull();
    expect(buildClozeQuestion(unknown, '我正在学习“测试词”这个词。', pool)).toBeNull();
    expect(buildClozeQuestion(unknown, '你'.repeat(2001), pool)).toBeNull();
    expect(buildClozeQuestion(word, null, pool.slice(0, 2))).toBeNull();
  });
  it('keeps the vocabulary and catalog immutable', () => {
    const original = JSON.stringify({ word, pool });
    buildClozeQuestion(word, '这本书很好看。', pool);
    expect(JSON.stringify({ word, pool })).toBe(original);
  });
  it('checks later saved contexts when the first one is a bare word or repeats the target', () => {
    const custom = { ...word, id: 'custom-library', simplified: '阅览室', traditional: '閱覽室' };
    const question = buildClozeQuestion(custom, ['阅览室', '阅览室和阅览室。', '我在阅览室看书。'], pool)!;
    expect(question.prompt).toBe('我在＿＿看书。');
    expect(question.source).toBe('personal');
  });
});
