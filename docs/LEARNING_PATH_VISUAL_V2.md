# Learning Path Visual V2

Status: V5.2 UX and implementation notes. The current source already has a grouped course timeline and lesson-state presentation helper; this document records that verified baseline and proposes refinements. It does not claim every path state has been visually or manually tested.

## Verified current behavior

- src/app/path/index.tsx loads courses from local SQLite when focused and displays course cards with title, description, completed/total lessons, XP, and a progress bar. The screen currently has no explicit loading, error, or zero-course state; it initially holds an empty array.
- src/app/path/[courseId].tsx loads the lessons for the course. It groups only consecutive rows with the same persisted unit title via src/services/learning/lesson-path-presentation.ts. Grouping preserves lesson order, course index, and IDs; it does not author new units.
- Lesson presentation has four states: locked, available, current, and completed. The helper treats persisted COMPLETED status as completed, an inaccessible lesson as locked, an unlocked IN_PROGRESS lesson as current, and another unlocked lesson as available.
- Unlock authority remains in src/db/learning-path.ts. The first lesson is unlocked; a later lesson unlocks only after the immediately previous lesson has status COMPLETED. Presentation code must not become a second source of unlock truth.
- The course detail shows progress and state labels. It uses a rail, unit headers, a state marker, MotionPressable rows, and PulseRing around the current lesson. Source exposes an accessible lesson title plus its state and a progress label.
- PulseRing uses useReducedMotion and useMotionDisabled. It stops its loop and becomes a static ring when the OS requests reduced motion or app motion is disabled. MotionPressable exposes button/disabled semantics and suppresses its press-scale animation under reduced motion.
- src/app/path/lesson/[lessonId].tsx starts a lesson, reloads stored activity evidence, and opens existing activity destinations. It passes lessonActivityId and returnTo where supported. Activity types map to existing vocabulary, grammar, tones, shadowing, Reader, writing, and review routes.
- Activity visits are not sufficient evidence by themselves. recordLessonActivityEvidence validates that evidence type matches the stored activity type and deduplicates by activity ID. completeLesson rejects a lesson until every activity has evidence. Lesson IDs and stored progress remain authoritative.
- On successful completion, the current screen calls completeLesson, emits configured completion feedback, records analytics, and shows a completion card. A locked lesson is guarded and returned to the prior screen.

Source references: src/app/path/index.tsx, src/app/path/[courseId].tsx, src/app/path/lesson/[lessonId].tsx, src/db/learning-path.ts, src/db/learning-path.test.ts, src/services/learning/lesson-path-presentation.ts, src/services/learning/lesson-path-presentation.test.ts, src/components/ui/PulseRing.tsx, src/components/ui/MotionPressable.tsx, src/hooks/use-reduced-motion.ts.

## V2 experience

The intended mode is LEARN: welcoming, guided, and progress-aware without inventing curriculum, rewards, or urgency. Keep one clear next action. Use theme tokens and an HSK content marker, but do not use HSK hue to imply completion, lock state, or mastery.

### Course index

Keep the existing one-card-per-course information model. Improve hierarchy so the learner can scan level, course title, short description, progress, and earned XP without every fact competing. The card action opens its existing course ID. A true zero-course state should explain that no path is available rather than silently showing a blank page; loading and load failure should be distinct from zero courses.

### Course timeline

Keep the existing grouped vertical journey as the visual foundation. Each unit header uses its actual stored unit title. Each lesson node should show:

1. Lesson order and title.
2. Explicit state copy: Chưa mở khóa, Sẵn sàng học, Đang học, or Đã hoàn thành.
3. Existing estimated minutes and XP reward, identified as estimated/reward metadata rather than guaranteed time or score.
4. A recognizable state icon plus text; never communicate locked/current/completed through color alone.

