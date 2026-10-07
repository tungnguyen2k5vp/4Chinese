# External asset handoff

The app is functional without external mascot art, UI sounds, remote analytics, or remote feature flags. These are optional adapter boundaries, not runtime dependencies.

| Area | Current behavior | Needed before enabling |
|---|---|---|
| Learning guide | Original neutral vector composition using bundled UI assets and `字` | If replaced: owned/licensed SVG/PNG, light/dark variants, 2x density, transparent background, no baked text, written license/attribution. See `MASCOT_ASSET_SPEC.md`. |
| UI sound | Silent manifest; all study actions work without audio effects | Owned/licensed short (<300 ms), low-volume files for approved events, plus user-setting and reduced-interruption review. See `UI_SOUND_ASSET_SPEC.md`. |
| Analytics | Local no-op; allowlist strips text and IDs | Privacy review, retention/deletion policy, vendor/DPA approval, secret-managed project config, opt-in/legal review as applicable, outage/offline verification. |
| Feature flags | Deterministic local defaults, no remote dependency | Secret/config setup outside source, default/failure plan, staged rollout, privacy and kill-switch testing. |

Never commit provider credentials, include learner text/audio/notes in event payloads, or make a learning task depend on an external asset/service.
