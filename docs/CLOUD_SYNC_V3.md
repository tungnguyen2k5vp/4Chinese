# Cloud Sync V3 (Phase 35)

## Deployed backend

The Supabase sync tables, RLS policies and `sync_push_v1` / `sync_pull_v1` RPCs are deployed to the configured project. RLS is enabled on all three sync tables. Before the app calls the RPCs, run the final `REVOKE` / `GRANT` block at the end of `supabase/multi-device-sync.sql` in the Dashboard: only `authenticated` should retain `EXECUTE`.

## App behaviour

The app remains local-first. SQLite is the source of truth; a user must sign in and choose **Đồng bộ ngay** from the Cloud screen. The sync sequence is:

```text
pull remote cursor → apply safe remote records → enqueue changed local snapshots
→ push idempotent outbox batch → pull again → persist cursor/state
```

- Device IDs are stored locally in SecureStore (or browser local storage) and only break timestamp ties.
- Retry remains 1 min, 5 min, 15 min, 1 h, then 6 h; failed operations remain in SQLite.
- On the first sync, the user explicitly chooses **Dùng cloud** or **Giữ máy này**. The choice prevents a fresh-device default or pre-existing local state from being silently overwritten.
- The v29 `sync_entity_state` table is local-only deduplication state; it does not replace learner data.

## Enabled entities

| Entity | Current state |
| --- | --- |
| Settings | Manual push/pull enabled; newest timestamp with device-ID tie break. |
| Personal decks | Manual push/pull enabled; newer tombstone wins. |
| Custom vocabulary | Not enabled: current delete model lacks a durable tombstone. |
| Reading documents | Not enabled: long chunked documents require paged remote payloads. |
| SRS progress/review logs | Not enabled: requires append-only review-event merge and schedule reconciliation. |

Cloud backup remains the complete cross-device recovery path for data outside the safe manual-sync scope.

## Required acceptance test

1. Create/confirm one Supabase Email user and sign in with it on both devices.
2. On device A, change a setting or create/delete a deck, then tap **Đồng bộ ngay**.
3. On device B, tap **Đồng bộ ngay** and verify the same change appears.
4. Test a conflicting deck edit and a delete-versus-old-edit case.
5. Confirm a different account cannot see any rows from the first account.

Do not claim SRS, custom vocabulary, Reader documents, or release certification as synced until their dedicated merge/payload contracts and two-device tests are complete.