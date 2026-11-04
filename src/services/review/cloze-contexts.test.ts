import { describe, expect, it } from 'vitest';

import { createClozePractice, prepareClozeReview, readLearnedClozeWords } from './cloze-contexts';
import { buildClozeQuestion } from './cloze-question';

import { getOfflineVocabulary } from '@/db/database';

const words = getOfflineVocabulary();
const find = (text: string) => words.find(word => word.simplified === text)!;

describe('cloze with learned vocabulary', () => {
  it('creates the missing soup question with familiar surrounding words and four choices', () => {
    const soup = find('汤');
    const learned = ['我', '想', '喝', '汤', '水', '猫', '书'].map(find);
    const practice = createClozePractice(words, learned);
    const question = buildClozeQuestion(soup, null, words, false, practice)!;
    expect(question.sentence).toBe('我想喝汤。');
    expect(question.prompt).toBe('我想喝＿＿。');
    expect(question.translation).toBe('Tôi muốn uống canh.');
    expect(question.support).toEqual([]);
    expect(new Set(question.options).size).toBe(4);
    expect(question.options.every(choice => practice.known.has(choice))).toBe(true);
  });
  it('changes the sentence to fit the learned context and exposes unfamiliar support', () => {
    const practice = createClozePractice(words, ['汤', '很', '好', '喝'].map(find));
    const question = buildClozeQuestion(find('汤'), null, words, false, practice)!;
    expect(question.sentence).toBe('汤很好喝。');
    expect(question.support).toEqual([]);
    const beginner = createClozePractice(words, [find('汤')]);
    expect(buildClozeQuestion(find('汤'), null, words, false, beginner)!.support.length).toBeGreaterThan(0);
  });
  it('does not treat a compound as a use of its component word', () => {
    const practice = createClozePractice(words, words);
    expect(practice.contexts.get('汤')!.every(context => !context.chinese.includes('汤圆'))).toBe(true);
    const question = buildClozeQuestion(find('汤'), null, words, true, practice)!;
    expect(question.answer).toBe('湯');
    expect(question.sentence).toContain('湯');
    expect(question.prompt.split('＿＿')).toHaveLength(2);
  });
  it('only reads learned words and includes known cards across active decks', async () => {
    let query = '';
    const db = { getAllAsync: async (sql: string) => { query = sql; return []; } };
    await readLearnedClozeWords(db as unknown as Parameters<typeof readLearnedClozeWords>[0]);
    expect(query.trim()).toMatch(/^SELECT /u);
    expect(query).toContain("p.studied=1 OR p.status='KNOWN'");
    expect(query).toContain('d.deleted_at IS NULL');
    expect(query).not.toMatch(/INSERT|UPDATE|DELETE FROM|LIMIT/iu);
  });
  it('prepares answerable turns without saving or consuming cards that need more context', async () => {
    const soup = find('汤'), unsupported = { ...soup, id: 'missing', simplified: '罕见测试词', traditional: '罕見測試詞' };
    const original = JSON.stringify([soup, unsupported]);
    const queries: string[] = [];
    const db = { getAllAsync: async (sql: string) => { queries.push(sql); return []; } };
    const result = await prepareClozeReview(db as unknown as Parameters<typeof prepareClozeReview>[0], [soup, unsupported], words);
    expect(result).toEqual({ words: [soup], omitted: 1 });
    expect(result.words[0]).toBe(soup);
    expect(queries.every(sql => sql.trim().startsWith('SELECT'))).toBe(true);
    expect(JSON.stringify([soup, unsupported])).toBe(original);
  });
  it('does not apply a hǎo context to the hào reading', () => {
    const good = find('好'), practice = createClozePractice(words, words);
    expect(buildClozeQuestion(good, null, words, false, practice)!.sentence).toBe('这个办法很好。');
    const fond = { ...good, id: 'hao4', pinyin: 'hào', pinyinNumeric: 'hao4', primaryMeaningVi: 'ưa thích', examples: [] };
    expect(buildClozeQuestion(fond, null, words, false, practice)).toBeNull();
  });
});
