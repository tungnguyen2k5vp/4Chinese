# Analytics event contract

The provider-neutral API lives at `src/services/analytics/analytics-service.ts`. Default provider is a local no-op: it sends nothing and cannot block offline learning.

## Events

`app_open`, `lesson_started`, `lesson_completed`, `lesson_abandoned`, `review_started`, `review_completed`, `review_abandoned`, `daily_plan_completed`, `daily_reminder_enabled`, `daily_reminder_disabled`, `story_started`, `story_completed`, `grammar_practiced`, `speaking_started`, `speaking_completed`, `achievement_unlocked`, `streak_extended`, `quick_session_started`, `quick_session_completed`.

## Privacy boundary

Before a configured provider receives properties, the service keeps only:

- `activity`, and only the static values `learning`, `review`, or `new-words`;
- non-negative bounded numeric aggregates `minutes`, `elapsed_seconds`, and `activities`.

Free-form text, Hanzi, Pinyin, translations, notes, lesson/deck IDs, account identifiers, speech/transcription, handwriting strokes, and unknown keys are dropped. Screen tracking accepts a closed set of static route names. Provider errors are swallowed; remote analytics is not configured by this phase.
