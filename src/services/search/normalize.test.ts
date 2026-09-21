import { describe, expect, it } from 'vitest';

 import { matchesSearch, normalizeSearch } from './normalize';
describe('search normalization',()=>{it('normalizes Vietnamese and pinyin independently',()=>{expect(normalizeSearch('Nǐ hǎo')).toBe('ni hao');expect(normalizeSearch('tiếng Việt')).toBe('tieng viet');});it('matches Hanzi and unmarked pinyin',()=>{expect(matchesSearch(['你好','nǐ hǎo','xin chào'],'ni hao')).toBe(true);expect(matchesSearch(['你好'],'学习')).toBe(false);});});
