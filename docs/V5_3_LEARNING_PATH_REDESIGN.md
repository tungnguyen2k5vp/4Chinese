# 4Chinese V5.3 — Learning path redesign

Date: 2026-10-06

## Delivered

- `/path` presents the active course as the main journey preview and the other HSK courses as compact choices.
- `/path/[courseId]` presents course context, real completion/XP, unit grouping, alternating route cards, and distinct locked/current/completed lesson states.
- A lesson node opens a goal sheet with its existing duration/XP and an explicit start action. Locked nodes remain informational and do not bypass prerequisite checks.
- `/path/lesson/[lessonId]` presents the lesson objective and ordered activity timeline, with progress still derived from the existing lesson/activity records.

## Behavior kept intact

The existing `lessonNodeState` and completion gate remain authoritative. This is a presentation change only: no changes to HSK vocabulary selection, SRS scheduling, XP award rules, lesson completion, or database migrations.

## QA findings

The first emulator review found a route marker overlapping a lesson title; node alignment was corrected and re-captured. The lesson goal sheet was opened and its CTA used on the emulator to verify the transition. This marks the first lesson in progress in the emulator's local database; it did not touch the physical phone or cloud data.

Evidence: [path index](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-index-v2.png), [course map](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-course-fixed.png), [lesson goal sheet](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-lesson-sheet.png), [lesson activity screen](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-lesson.png).

