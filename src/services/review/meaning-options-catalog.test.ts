import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getOfflineVocabulary } from "@/db/database";
import { buildReviewMeaningOptions, buildReviewPinyinOptions } from "@/services/review/meaning-options";

describe("four review answers across the complete bundled Chinese vocabulary", () => {
  it("covers every word, every band and all session sizes without incomplete or oversized questions", () => {
    const words = getOfflineVocabulary();
    expect(words.length).toBeGreaterThan(1000);
    const bands = [...new Set(words.map(word=>String(word.hskBand)))];
    const catalogs = new Map(bands.map(band=>[band,[...words.filter(word=>String(word.hskBand)===band).slice(0,160),...words.filter(word=>String(word.hskBand)!==band).slice(0,10)]]));
    const failures: {id:string;size:number;kind:string;count:number}[] = [];
    for (let index=0; index<words.length; index++) {
      const target=words[index]!;
      for (const size of [1,5,10,15,20]) {
        const session=Array.from({length:size},(_,offset)=>words[(index+offset)%words.length]!);
        const repeated=session.flatMap(word=>[word,word,word]);
        const catalog=catalogs.get(String(target.hskBand))!;
        for (const [kind,options,correct] of [
          ["meaning",buildReviewMeaningOptions(target,repeated,catalog),target.primaryMeaningVi.trim()],
          ["pinyin",buildReviewPinyinOptions(target,repeated,catalog),target.pinyin.trim()],
        ] as const) {
          const distinct=new Set(options.map(value=>value.normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/gu,' ')));
          if (options.length!==4 || distinct.size!==4 || !options.includes(correct)) failures.push({id:target.id,size,kind,count:options.length});
        }
      }
    }
    const report={auditedChineseWords:words.length,bands,sizes:[1,5,10,15,20],answerSetsChecked:words.length*10,failedAnswerSets:failures.length,failures};
    const directory='artifacts/review-four-answers-fix-2026-10-14';
    mkdirSync(directory,{recursive:true});
    writeFileSync(`${directory}/catalog-audit.json`,JSON.stringify(report,null,2));
    expect(failures).toEqual([]);
    const color=words.find(word=>word.simplified==='颜色')!;
    expect(color).toBeDefined();
    expect(buildReviewMeaningOptions(color,[color],words)).toHaveLength(4);
    expect(buildReviewPinyinOptions(color,[color],words)).toHaveLength(4);
  },20000);
});
