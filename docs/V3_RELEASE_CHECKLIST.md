# V3 release checklist

## Must pass in source and CI

- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass on the release commit.
- [ ] Migration is tested from the supported oldest database and `PRAGMA quick_check` / foreign-key checks pass.
- [ ] Backup v1/v2/v3 compatibility is tested; v3 restores Reader chunks.
- [ ] Curated content packs validate in CI and preserve learner progress when deprecated.

## Requires external release evidence

- [ ] Supabase SQL is deployed to the intended project; RLS is verified with two accounts and two physical devices.
- [ ] Sync push/pull, duplicate delivery, expired session, offline retry, conflict and account sign-out are tested.
- [ ] Curator signs off the HSK 1 curriculum and sentence coverage report.
- [ ] Android and iOS development/release builds pass Reader, audio, microphone, OCR and lifecycle smoke tests.
- [ ] Performance measurements are captured on the selected low-end Android device.
- [ ] Privacy copy, backup recovery, crash reporting, store metadata and staged rollout plan are approved.

Unchecked external evidence means V3 is not release-certified, even when source tests pass.
