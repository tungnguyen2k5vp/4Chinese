import { describe, expect, it } from 'vitest';

import { evaluateLevelRelease, preparationConfidence, type CoverageDimension, type LevelReleaseEvidence } from './release-gates';

const dimensions:CoverageDimension[] = ['vocabulary','hanzi','grammar','examples','listening','reading','writing','speaking','translation','questionTypes','mockProfile','validation'];
const complete = ():LevelReleaseEvidence => ({ standardId:'fixture-standard',referenceVerified:true,licenseVerified:true,
  dimensions:Object.fromEntries(dimensions.map(key=>[key,{applicable:true,verified:true,complete:true,sourceRef:'fixture-only'}])) as LevelReleaseEvidence['dimensions'],
  learningContentAvailable:true,practiceProfileValid:true,practiceBankValid:true,requiredPracticeAudioAvailable:true,
  verifiedExamProfile:true,reviewedQuestionBank:true,fullMockAvailable:true,scoringValidated:true });

describe('evidence-based release labels', () => {
  it('does not promote raw content count or unknown references to completeness', () => {
    expect(evaluateLevelRelease({...complete(),referenceVerified:false})).toMatchObject({contentComplete:false,examReady:false,coverageKnown:false});
    expect(evaluateLevelRelease({...complete(),licenseVerified:false}).examReady).toBe(false);
  });
  it('requires every applicable dimension and separate mock/profile/scoring gates', () => {
    const evidence = complete(); evidence.dimensions.grammar.complete=false;
    expect(evaluateLevelRelease(evidence)).toMatchObject({missing:['grammar'],contentComplete:false});
    expect(evaluateLevelRelease({...complete(),fullMockAvailable:false})).toMatchObject({contentComplete:true,examReady:false});
    expect(evaluateLevelRelease({...complete(),reviewedQuestionBank:false}).examReady).toBe(false);
    expect(evaluateLevelRelease(complete()).examReady).toBe(true);
  });
  it('keeps optional profile dimensions explicit instead of interpreting unknown as zero', () => {
    const evidence=complete(); evidence.dimensions.speaking={applicable:false,verified:false,complete:false,sourceRef:null};
    expect(evaluateLevelRelease(evidence).contentComplete).toBe(true);
    evidence.dimensions.speaking.applicable=true;
    expect(evaluateLevelRelease(evidence).contentComplete).toBe(false);
  });
  it('requires minimum samples before interpreting learner practice results', () => {
    expect(preparationConfidence(10,1).sufficient).toBe(false);
    expect(preparationConfidence(40,2).sufficient).toBe(false);
    expect(preparationConfidence(30,3).sufficient).toBe(true);
    expect(preparationConfidence(NaN,3).sufficient).toBe(false);
  });
  it('cannot bypass mandatory content dimensions by marking them inapplicable',()=>{
    const evidence=complete();
    evidence.dimensions.grammar.applicable=false;
    expect(evaluateLevelRelease(evidence)).toMatchObject({contentComplete:false,examReady:false,missing:['grammar']});
  });
  it('fails closed when runtime input omits the dimension map entries',()=>{
    const evidence=complete();evidence.dimensions={} as LevelReleaseEvidence['dimensions'];
    expect(evaluateLevelRelease(evidence)).toMatchObject({contentComplete:false,examReady:false,learningReady:false});
    expect(evaluateLevelRelease(evidence).missing).toHaveLength(12);
  });
});