Keep the rail decorative to accessibility APIs when its adjacent lesson rows already communicate order and state. Do not re-order lessons to create a winding path, synthesize course chapters, add fake “days,” or turn persisted unit titles into new curriculum claims. If a compact map or alternate visual layout is proposed, it must preserve the same sequence, hit targets, and direct route IDs.

### Lesson activity screen

Show the existing persisted lesson title, activity count, completion count, activity title, and availability. Each row opens only its existing mapped route. A missing/unsupported route is “Chưa khả dụng” and is not tappable; do not imply that a future activity is available.

Keep activity completion tied to source evidence, not to tapping “open.” The final completion action must remain disabled or explain what remains until the DB confirms every activity. On failure, retain current progress and provide a retry path; do not increment XP or report completion on a UI-only optimistic update.

## State and edge-case contract

| State | Required presentation and action |
|---|---|
| Loading courses/lessons/activity evidence | Show a lightweight, labeled loading state. Do not briefly present a misleading empty journey as if it were the persisted result. |
| No courses or no lessons | Explain which source data is absent and provide a safe route back. Do not invent a sample course or add database rows from the UI. |
| Locked lesson | Keep visible in sequence, label “Chưa mở khóa,” explain prerequisite, expose disabled state to assistive technology, and do not navigate on press. |
| Available lesson | Label “Sẵn sàng học,” allow navigation, and do not imply it is already in progress. |
| Current lesson | Label “Đang học.” PulseRing may be a subtle localized cue, never the only current-state signal. |
| Completed lesson | Label “Đã hoàn thành,” preserve its order and stored progress, and make reopening behavior match current routing rules. |
| Invalid course/lesson ID or load failure | Present a clear error with back/retry as appropriate. Do not silently show an empty list or leak a technical identifier as the only heading. |
| Incomplete activity evidence | Explain the remaining activity count; completion must continue to fail closed in the DB until all evidence exists. |
| Completion write failure | Keep the learner on the lesson, do not claim completion/award, and provide a retry after preserving any already-recorded activity evidence. |
| Duplicate return/event | Reopening or returning from an activity must not double-count progress, XP, or analytics evidence. |

The current course/index fetch effects do not explicitly model every loading/error/empty state in their source. These are V2 implementation targets, not tested outcomes.

## Accessibility, theme, and motion

- Use a logical heading structure and a readable progress summary, e.g. “Đã hoàn thành 2 trên 5 bài.”
- Every lesson row must announce lesson order, title, and status in one coherent focus stop. Keep disabled/locked semantics as well as visible state copy. Avoid separate focus stops for a decorative rail, lock icon, and the same title.
- Keep a visible text status alongside icon and color. Check that selected/current/completed/locked remains distinguishable in grayscale, dark theme, and high text scale.
- Maintain at least 48 dp for interactive controls; allow Vietnamese and unit titles to wrap instead of clipping.
- Keep current OS Reduce Motion and app motion preference behavior. Do not add parallax, auto-scroll, continuous map movement, or celebration per node. Existing PulseRing is already reduced-motion aware; still verify it on an actual device.
- Use theme-aware semantic colors for surfaces/status. Dark mode, TalkBack, dynamic type, and reduced-motion runtime behavior have not been certified by the screenshot audit.

## Validation plan

Use a disposable test fixture or existing test DB; do not reset a learner DB, reseed over user-owned data, or change IDs.

1. Capture the course list with zero progress and partial/completed progress.
2. Capture one course containing more than one stored unit and all four node states.
3. Verify first lesson unlock, next lesson locked, completion unlock, and reopening from a lesson route.
4. Exercise each currently mapped activity and verify returnTo behavior plus the expected evidence type.
5. Verify one missing/unsupported target and one invalid route ID.
6. Verify evidence-write failure and incomplete-completion feedback do not change completion/XP.
7. Repeat representative screenshots in light/dark, large text, TalkBack, and system/app reduced-motion settings.

The earlier screenshot inventory includes path index/course/lesson captures, but it is one font scale and one Android emulator state. It does not establish all states or cross-device accessibility.
