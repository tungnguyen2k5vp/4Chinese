export type ContentReviewState='DRAFT'|'PENDING_REVIEW'|'REVIEWED'|'VERIFIED'|'PUBLISHED'|'DEPRECATED';
export type ReviewEvidence={reviewer:string;reviewedAt:string;reviewNotes:string;sourceRef:string;licenseEvidence:string;verificationEvidence?:string;};
export type ReviewedContent={id:string;revision:number;state:ContentReviewState;origin:'ORIGINAL'|'AI_ASSISTED'|'LICENSED';evidence?:ReviewEvidence;deprecationReason?:string;};
const chain:readonly ContentReviewState[]=['DRAFT','PENDING_REVIEW','REVIEWED','VERIFIED','PUBLISHED','DEPRECATED'];
const validText=(value:unknown,limit:number)=>typeof value==='string'&&value.trim().length>0&&value.length<=limit;
function validateEvidence(evidence:ReviewEvidence|undefined,verified:boolean):void {
  if(!evidence||!validText(evidence.reviewer,200)||!validText(evidence.reviewNotes,4000)||
    !validText(evidence.sourceRef,1000)||!validText(evidence.licenseEvidence,4000)||
    !validText(evidence.reviewedAt,40)||!Number.isFinite(Date.parse(evidence.reviewedAt))||
    (verified&&!validText(evidence.verificationEvidence,4000)))throw new Error('CONTENT_REVIEW_EVIDENCE_REQUIRED');
}
/** A workflow gate, not proof of a reviewer's identity or actual redistribution rights. */
export function transitionContentReview(previous:ReviewedContent,input:{next:ContentReviewState;expectedRevision:number;actor:'HUMAN'|'AUTOMATION';evidence?:ReviewEvidence;deprecationReason?:string}):ReviewedContent {
  if(!validText(previous.id,160)||!Number.isSafeInteger(previous.revision)||previous.revision<0||
    !['ORIGINAL','AI_ASSISTED','LICENSED'].includes(previous.origin)||chain.indexOf(previous.state)<0)throw new Error('INVALID_CONTENT_REVIEW_RECORD');
  if(input.expectedRevision!==previous.revision)throw new Error('CONTENT_REVIEW_REVISION_CONFLICT');
  if(chain.indexOf(input.next)!==chain.indexOf(previous.state)+1)throw new Error('CONTENT_REVIEW_STEP_REQUIRED');
  if(input.actor!=='HUMAN'&&!(input.actor==='AUTOMATION'&&previous.state==='DRAFT'&&input.next==='PENDING_REVIEW'))
    throw new Error('CONTENT_REVIEW_HUMAN_REQUIRED');
  if(input.next==='DEPRECATED'&&(!validText(input.deprecationReason,1000)||previous.state!=='PUBLISHED'))
    throw new Error('CONTENT_DEPRECATION_REASON_REQUIRED');
  const evidence=input.evidence??previous.evidence;
  if(input.next!=='PENDING_REVIEW')validateEvidence(evidence,input.next==='VERIFIED'||input.next==='PUBLISHED');
  return {...previous,revision:previous.revision+1,state:input.next,evidence:evidence?{...evidence}:undefined,
    deprecationReason:input.next==='DEPRECATED'?input.deprecationReason?.trim():previous.deprecationReason};
}
export function qualitySensitiveContentVisible(content:ReviewedContent):boolean {
  if(content.state!=='PUBLISHED')return false;
  try{validateEvidence(content.evidence,true);return true;}catch{return false;}
}
