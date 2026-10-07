# 4Chinese V5.3 — Visual comparison & capture report

Date: 2026-10-06

The baseline diagnosis is in [`V5_3_VISUAL_GAP_AUDIT.md`](V5_3_VISUAL_GAP_AUDIT.md). That inventory maps the 60 original audited destinations to their V5.2 verified captures and records each target tier. This implementation visibly restructures the 14 Tier A destinations; it does not claim that the 46 Tier B/C destinations were redesigned.

The gallery below documents the earlier Tier A emulator pass (1080×1920 px, 420 dpi); it is a qualitative review, not a pixel-difference measurement. The final pass subsequently added Home/onboarding and Tier B/C UI details, so these earlier captures do not represent the final source in every changed screen. The floating development control belongs to Expo's debug client and should not be interpreted as app UI.

## Tier A capture gallery

| Destination | After capture |
|---|---|
| Home | [home.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/home.png) |
| HSK | [hsk.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/hsk.png) |
| Statistics | [stats.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/stats.png) |
| Achievements | [achievements-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/achievements-v2.png) |
| Onboarding | [onboarding.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/onboarding.png) |
| Learning path | [path-index-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-index-v2.png) |
| Course map | [path-course-fixed.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-course-fixed.png) |
| Lesson goal sheet | [path-lesson-sheet.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-lesson-sheet.png) |
| Lesson activity | [path-lesson.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-lesson.png) |
| Practice | [practice-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/practice-v2.png) |
| Library | [library-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/library-v2.png) |
| Reader landing | [reader-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/reader-v2.png) |
| Stories | [stories.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/stories.png) |
| Speaking studio | [speaking-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/speaking-v2.png) |
| AI roleplay setup | [speaking-ai-v2.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/speaking-ai-v2.png) |

## QA corrections

The emulator review caught two visual defects: the active lesson marker obscured its title on the course route, and secondary-stack routes repeated the native navigation title inside the page body, wasting substantial first-screen height. Both were corrected and re-captured. The native back action and route titles remain intact.

Representative accessibility presentation captures were also checked at 160% font scale (Practice, Path, AI roleplay) and in system dark mode (Practice). Settings were restored after each pass. See `V5_3_ACCESSIBILITY.md` for exact limits.

## Final-pass source changes — runtime captures verified

| Area | Source-level change |
|---|---|
| Review | Contextual empty-state artwork; elapsed time; result accuracy, completed count, local streak and actual memory-level changes. |
| Exam | Readiness and per-skill result bars derived only from existing app data; no unofficial result is presented as an official score. |
| Listening / speaking | Audio-first library layout; labeled tone-contour diagrams; side-by-side pronunciation pairs and real item progress. |
| Grammar / contrasts | Syntax-token presentation and side-by-side confusable-word layout without inferring hidden linguistic roles. |
| Empty/error states | Original SVG scenes for search, review, mistakes, decks, recordings and stories; app-owned retry on the invalid mistake-practice route. |
| Safety / polish | In-app confirmation for deleting local recordings, production guard for internal content review, and static dev-only QA fixtures. |

The current-source runtime set is now captured on the Android 16 x86_64 emulator: [60-route manifest](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3-final.csv), [screenshots](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/). It contains 57 deep-linked routes and three in-app captures (QA deck detail, active exam, submitted exam result). All 60 PNGs decode at 1080×1920; the two duplicate pairs correspond to documented empty-queue guards. The earlier blank attempt and failed short-dwell captures are not part of this final set.

Representative final captures: [Home](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/home.png), [Search](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/search.png), [Speaking/Tones](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/speaking_tones.png), [Deck detail](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/decks_detail.png), [Exam result](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/exam_result.png). Captures show Expo's debug control, not release UI.

## Remaining scope

The earlier Tier A gallery remains useful evidence for the structural redesign; the complete 60-route runtime screenshot pass is now available in the final set above. Font scale 200%, TalkBack/VoiceOver, dark mode across all routes, data-rich lower-priority states, and a release-build device pass remain unverified. No physical-phone install was done.

