# V8.2 Android visual and interaction QA — 2026-10-15

## Environment

- Private, isolated Android API 36 emulator; local serial `127.0.0.1:5563`, dedicated QA ADB server port 5043.
- Emulator screen: 1080×1920; system font scale 1.0; light appearance.
- App shell: 4Chinese 0.1.49 / versionCode 51, Android debug development client loading the current JS bundle from Metro. Not a release APK.
- Physical user handset was not accessed or modified in this V8.2 pass.

## Walked flows

1. Home and five primary tabs opened; vocabulary list returned actual records and HSK 1 page rendered.
2. Grammar list initially showed loading at an early capture. It later loaded 64 grammar points and was recaptured after waiting; the focus page showed available comparisons and an honest no-history hint.
3. Listening/speaking/reader/story/deck/account/stats routes were opened and captured. Screen routes are not proof of audio/mic/reader feature completion.
4. Exam: setup → four-question attempt → save a wrong selection → revisit and confirm persistence → answer two more → leave one unanswered → explicit submit → result/explanation → history. Result: 2/4 correct, 3/4 answered.
5. DB before/after comparison: one `exam_attempts` row added by that QA run; no SRS or English learner rows changed.

## Gallery and pairing

- Open `gallery-10-features/index.html` or `gallery-10-features/README.md`.
- ZIP: `artifacts/v8-2-chinese-redesign-2026-10-14/4chinese-v8-2-android-qa.zip`.
- The gallery has ten feature groups and ten representative before/after pairs. Build-48 reference images are from the earlier Android 13 physical-device gallery; after images are API 36 emulator captures, so compare hierarchy rather than pixels.
- Individual post-change source screenshots and UI dumps are in `screenshots/`. Some capture-only files intentionally have an empty UI-tree JSON. The exam countdown prevented reliable automated tree capture; screenshots were used for those states.

## Not verified

Dark mode, larger system fonts, narrow device, TalkBack, permission grants/revocations, physical audio quality, app-background audio interruption, physical data integrity, physical-device layout, export/restore, exam timeout, English screens, and all 179 historical routes. No release APK was rebuilt or installed to the user phone in this pass.
