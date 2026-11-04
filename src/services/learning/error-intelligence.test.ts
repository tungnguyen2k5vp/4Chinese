import { describe,expect,it } from 'vitest';

import { clusterObservedMistakes } from './error-intelligence';

import type { Mistake } from '@/db/mistakes';

const mistake=(id:string,wrong_count=1):Mistake=>({id,vocabulary_id:id,grammar_id:null,skill_type:'MEANING',exercise_type:'choice',wrong_count,correct_streak:0,last_wrong_at:null,resolved:0,title:id,pinyin:null,attempts_30d:0,errors_30d:0});
describe('observed error clusters',()=>{
  it('deduplicates, excludes resolved/invalid items, distinguishes repeated errors from many single errors',()=>{
    const a=mistake('a');const result=clusterObservedMistakes([a,a,mistake('b'),mistake('c'),{...mistake('old'),resolved:1},mistake('bad',NaN)]);
    expect(result[0]).toMatchObject({openItems:3,wrongAttempts:3,recurring:false});
    expect(clusterObservedMistakes([mistake('a',3)])[0]?.recurring).toBe(true);
  });
  it('uses actual confusable type, caps previews and does not fabricate semantic categories',()=>{
    const items=Array.from({length:9},(_,i)=>({...mistake(String(i)),exercise_type:'confusable-bu-mei'}));
    // Exact prefix used by persisted confusable records; unrelated type is not inferred.
    expect(clusterObservedMistakes(items)[0]?.key).toBe('MEANING');
    items[0]!.exercise_type='confusable_bu-mei';
    const result=clusterObservedMistakes(items);
    expect(result.find(g=>g.key==='CONFUSABLE')?.wrongAttempts).toBe(1);
    expect(result[0]?.examples).toHaveLength(3);
  });
});
