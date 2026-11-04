# V8.2 exam result and review

Result UI is based on the persisted attempt: correct count, total questions, unanswered count, percent, and item-by-item review. Correct answer and rationale are disclosed with each review item. No certificate or pass probability is generated.

Primary source: `src/app/exam/result.tsx`, existing scoring: `src/services/exam/session.ts`. The UI did not change the scoring formula or attempt schema.

Native verification: the submitted QA attempt returned 2/4 correct (50%), 3/4 answered. Opening the wrong item displayed selected answer 医院, correct answer 学校, and the source rationale. The same result appeared in local history. See `25-exam-result-qa2.png`, `26-exam-answer-review.png`, `27-exam-answer-explanation.png`, and `30-exam-history.png`.

Limit: no long-running/expired attempt, re-open after process death, or export/backup flow was exercised. These remain separate checks, not implied by this pass result.
