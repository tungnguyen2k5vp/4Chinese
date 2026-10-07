# 4Chinese Visual Asset Specification

Status: lightweight V5.2 asset policy. This document records the current source baseline and defines a safe path for future assets. It does not claim that new illustration or sound files have been commissioned, licensed, or integrated.

## Current asset baseline

- `src/components/engagement/LearningGuide.tsx` currently composes an original neutral guide from bundled Ionicons plus the `字` mark. It has semantic states for idle, happy, encouragement, correct, supportive retry, celebration, thinking, and empty state. This is UI composition, not a collection of finished mascot illustrations.
- `docs/MASCOT_ASSET_SPEC.md` requires any replacement art to be owned or appropriately licensed, supplied in light/dark variants, at least 2x density, on transparent backgrounds, without embedded text, and with attribution/license documented.
- `assets/images/` contains general app branding, splash/tab/application icons and related Expo assets. No V5.2 character-art set was verified in the audited source.
- `src/services/sound/ui-sound-service.ts` currently has a manifest whose event paths are all `null`; no licensed UI sound assets/player were verified. `docs/UI_SOUND_ASSET_SPEC.md` says future UI sounds must be owned/licensed, under 300 ms, low-volume, optional, and must not be confused with TTS.

Treat “pending” literally: do not ship placeholder paths, broken image references, borrowed characters, unlicensed music, or copy that implies a sound/animation exists when it does not.

## Asset principles

1. **Original and rights-cleared.** Artwork must be created for 4Chinese or have a written license permitting the intended commercial app use, modification, and distribution. Record source, author, license, attribution requirements, and any restrictions in an asset manifest before bundling.
2. **Offline-first.** Learning content and essential interaction must work without fetching illustration or sound from a server. Bundle only optimized, product-approved files. Do not add remote asset delivery as part of a visual pass.
3. **Lightweight by default.** Prefer the current vector composition, simple SVG/vector drawing if already supported in the project, or small optimized raster assets. Check the existing Expo asset pipeline before adding a format or dependency. Do not add a heavy animation/rendering package for decorative polish alone.
4. **No competitor imitation.** Do not trace or recreate another language app’s mascot, artwork, map, character silhouettes, or signature composition. Do not use scraped search images or assets with unclear provenance.
5. **Accessible and content-safe.** Do not bake words, buttons, status text, pinyin, or translations into images. Decorative assets must be hidden from accessibility focus; informative assets need an accurate localized label. Keep status meaning in UI text/icons.
6. **Reduced-motion and energy aware.** The default asset should be static. If a motion asset is introduced, it must be short, purposeful, interruptible, honor the OS/app reduced-motion settings, and not loop in lesson/review/exam content.

## Proposed asset organization

This is an organization proposal, not a statement about files currently present:

```text
assets/
  illustrations/
    guide/           # approved guide states, only if commissioned
    empty/           # small optional supportive scenes
    milestones/      # rare milestones only; not per-answer art
  audio/
    ui/              # optional short UI sounds only; TTS is not stored here
  licenses/          # provenance, license, and attribution records
```

Keep a typed, static asset registry close to the consuming feature. Static imports/requires should remain visible to Metro so offline bundling and release asset inclusion can be checked. Avoid runtime path construction that prevents bundling. The current Ionicons-based `LearningGuide` remains the no-asset fallback and must continue to render if an optional image cannot load.

## Mascot and illustration brief

The guide’s identity should feel calm, friendly, and language-learning-specific without becoming a child-directed reward character. Keep it a supporting cue, not the main content.

If new artwork is commissioned:

- Define the state-to-meaning contract before drawing: idle, encourage, correct, supportive retry, celebrate, thinking, and optional empty-state support. Avoid facial states that shame a learner after an error.
- Provide consistent silhouette, framing, lighting, and visual weight across states. Export light/dark-safe transparent variants only when a single art direction cannot remain legible on both semantic surfaces.
- Deliver at least 2x density for raster art, with a documented logical display size and maximum byte size. Prefer vector art where it fits the existing bundle/toolchain; visually review SVG filters, masks, and gradients on Android and web before adoption.
- Do not use the guide on every screen. The mode recipe in `4CHINESE_VISUAL_MODES.md` allows it mainly in guided learning; keep it out of timed exam content and subordinate in Review and Reader.
- Provide a static reduced-motion fallback; the asset should not encode indispensable instructions or a correctness cue.
- Include the final source file, optimized shipped export, license/provenance entry, accessibility treatment, and a before/after screenshot in the delivery record.

## UI sound brief

Sound is optional feedback, not an educational dependency. Current service events include tap, correct, incorrect, XP, lesson completion, achievement, and milestone; the current `playFeedback` service maps tap/success/error/complete/achievement/milestone and safely no-ops when disabled or assets are absent. Keep event names and call sites aligned rather than adding unused audio categories.

If approved assets are supplied:

- Use only short, quiet, original or properly licensed cues. The existing asset specification sets a duration limit under 300 ms; do not add background music or spoken content to this channel.
- Respect the existing user sound preference. Haptics stay separately opt-in; never assume a sound should fire because haptics are enabled or vice versa.
- Do not play a cue for every repeated card transition, auto-play, background event, or timed exam state. Avoid overlapping cues and provide a silent fallback.
- Keep audio offline and optional. Do not alter Chinese TTS, speech recognition, recording, or audio-retention flows to implement UI SFX.
- Test that disabling sound is immediate, missing/corrupt assets do not interrupt study, and the app remains understandable with device sound muted.
- Verify license, source project, loudness, clipping, and byte size before populating the manifest. Until then, keep the current `null` entries.

## Performance and release checks

- Record each shipped image/audio file’s dimensions/duration, encoded format, byte size, source/license, and intended screen states.
- Confirm assets are packaged in offline Android/web builds; do not claim a performance benefit from source inspection alone.
- Inspect light and dark backgrounds, small/large display sizes, image-load failure, low-end-device scrolling, and memory use on a target device before release.
- Prefer one asset in a visible viewport over repeating decorative images in long lists. Do not animate each list item.
- Keep document content, learner-entered text, or user photos out of static illustration assets and app analytics.

## Approval checklist

- [ ] Asset is original or its license explicitly covers this app and distribution.
- [ ] Provenance/attribution and source are recorded.
- [ ] It is optimized, locally bundled, and not required for core learning.
- [ ] It has a static/reduced-motion fallback and works in light/dark contexts.
- [ ] It contains no embedded UI copy and has a deliberate accessibility treatment.
- [ ] It respects the screen mode: subdued in Review/Read/Utility and absent from timed Exam unless essential to the question.
- [ ] Audio remains optional, silent when disabled, and separate from TTS/recording.
- [ ] Device/performance verification is recorded; no untested performance claim is made.

