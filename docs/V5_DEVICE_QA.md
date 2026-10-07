# V5 device QA — latest 2026-10-02 / 0.1.30

## Final 0.1.30 / code32 native follow-up

- Gradle release build PASS; signature verification PASS; `adb install -r` SUCCESS over 0.1.29. Package confirms 0.1.30/code32, UID10414 and unchanged dataDir. Existing Buổi 15 deck remains visible. No uninstall or clear-data.
- Found a real-device regression on 0.1.29: the fifth input line remained under the keyboard. Preserved evidence in `device-keyboard-v5.png`.
- Fixed measured Android edge-to-edge IME overlap, flex-bounded ScrollView and explicit reveal after viewport layout commits. Only opt-in keyboard screens reserve overlap; already resized roots do not double-pad.
- Retest PASS for caret visibility on the Realme's actual keyboard at font scale1.0: screenshots `device-keyboard-v5-fixed.png` and `device-keyboard-v5-ten-lines.png` show the current edited line and caret above the IME after repeated newlines through line10. This is a bounded visual check, not proof of every IME, 100-line paste, large font, rotation or text-retention scenario.
- Earlier native vocabulary smoke confirmed level3 count39 matched the filtered list39 and Vietnamese search/English separator text rendered normally.
- Final 0.1.30 source passed typecheck, lint, 6 focused keyboard tests and the full 146-file/819-test suite (25.67s). No runtime error output in the inspected post-test log window.
- QA input was not submitted to the deck. The temporary test text was cleared and the bulk editor exited.
- Microphone/audio-provider QA, record-level before/after comparison, iOS and authenticated Gemini E2E remain unverified.

## Earlier 0.1.29 installation (superseded)

## Latest physical installation

- Realme RMX3085, Android 13, font scale 1.0; USB serial FAJFPNTCPFGEKZB6.
- Upgraded 0.1.26/code28 to 0.1.29/code31 using `adb install -r`; result `Success`. No uninstall or clear-data.
- Package manager confirms versionName 0.1.29 and versionCode31. UID10414 and `/data/user/0/com.tungnguyen2k5vp.fourchinese` remained unchanged. Record-level retention is PARTIAL: learner counts could not be compared while the screen was locked.
- MainActivity start accepted; app process PID16068 observed. No AndroidRuntime/ReactNativeJS error output in the inspected 600-line log window. This is process startup evidence, not a visual UI acceptance test.
- Native keyboard/caret, microphone/TTS, EPUB document picker and foreground/background scenarios NOT RUN on this candidate: phone was locked and the user was asked to unlock it. No lock bypass was attempted.
- Automated verification rerun on this candidate: TypeScript and lint PASS; 146 test files / 819 tests PASS.
- APK signature verified; internal debug-key signing only, not a store-production release.

## Historical 2026-10-01 / 0.1.26 evidence

`adb devices -l` returned no devices during the initial baseline. At the final checkpoint, a Realme RMX3085 connected over USB and received APK 0.1.26. Physical-device coverage is limited to package update and startup; the wider checks below remain pending.

| Native / upgrade scenario | Status | Reason |
| --- | --- | --- |
| Update over installed app; signing compatibility | PASS | `adb install -r` accepted APK 0.1.26/code28 over installed 0.1.25/code27; package manager accepted signing identity |
| Retained SRS, decks, notes, mistakes, path, attempts, settings | PARTIAL | In-place update kept the existing app sandbox (`dataDir` and UID remain); no uninstall/data-clear was used. Record-level before/after counts were not extracted from the non-debuggable installed app |
| Home launch | PASS | MainActivity resumed; app process stayed alive; no startup fatal/JS/SQLite migration error signatures in the inspected app log window |
| HSK/vocabulary/learning/review/grammar/reader/stories/exam navigation | NOT TESTED | Only startup was checked on hardware |
| Microphone grant/deny/revoke; recording interruption and cleanup | NOT TESTED | No connected device |
| Notifications grant/deny | NOT TESTED | No connected device |
| OCR / Digital Ink / speech recognition | NOT TESTED | No connected device |
| Background/resume: exam, speaking, timer, drafts | NOT TESTED | No connected device |
| Offline restart / backup round trip | NOT TESTED | No connected device |
| TalkBack / font scale 100%, 130%, 160%, 200% | NOT TESTED | No connected device |
| iOS / VoiceOver | NOT TESTED | Windows environment; no iOS runtime |

Next safe upgrade procedure: capture app version and aggregate counts only, create user-controlled backup, verify APK certificate/package, install with `adb install -r` (never uninstall), re-check aggregate counts and representative state. Stop on signing mismatch, migration failure or missing backup; no destructive fallback.

Final checkpoint: APK 0.1.26/code28 installed over 0.1.25 with `adb install -r` on a Realme RMX3085; Android accepted the signing identity, retained the package sandbox and resumed MainActivity. No uninstall or clear-data occurred. The installed release app is not debuggable, so individual learner-record counts could not be compared; record-level migration/retention is therefore PARTIAL, not fully verified. Other native scenarios remain untested. Combined 130 suites/631 tests, nine browser journeys and migration/backup fixtures passed. Browser evidence: `V5_WEB_SMOKE.json` and `v5-listening-dark.png`.
