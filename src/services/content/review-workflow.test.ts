import { describe,expect,it } from 'vitest';

import { qualitySensitiveContentVisible,transitionContentReview,type ReviewedContent } from './review-workflow';

const evidence={reviewer:'fixture-reviewer',reviewedAt:'2026-10-01T10:00:00Z',reviewNotes:'Fixture only.',sourceRef:'fixture:original',licenseEvidence:'Test only, no product source.',verificationEvidence:'Fixture verification, not academic evidence.'};
const draft:ReviewedContent={id:'fixture-1',revision:0,state:'DRAFT',origin:'AI_ASSISTED'};
describe('content approval workflow',()=>{
  it('requires deliberate sequential human review, immutable revisions and recorded source/rights evidence',()=>{
    const reviewed=transitionContentReview(draft,{next:'REVIEWED',expectedRevision:0,actor:'HUMAN',evidence});
    const verified=transitionContentReview(reviewed,{next:'VERIFIED',expectedRevision:1,actor:'HUMAN'});
    const published=transitionContentReview(verified,{next:'PUBLISHED',expectedRevision:2,actor:'HUMAN'});
    expect(draft.state).toBe('DRAFT');expect(qualitySensitiveContentVisible(reviewed)).toBe(false);
    expect(qualitySensitiveContentVisible(published)).toBe(true);
    expect(()=>transitionContentReview(reviewed,{next:'VERIFIED',expectedRevision:0,actor:'HUMAN'})).toThrow('REVISION_CONFLICT');
  });
  it('rejects AI/automation promotion, step skipping and empty verification; fixtures cannot auto-publish product data',()=>{
    expect(()=>transitionContentReview(draft,{next:'REVIEWED',expectedRevision:0,actor:'AUTOMATION',evidence})).toThrow('HUMAN_REQUIRED');
    expect(()=>transitionContentReview(draft,{next:'PUBLISHED',expectedRevision:0,actor:'HUMAN',evidence})).toThrow('STEP_REQUIRED');
    expect(()=>transitionContentReview(draft,{next:'REVIEWED',expectedRevision:0,actor:'HUMAN'})).toThrow('EVIDENCE_REQUIRED');
    expect(qualitySensitiveContentVisible({...draft,state:'PUBLISHED'})).toBe(false);
    const reviewed=transitionContentReview(draft,{next:'REVIEWED',expectedRevision:0,actor:'HUMAN',evidence:{...evidence,verificationEvidence:''}});
    expect(()=>transitionContentReview(reviewed,{next:'VERIFIED',expectedRevision:1,actor:'HUMAN'})).toThrow('EVIDENCE_REQUIRED');
  });
});
