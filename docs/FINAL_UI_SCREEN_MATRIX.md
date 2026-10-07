# V5.4.2 final UI screen matrix

Date: 2026-10-07  
App: 4Chinese `0.1.34` / Android `versionCode 36`  
Target: Android x86_64 AVD; 1080×1920 px, 420 dpi (~411 dp), font scale 1.0 unless the row identifies a stress setting.

## Fresh screenshots from the corrected release source

These were captured from the final route-aware StatusBar source. The AVD was returned to its original “Theo hệ thống” app-theme setting after the dark-mode check.

| Area / state | Screenshot | Hierarchy | Result |
|---|---|---|---|
| Home, system/light theme | [release-candidate-home.png](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/release-candidate-home.png) | `release-candidate-home.xml` | PASS: cold launch reaches Home; status icons readable. |
| Vocabulary tab, system/light theme | [release-candidate-vocabulary.png](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/release-candidate-vocabulary.png) | `release-candidate-vocabulary.xml` | PASS: white status icons readable on the blue header. |
| Listening, system/light theme | [release-candidate-listening.png](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/release-candidate-listening.png) | `release-candidate-listening.xml` | PASS: title/content readable, status icons readable, no internal provenance label. |
| Learning Path, system/light theme | [release-candidate-path.png](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/release-candidate-path.png) | `release-candidate-path.xml` | PASS: status icons readable; active journey and compact other-level rows visible. |
| Learning Path, app dark theme | [release-candidate-path-dark.png](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/release-candidate-path-dark.png) | `release-candidate-path-dark.xml` | PASS: dark surface and light status icons; theme was then explicitly restored and verified as system-following. |

Capture-only manifest: [`capture-manifest-v5.4.2-final.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.4.2-final.csv). The Vocabulary → Listening transition was intentionally tested to confirm the style changes with the active route.

## Feature-entry screenshots

The feature-entry set in `artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator/` contains 34 PNGs and 32 hierarchy XMLs. It is a screen-family set, not one capture per route file.

| Screen family | Captures |
|---|---|
| Home and tabs | `home.png`, `vocabulary.png`, `hsk.png`, `stats.png`, `profile.png` |
| Daily learning and review | `onboarding.png`, `daily.png`, `practice.png`, `review.png`, `mistakes.png` |
| Vocabulary tools | `library.png`, `decks.png`, `confusables.png`, `grammar.png`, `search.png` |
| Listening, path, speaking | `listening.png`, `path.png`, `speaking.png`, `speaking-ai.png`, `speaking-chat.png` |
| Reading and content | `reader.png`, `stories.png`, `writing.png` |
| Exams and account services | `exam.png`, `cloud.png`, `achievements.png` |

Other filenames in that directory include `home-ready.png`, `speaking-ai-scroll.png`, `speaking-chat-360dp.png`, `speaking-keyboard*.png`, and `speaking-setup-*.png`.

## Runtime and visual variants

`artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/` currently contains 67 PNGs and 63 XML hierarchy dumps. Important cases include:

- 360/390 dp Speaking AI layouts; 130%, 160%, and 200% text-size checks on selected screens.
- Light/dark representative routes; reduced-motion selection and restoration.
- Gesture and 3-button navigation captures.
- Native microphone explanation, Android permission prompt, denied fallback, AI chat keyboard, and internal-route guard screens.
- HSK 6 selection/scroll and the fresh post-fix release-candidate captures above.

The evidence is deliberately state-preserving: the AI permission-denial flow was tested without submitting a learner turn; no study session was completed to manufacture progress.

## Coverage boundary

The source inventory contains 61 non-layout `.tsx` route files. All are enumerated in [`PRODUCTION_ROUTE_AUDIT.md`](PRODUCTION_ROUTE_AUDIT.md), but screenshot/runtime coverage is by representative feature family and critical risk state. Dynamic detail routes, every alert/empty/error state, every text-size/theme combination, TalkBack, and physical-phone behavior are not all captured. Do not interpret this matrix as 61/61 route screenshot certification.
