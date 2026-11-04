# V8.2 Chinese UI audit — 2026-10-15

Scope is the Chinese learning experience. The English learning code and data are frozen. The V8.2 master brief and the supplied Word report were treated as separate inputs: the brief defines the requested changes; the Word report is historical audit evidence, not permission to rewrite data.

## Findings and current status

| Area | Change / evidence | Status |
|---|---|---|
| Home | One clear “continue learning” action, compact hero, word of day directly after the hero. Native QA image `05-home-qa2.png`. | PASS — layout captured; full daily loop not exercised. |
| Vocabulary | Search, HSK catalog, status filters and real vocabulary rows remain available; mastery details are collapsible. Native `vocabulary-tab.png`, `44-library.png`. | PASS — list rendered on API 36; search/filters not fully walked. |
| Learning/review | Review modes are interleaved and configurable at 5/10/15/20, with default 10; answer and schedule logic stays in existing services. Native empty-due screen and schedule routes captured. | PARTIAL — emulator data had zero due words, so an answer-to-SRS loop was not exercised. |
| Personal decks | Create modal and compact secondary actions; word list/detail, sharing and reversible archive routes are retained. | PARTIAL — private QA DB had zero personal decks; share backend/network is not certified here. |
| HSK | Compact HSK learning/exam/syllabus entry points; levels 1–6 and 7–9; HSK 3.0 catalog separately labeled by source/version. | PASS — hub/level/catalog screens opened. |
| Grammar | Compact rule cards, grammar focus page and HSK syllabus routes retained. | PASS — native list loaded after its initial database query; detail interactions are only partly exercised. |
| Listening/speaking | Tone, minimal-pair, shadowing, TTS listening, roleplay and local recording routes are surfaced with honest capability/privacy copy. | PARTIAL — screen routes captured; audio quality, microphone permission, and physical-device interruptions are not verified. |
| Reading | Reader and story discovery remain available; draft material is labeled as editorial/unverified. | PARTIAL — lists rendered; importing, tapping an inline term, and reading position persistence were not walked end-to-end. |
| Exam | Real bank/setup, autosaved answers, navigator/flags, submit confirmation, result explanations and local history. One actual 4-question HSK 1 practice attempt submitted on the private emulator: 2/4 correct, 1 unanswered. | PASS — this specific practice flow was exercised. |
| Account/statistics | Labels distinguish the current study streak from broad achievement streak; dashboard counts are not simulated. | PARTIAL — screens captured; settings persistence and assistive tech not exercised. |

## Scope boundaries

- Build 48 screenshots are reference-only; they predate these changes. Ten representative before/after pairs are included in the V8.2 gallery, and the devices differ, so the comparison is qualitative rather than pixel-perfect.
- The V8.2 build used for the new screenshots is 0.1.49 / versionCode 51 in a private Android API 36 emulator through the development client. This is not a release APK.
- No V8.2 APK was installed on the user's phone. No reset or import was performed on the phone.
- The complete acceptance matrix and remaining verification are in `V8_2_FINAL_REPORT.md` and `V8_2_ANDROID_VISUAL_QA.md`.
