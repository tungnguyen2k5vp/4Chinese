# Content Delivery System (Phase 36)

## Contract

Remote `content-manifest.json` has a monotonic manifest version and packs with:
`id`, `type`, `version`, SHA-256 checksum, byte size, HTTPS URL and optional
minimum app version. Duplicate IDs, non-HTTPS URLs, invalid semantic versions,
oversized packs and invalid checksums are rejected before SQLite writes.

## Safe apply sequence

```text
Fetch manifest → validate → download bytes → check size → SHA-256 verify
→ validate pack JSON → BEGIN → content applier (UPSERT/DEPRECATE only)
→ record content_packs metadata → COMMIT
```

`content_packs` is schema v26 and is additive. It tracks independently
versioned packs rather than conflating every grammar/story update into one
`content_metadata` row. A failure can be recorded as `FAILED`; no user progress
table is in the content-applier boundary and no content apply deletes progress.

## Integration still required

The system deliberately has no hard-coded public manifest URL and no generic
SQL applier. Each production pack type needs a reviewed, typed applier and a
real SHA-256 implementation at the platform download boundary. This prevents a
new server file from accidentally mutating arbitrary tables.

Required before enabling UI/background download:

1. Host a versioned HTTPS manifest and immutable pack URLs.
2. Provide a native/web SHA-256 verifier and an atomic downloader with partial
   file cleanup.
3. Register reviewed sentence/story/curriculum appliers which only UPSERT or DEPRECATE stable content IDs. The grammar applier is implemented and tested; it preserves grammar progress when content is deprecated.
4. Test failed checksum, interrupted download, low storage, old app version,
   migration from v24, and preservation of learner progress.
