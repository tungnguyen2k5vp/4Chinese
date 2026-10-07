# 4Chinese V5.3 — Final report

Date: 2026-10-06

## Outcome

Implemented the V5.3 visual redesign for all 14 Tier A destinations from the prior 60-route audit: onboarding, Home, HSK, Statistics, Achievements, Learning Path index/course/lesson, Practice, Library, Reader, Stories, Speaking studio, and AI roleplay setup. This final pass also improves Tier B learning/review/exam/speaking/grammar states and Tier C empty/error/utility states; see the coverage list below. Existing app navigation, learning data, SRS/exam/HSK behavior, consent gates, and database schema were kept intact.

The visual QA found and fixed a course-map node/title overlap and duplicated navigation/page headings. The matching screenshots were re-captured. The target app is still in development QA, not a physical-device deployment.

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — 0 errors; 5 pre-existing import-order warnings in two exam/HSK test files.
- `npm test` — 155 files passed, 856 tests passed.
- Android Hermes bundle export passed. A debug x86_64 APK (127,394,182 bytes) was built and installed only on `emulator-5556`; it is not a release build. The final footer-layering adjustment was JavaScript-only and was hot-reloaded from Metro for emulator QA; a new standalone APK was not packaged afterward.
- Captured all 60 routes from the current source on Android 16 x86_64 (`1080×1920`, 420 dpi, light, font scale 1.0): 57 deep links plus the QA deck detail and the exam session/result reached through in-app flows. All 60 files decode at the expected dimensions; there are no missing/extra route files. The only exact duplicate pairs are the expected empty-queue guards (`learn/session` → setup and `review/session` → review index).
- Visually spot-checked Home, Search, Speaking/Tones, Review, Mistake recovery, Deck detail, Exam setup, the active Exam session, and its submitted result. The exam completed 4/4 and navigated to a 4/4 (100%) result without reproducing the earlier ScreenStack crash.
- Re-tested onboarding interactions after the footer layer fix: scrolled to HSK 5/6, selected HSK 6, and advanced to the daily-goal step. The final onboarding submit was not pressed, so no onboarding completion was saved.
- A fresh emulator launch displayed the offline-data startup state, then reached Home after about 30 seconds; this was one debug-emulator observation, not a controlled performance benchmark. Representative Practice/Path/AI roleplay layouts were previously checked at font scale 1.6, and Practice in system dark mode; those settings are not part of the 60-route capture pass.
- The path lesson CTA was exercised to verify the goal-sheet-to-lesson transition. This put the first lesson in progress in the emulator's local app data; it did not affect the physical phone or Supabase.

## Artifacts and design notes

- [Visual gap audit](V5_3_VISUAL_GAP_AUDIT.md)
- [Visual comparison / screenshot gallery](V5_3_VISUAL_DIFF_REPORT.md)
- [Final 60-route capture manifest](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3-final.csv)
- [Runtime QA addendum and remaining release limits](V5_3_RUNTIME_QA_ADDENDUM.md), [full screenshot QA plan](UI_QA_SCREENSHOT_PLAN_2026-10-06.md)
- [Brand visual system](V5_3_BRAND_VISUAL_SYSTEM.md), [illustrations](V5_3_ILLUSTRATION_SYSTEM.md)
- [Learning Path](V5_3_LEARNING_PATH_REDESIGN.md), [Reader](V5_3_READER_REDESIGN.md), [Speaking](V5_3_SPEAKING_REDESIGN.md), [Statistics](V5_3_STATS_REDESIGN.md)
- [Accessibility verification](V5_3_ACCESSIBILITY.md), [performance notes](V5_3_PERFORMANCE.md)
- Final runtime screens: `artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/`

## Final-pass implementation coverage

- Review: contextual illustrations for due/weak/upcoming empty states; session elapsed time; result accuracy, reviewed count, local streak, and memory-change indicators derived from stored learning data.
- Learning and exam: session duration passed to results; readiness and per-skill result bars use the existing vocabulary/grammar evidence and do not invent an official score.
- Speaking: accessible tone-contour lessons and side-by-side pronunciation pairs with actual practice progress; listening has an audio-first surface and still withholds transcript until after answering.
- Grammar and contrast: syntax tokens are visually distinguished without inferring grammatical roles; confusable words are compared side by side.
- Empty/error/utility states: original offline SVG empty illustrations across search/review/mistakes/decks/recordings/stories; app-owned retry for invalid mistake practice; recording deletion uses in-app confirmation; internal content-review route is gated from production direct access.
- Home and onboarding use the decorative LearningGuide; it carries no score or mastery state.
- Onboarding's fixed footer is layered above the scrollable HSK choices so the CTA remains visible while selecting lower levels.
- The development-only `__qa` route is a static, deterministic visual fixture and performs no database writes.

## Explicitly not done

- No APK was installed or updated on the user's physical RMX3085 phone. ADB showed the phone connected during the final inventory check, but all installs, launches, and captures in this pass explicitly targeted `emulator-5556`; the physical phone was not targeted.
- No release build or store/deployment release was produced.
- Full route coverage is captured, but this is not a complete functional certification: font scale 2.0, TalkBack/VoiceOver, dark mode across all routes, data-rich secondary states, microphone permissions, and live voice/AI interactions remain unverified. See the accessibility report for the exact limits.
- No physical-device runtime check was done. The physical phone was intentionally left untouched.
- Expo's development control is present in screenshots because capture used the debug development client; it will not be in a production UI.

The 60-route emulator screenshot pass is complete. Physical-device, release-build, and broader accessibility sign-off remain pending; no phone installation was performed.

