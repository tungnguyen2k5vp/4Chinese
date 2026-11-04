# V8.2 English regression boundary

The requested redesign is Chinese-only. Source-safety verification reports no protected English source changes. On the QA emulator, `english-learner.db` and `learning-preferences.db` semantic hashes matched exactly before/after the V8.2 test; the fixture contained zero learner English cards, decks, reviews, drafts, or language preferences.

Validation: `node scripts/v8-2-chinese-safety.cjs verify` → `protectedChanges: []`; database snapshots under `artifacts/v8-2-chinese-redesign-2026-10-14/data-audit/` and root JSON files.

Status: **PARTIAL** for visual/behavioral regression. No complete English-mode screen walk, English data-rich fixture, or physical-device check was made. The profile still intentionally shows the existing English voice selector; the Chinese redesign must not be taken as proof that English screens were visually unchanged on every device.
