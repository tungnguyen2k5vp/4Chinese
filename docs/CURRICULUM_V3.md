# Curriculum V3 (Phase 38)

## Implemented source safeguards

`curriculum-validator.ts` validates the pack shape before any database write. It rejects duplicate IDs, missing prerequisite targets, cyclic prerequisites, and missing vocabulary/grammar/story references. The validation boundary is intended for a reviewed curriculum pack, not for generated lesson text.

## Release gate

The bundled learning path remains the existing demonstration path. A production HSK 1 curriculum is not claimed: it needs editor-owned objectives, activity definitions, stable content references, review, and a real pack-applier transaction. The validator must run in CI on that curated pack before release.

