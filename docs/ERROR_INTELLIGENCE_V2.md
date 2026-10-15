# Error Intelligence V2 (V6)

Date: 2026-10-07. Source: `src/db/mistakes.ts`, `src/services/learning/error-intelligence-v2.ts`, and the Mistake Book routes.

## What changed

The existing Mistake Book remains the source of truth for open mistakes. V6 adds the additive `practice_attempt_daily` table (schema V44) so it can compare correct and incorrect attempts over a rolling 30-day window. It stores only a mistake ID, skill, exercise type, UTC date, attempt count, and error count—no answer text or reader/OCR content.

The aggregate begins only after an item has produced a tracked mistake. It is therefore not a full denominator for all app practice and must be described as recent attempts on tracked mistake items, not a learner-wide error rate.

## Decision gate

A cluster is actionable only when all defaults are met:

- at least 10 tracked attempts in the last 30 days;
- at least 5 tracked errors;
- at least a 35% observed error rate in that window; and
- at least 2 open mistake items.

Old mistakes without recent attempt evidence remain visible but do not become a diagnosis. Buckets use the recorded skill/exercise; only the `confusable_` exercise prefix creates the Confusable bucket. No cause is inferred from one answer or from an STT transcript.

## Remediation and SRS boundary

The offline suggestion includes a short explanation, three practice steps, relevant exercise labels, and at most five IDs from observed open mistakes. The route advances through the queue and retains the existing three consecutive unassisted-correct resolution rule. A practice attempt can update mistake/mastery records, but the remediation route never writes SRS due dates, review logs, or vocabulary progress.

Error groups include Meaning, Pinyin, Listening, Hanzi, Writing, Speaking, Grammar, and Confusable. These are recorded activity categories; they are not all equally actionable in the current remedial UI. Micro-lessons are guidance templates, not separately peer-reviewed curricular material.

## Verification and limits

Unit tests cover rolling-window expiry, correct/error denominators, empty historic evidence, thresholds, queue limits, backup compatibility, and unchanged SRS fields. Physical-device interaction, accessibility, content review by a language specialist, and real-user statistical calibration remain **NOT VERIFIED**. The aggregate is local and is not uploaded by this change.

