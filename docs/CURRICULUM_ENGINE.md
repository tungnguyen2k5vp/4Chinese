# Curriculum engine

## Progress is evidence-based

Opening a destination screen never completes a lesson activity. The path screen
passes a `lessonActivityId` to the activity, and only the matching learning
event may record progress:

| Activity | Required evidence |
| --- | --- |
| Vocabulary | A concrete word detail was opened |
| Reading | Text was segmented against the offline dictionary |
| Grammar | One grammar exercise was answered correctly |
| Hanzi | At least one handwriting stroke was drawn |
| Quiz | A review attempt was persisted |

`recordLessonActivityEvidence` validates the activity/evidence pairing before
writing `lesson_activity_progress`. Existing progress is retained for backward
compatibility with exported backups; no learner data is reset.

## Return flow

Path-owned vocabulary navigation includes `returnTo=/path/lesson/:lessonId`.
The HSK vocabulary screen renders an explicit return action, so users can go
back to the lesson after inspecting a word without relying on tab history.
