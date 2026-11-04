import { describe,expect,it } from 'vitest';

import { qualitySensitiveContentVisible,transitionContentReview,type ReviewedContent } from './review-workflow';

const evidence={reviewer:'fixture-reviewer',reviewedAt:'2026-10-01T10:00:00Z',reviewNotes:'Fixture only.',sourceRef:'fixture:original',licenseEvidence:'Test only, no product source.',verificationEvidence:'Fixture verification, not academic evidence.'};
const draft:ReviewedContent={id:'fixture-1',revision:0,state:'DRAFT',origin:'AI_ASSISTED'};
describe('content approval workflow',()=>{
  it('requires deliberate sequential human review, immutable revisions and recorded source/rights evidence',()=>{
    const pending=transitionContentReview(draft,{next:'PENDING_REVIEW',expectedRevision:0,actor:'AUTOMATION'});
    const reviewed=transitionContentReview(pending,{next:'REVIEWED',expectedRevision:1,actor:'HUMAN',evidence});
    const verified=transitionContentReview(reviewed,{next:'VERIFIED',expectedRevision:2,actor:'HUMAN',evidence:{...evidence,verificationEvidence:'Independent review with source evidence.'}});
    const published=transitionContentReview(verified,{next:'PUBLISHED',expectedRevision:3,actor:'HUMAN'});
    expect(draft.state).toBe('DRAFT');expect(qualitySensitiveContentVisible(reviewed)).toBe(false);
    expect(qualitySensitiveContentVisible(published)).toBe(true);
    expect(()=>transitionContentReview(reviewed,{next:'VERIFIED',expectedRevision:1,actor:'HUMAN'})).toThrow('REVISION_CONFLICT');
    expect(()=>transitionContentReview(published,{next:'DEPRECATED',expectedRevision:4,actor:'HUMAN'})).toThrow('DEPRECATION_REASON_REQUIRED');
    expect(transitionContentReview(published,{next:'DEPRECATED',expectedRevision:4,actor:'HUMAN',deprecationReason:'Superseded in a reviewed release.'}).state).toBe('DEPRECATED');
  });
  it('allows automation to queue a draft but rejects automated review, publication skips and empty evidence',()=>{
    const pending=transitionContentReview(draft,{next:'PENDING_REVIEW',expectedRevision:0,actor:'AUTOMATION'});
    expect(()=>transitionContentReview(pending,{next:'REVIEWED',expectedRevision:1,actor:'AUTOMATION',evidence})).toThrow('HUMAN_REQUIRED');
    expect(()=>transitionContentReview(draft,{next:'PUBLISHED',expectedRevision:0,actor:'HUMAN',evidence})).toThrow('STEP_REQUIRED');
    expect(()=>transitionContentReview(pending,{next:'REVIEWED',expectedRevision:1,actor:'HUMAN'})).toThrow('EVIDENCE_REQUIRED');
    expect(qualitySensitiveContentVisible({...draft,state:'PUBLISHED'})).toBe(false);
    const reviewed=transitionContentReview(pending,{next:'REVIEWED',expectedRevision:1,actor:'HUMAN',evidence:{...evidence,verificationEvidence:''}});
    expect(()=>transitionContentReview(reviewed,{next:'VERIFIED',expectedRevision:2,actor:'HUMAN'})).toThrow('EVIDENCE_REQUIRED');
  });
});
