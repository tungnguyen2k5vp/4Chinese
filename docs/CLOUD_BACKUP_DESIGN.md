# Optional cloud backup implementation and deployment checklist

The app now contains an opt-in Cloud Backup screen. Local ZIP export/restore remains the offline recovery path; cloud functions require the Supabase Storage bucket and RLS policies in `supabase/cloud-backups.sql` to be applied to the target project. That SQL has **not** been deployed by adding the file to this repository.

## Proposed opt-in snapshot model

1. User opens **Cloud Backup** and signs in with email/password. Session is stored via Expo SecureStore on native devices; no service-role key is bundled.
2. User explicitly uploads an already validated Backup 2.0 ZIP into the private `user-backups/<auth.uid()>` folder. No background upload occurs.
3. User can list, download, restore, or delete their own snapshots. Downloaded ZIP passes the same parser and size checks; restore first writes a local ZIP recovery point, then imports SQLite transactionally.

## Explicit non-goals

- No background upload.
- No real-time multi-device synchronization yet. Do not describe the current screen as Cloud Sync.
- No silent merge of two devices. The user chooses a dated snapshot to restore.

## Required safeguards before production rollout

- Apply and review `supabase/cloud-backups.sql` on the actual project; test with two distinct accounts that each cannot list/read/delete the other's object. Do not ship the UI as operational without this step.
- Test offline, interrupted upload, invalid download, size limit, two-device restore, logout, account deletion, and release upgrade on devices. The app has manual delete of snapshots but not account deletion.
- The current file checksum is CRC-32 for corruption detection, **not** tamper-proof authenticity. Supabase RLS/TLS guards access in transit/at rest; a stronger digest/signature would be needed for adversarial integrity assurance.

This keeps future cloud work additive: it can reuse the stable local backup envelope without changing the SRS database contract.
