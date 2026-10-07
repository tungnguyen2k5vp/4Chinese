# Production service and deployment handoff

## Current safe defaults

- Analytics: local no-op, with allowlisted aggregate properties; no remote vendor is configured.
- Feature flags: deterministic local values; thrown reads/refresh failures fall back without blocking study.
- UI sound: silent manifest; learning does not depend on sound assets.
- Learning guide: bundled neutral vector; no third-party character dependency.
- Personal vocabulary/SRS remains SQLite-first; theme/retention polish does not change its schema or scheduling.

## Before a remote service or asset is enabled

1. Obtain product/privacy/legal approval and document data collection, retention, deletion, and failure behavior.
2. Put credentials in the deployment secret store (never source, logs, or client bundle unless specifically designed as public keys).
3. Verify airplane mode, timeout, retry, invalid credentials, provider outage, account sign-out, and kill-switch behavior.
4. Preserve local learning and make remote providers optional. Roll out behind deterministic local defaults/feature flags.
5. For sync, deploy and verify row-level security using at least two accounts/devices before enabling writes.
6. For images/audio, retain ownership/license/attribution records and verify no content is baked into text or blocking flows.

External evidence and asset requirements are itemized in `EXTERNAL_ASSET_HANDOFF.md` and `V3_RELEASE_CHECKLIST.md`.
