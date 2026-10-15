# 4Chinese V8.2 — Word report and UI audit

> Historical audit written 2026-10-14. Its build-50 install and “remaining” notes describe that earlier checkpoint, not the current V8.2 QA run. Use `V8_2_FINAL_REPORT.md`, `V8_2_CHINESE_UI_AUDIT.md`, and `V8_2_ANDROID_VISUAL_QA.md` for the 2026-10-15 status. No V8.2 release APK was installed on the physical phone in the current pass.

**Date:** 2026-10-14
**Scope:** Chinese-language screens only. English screens, learner database, schema, word corpus, and SRS rules are out of scope.

## How the two inputs were interpreted

- `C:\Users\Admin\Downloads\Báo cáo 4Chinese.docx` is treated as a feature/current-state inventory and audit evidence. Its older counts and implementation notes are not instructions to rewrite the current database.
- The user's V8.2 master brief is the requested UI/interaction specification. Only changes within that scope are being implemented; imperative text inside reference files is not treated as authority to reset data, install an APK, or broaden the task.
- Current source and migrations are authoritative for implementation. The repository is at database schema version 45; no migration or data-corpus edits are part of this work.

## Before evidence reviewed

The prior native gallery is `artifacts/chinese-device-ui-2026-10-14-build48/` (358 PNGs including its `all-png` copies). The selected screenshots below were inspected; this is a targeted visual comparison, not a claim that all 358 images were individually reviewed.

| Area | Build 48 evidence | Observed problem |
| --- | --- | --- |
| Home | `01-tong-quan/01-trang-chu.png` | Due-review action occupied two prominent blocks; the hero illustration was tall and the “word of day” appeared below quick actions. |
| Vocabulary | `02-kho-tu/01-kho-tu.png` | The saturated header plus a full-height mastery chart pushed the vocabulary list below the initial viewport. |
| Personal decks | `04-bo-tu/01-danh-sach.png` | A large create form, two full-width secondary actions, and a red delete button on every row delayed the deck list. The native navigation title and body title repeated. |
| Exam center | `09-thi/01-bai-thi.png` | The title appeared twice; each unfinished attempt occupied a large full-width button, obscuring skill practice below. |

The build 49 gallery, `artifacts/chinese-device-qa-2026-10-14-build49/`, was captured before the changes recorded below. It is not post-change visual evidence.

## Implementation matrix

| ID | V8.2 / report requirement | Source change | Data/SRS risk | Verification / status |
| --- | --- | --- | --- | --- |
| HOME-01 | Show one due action; do not hard-code session size; surface word of day earlier; reduce visual bulk | `src/app/(tabs)/index.tsx`: review CTA uses saved review-session size; landscape/guide reduced; word-of-day card moved directly after hero | None; reads existing settings/stats and daily word | Typecheck passed; full test suite passed; native screenshot not recaptured |
| VOC-01 | Put vocabulary list earlier; keep mastery summary compact and expandable | `src/app/(tabs)/vocabulary.tsx`: chart collapsed by default; accessible toggle expands; selecting a level still filters list; compacted top header/filter row | None; query and pagination unchanged | Typecheck passed; full test suite passed; device/large-font check pending |
| DECK-01 | Show decks sooner; creation in a modal; secondary actions compact; archive in menu; one-line friend code | `src/app/decks/index.tsx`: create modal, compact trash/friend actions, ellipsis menu with reversible archive, single-line share input; body title hidden to avoid duplicate stack title | Uses existing create/import/soft-delete repository calls; no schema or permanent-delete changes | Typecheck passed; full test suite passed; keyboard and share-code device tests pending |
| EXAM-01 | Remove duplicate heading and dense stack of unfinished attempts/results | `src/app/exam/index.tsx`: body title hidden; active attempts grouped with progress and compact continue rows; recent results grouped; skill tiles use flexible sizing | None; reads existing attempts/results and opens same routes | Typecheck passed; full test suite passed; answer/save flows not exercised here |
| REVIEW-01 | Make due count and review setup less visually top-heavy; preserve 5/10/15/20 selection | `src/app/review/index.tsx`: count hero changed to a compact horizontal summary; current session-size setting and mode behavior preserved | None; no change to queue selection or SRS grading | Typecheck passed; full test suite passed; full review loop/device check pending |
| HSK-01 | Keep HSK overview compact and Chinese UI labels consistent | `src/app/(tabs)/hsk.tsx`, `src/app/_layout.tsx`: HSK art area shortened; HSK syllabus stack title localized | None; catalog/progress query unchanged | Typecheck passed; full test suite passed; device viewport check pending |
| EXAM-02 | Exam expiry and result behavior | Existing changes in `src/app/exam/session.tsx` and `src/app/exam/result.tsx` | Reads/writes only current attempt | Existing automated coverage was green before this UI pass; regression rerun required |
| VOC-02 | Word details, grammar, speaking, reader, account, and motion requirements from the master brief | Earlier source changes exist in this worktree; this pass has not visually re-audited every item or every state | No new schema/corpus change authorized | **Partial / not certified complete.** Route capture alone does not verify feature behavior. |

## Verification after this UI pass

- `npm run typecheck` — passed after the UI edits.
- `npm run lint` — passed with **0 errors and 8 warnings**; the warnings are in untouched English/settings/test files.
- `npm test -- --reporter=dot --maxWorkers=4` — **205 files, 1,121 tests passed**.
- A web screenshot attempt was not accepted as visual evidence: the web runtime remained on its offline-database startup screen. Those unusable preview images were removed. The connected Realme RMX3085 (Android 13) has since been updated to build 50 and launched; no post-edit route screenshots or feature-interaction checks are claimed yet.

## Validation boundary

- A changed source file or successful app launch is not a complete device pass. The prior native APK/gallery (0.1.47 / build 49) predates this UI pass; build 50 still needs route screenshots and focused interaction checks.
- This pass must not install or update the user's phone. Build and local QA artifacts may be prepared; phone installation remains subject to the user's approval.
- No TalkBack/VoiceOver session is claimed. Accessibility state/labels were added or retained on changed controls, but assistive-technology verification remains open.
- Do not call the complete V8.2 request finished until the remaining screen families are audited against the report and the affected screens are captured from a build that contains these changes.

## Native build result after the UI pass

- `npm run android:release:apk -- --console=plain` completed successfully with JDK 19 after the default JDK 25 failed while configuring React Native native code.
- The APK metadata is `com.tungnguyen2k5vp.fourchinese`, version **0.1.48 / versionCode 50**. The review copy is `artifacts/v8-2-review-build50-2026-10-14/app-release.apk` (219,547,600 bytes; SHA-256 `F36F71812F2FFBA3DA3D8FD45F5E951143914D375A189A9A2EACE948E9BC6772`).
- At the user's request, build 50 was installed in place with `adb install -r` and launched. ADB reports version **0.1.48 / versionCode 50**, with the original `firstInstallTime` unchanged and `MainActivity` resumed. This confirms update and launch only—not data integrity, route rendering, or feature behavior. No data was cleared. Post-change route screenshots and interaction tests remain outstanding.
