import { describe, expect, it } from 'vitest';

 import { filterVocabularyByHsk } from './filter';

 import type { Vocabulary } from '@/types/models';
const items=[{id:'1',hskBand:1},{id:'2',hskBand:'7-9'}] as Vocabulary[];describe('HSK filtering',()=>{it('keeps the official advanced band intact',()=>{expect(filterVocabularyByHsk(items,'7-9').map((word)=>word.id)).toEqual(['2']);});it('supports all levels',()=>{expect(filterVocabularyByHsk(items,'all')).toHaveLength(2);});});
