import { describe, expect, it } from 'vitest';

 import { validateVocabularyDataset } from './validation';

 import generated from '@/data/hsk-vocabulary.json';
describe('dataset parser and validation',()=>{it('accepts the generated HSK 3.0 dataset',()=>{expect(generated.length).toBeGreaterThan(10000);expect(validateVocabularyDataset(generated).filter((issue)=>issue.reason.includes('missing'))).toEqual([]);});it('reports malformed records instead of silently skipping',()=>{const issues=validateVocabularyDataset([{id:'x',simplified:'学'}]);expect(issues.length).toBeGreaterThan(0);});});
