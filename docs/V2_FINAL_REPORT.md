# V2 delivery status

## Delivered in this workspace

| Area | Status | Evidence |
| --- | --- | --- |
| Offline HSK lookup | Delivered | HSK 5-9 FTS lookup uses bounded candidates; benchmark script is included. |
| Sentence safety | Delivered | Sentence provenance/review fields prevent pending drafts from appearing as learner examples. |
| Curriculum completion | Delivered | A lesson activity completes only after real evidence (view, answer, stroke, reader analysis, or review attempt). |
| Grammar mastery | Delivered | Mastery requires at least three attempts, 80% correct, and two exercise types. |
| SRS and mistake focus | Delivered | Due cards remain due-only; daily plans name the repeated error group without moving future cards early. |
| Local sync foundation | Delivered | SQLite outbox is account-scoped with retry state; conflict tie-break is deterministic and tested. |
| Reader, stories, speaking, analytics | Delivered | Existing offline Reader/story, tone/shadowing, skill statistics and achievement modules are covered by the regression suite. |
| Android bundle | Delivered | `npx expo export --platform android` completed successfully. |

## Content gate

The vocabulary dataset is structurally valid: 11,330 records, no validator errors.

The contextual-example audit found that many entries do not yet have an editorially reviewed example. The app intentionally does not replace these with generic “I am learning…” sentences. A production content pack therefore still needs licensed/editor-reviewed source sentences, provenance, and review status before it can be presented as complete contextual coverage.

## Cloud deployment gate

The local outbox does not turn the existing Cloud Backup screen into automatic two-way sync. A production rollout still requires a Supabase sync API/table deployment, RLS verification with two accounts, device/account-switch tests, and explicit conflict UX. This is intentionally not silently enabled from a client APK.

