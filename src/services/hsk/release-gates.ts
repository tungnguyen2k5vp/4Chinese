/** Product-content evidence, not a learner score or a prediction of passing HSK. */
export type CoverageDimension = 'vocabulary' | 'hanzi' | 'grammar' | 'examples' | 'listening' | 'reading' |
  'writing' | 'speaking' | 'translation' | 'questionTypes' | 'mockProfile' | 'validation';
export type DimensionEvidence = { applicable:boolean; verified:boolean; complete:boolean; sourceRef:string | null };
export type LevelReleaseEvidence = {
  standardId:string | null;
  referenceVerified:boolean;
  licenseVerified:boolean;
  dimensions:Record<CoverageDimension,DimensionEvidence>;
  learningContentAvailable:boolean;
  practiceProfileValid:boolean;
  practiceBankValid:boolean;
  requiredPracticeAudioAvailable:boolean;
  verifiedExamProfile:boolean;
  reviewedQuestionBank:boolean;
  fullMockAvailable:boolean;
  scoringValidated:boolean;
};

export function evaluateLevelRelease(evidence:LevelReleaseEvidence) {
  const required:CoverageDimension[]=['vocabulary','hanzi','grammar','examples','listening','reading','writing','questionTypes','mockProfile','validation'];
  const keys:CoverageDimension[]=[...required,'speaking','translation'];
  const missing = keys
    .filter(key => {
      const item=evidence.dimensions[key];
      if(!item)return true;
      return required.includes(key)
      ? (!item.applicable || !item.verified || !item.complete || !item.sourceRef?.trim())
      : item.applicable && (!item.verified || !item.complete || !item.sourceRef?.trim());
    });
  const contentComplete = !!evidence.standardId?.trim() && evidence.referenceVerified && evidence.licenseVerified && missing.length===0;
  const learningReady = evidence.learningContentAvailable && evidence.dimensions.validation?.complete===true;
  const examPracticeReady = evidence.practiceProfileValid && evidence.practiceBankValid && evidence.requiredPracticeAudioAvailable;
  const examReady = contentComplete && examPracticeReady && evidence.verifiedExamProfile && evidence.reviewedQuestionBank &&
    evidence.fullMockAvailable && evidence.scoringValidated;
  return {learningReady,contentComplete,examPracticeReady,examReady,missing,
    coverageKnown:evidence.referenceVerified && evidence.licenseVerified};
}

export function preparationConfidence(questions:number,submittedAttempts:number) {
  const sufficient = Number.isInteger(questions) && questions>=30 && Number.isInteger(submittedAttempts) && submittedAttempts>=3;
  return {sufficient,label:sufficient ? 'Đủ mẫu để xem kết quả luyện gần đây; không phải dự đoán điểm thi.' : 'Chưa đủ dữ liệu: cần ít nhất 30 câu trong 3 bài đã nộp.'};
}
