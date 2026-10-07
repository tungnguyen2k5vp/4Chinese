# 4Chinese V5.3 — Illustration system

Date: 2026-10-06

`src/components/visual/LearningLandscape.tsx`, `EmptyIllustration.tsx`, `ToneContour.tsx`, and `src/components/engagement/LearningGuide.tsx` are app-owned React Native SVG illustrations. They require no remote images or new runtime package and scale to the width/height supplied by each screen.

The component exposes four semantic moods:

| Mood | Use | Palette character |
|---|---|---|
| `journey` | Course and home progress | Paper, mountain green, blue accent |
| `reading` | Reader and library | Warm paper and leaf green |
| `voice` | Speaking studio and roleplay setup | Soft mauve/blue with warm microphone accent |
| `progress` | Statistics and achievements | Cool blue/green with a warm sun |

The mountains, path, sun, and ornamental marks are decorative and hidden from assistive technology; adjacent text and controls carry all task/state information. Illustration state is not used to imply mastery or score. Store no per-screen raster duplicates unless a later release pipeline requires them.

`EmptyIllustration` provides nine contextual scenes (`search`, `review`, `mistakes`, `deck`, `recordings`, `stories`, `history`, `offline-ai`, and `achievement`). The accompanying heading/message/actions—not artwork or color—explain each empty state. `ToneContour` is a visual teaching aid for the five Mandarin tone shapes; it is not an audio waveform or a result/score. `LearningGuide` is decorative and does not encode a learner's progress.

## QA notes

- Verified rendering on Android emulator at 1080×1920 px / 420 dpi, default system font scale 1.0.
- Representative journey, reading, voice, and progress variants appear in the earlier V5.3 screenshot set. Final-pass empty-state/tone guide screens were not captured because the emulator dev client did not render them.
- Representative dark-mode and 160% text-scale runtime screenshots are available in the QA artifact folder; all-route dark-mode and 200% font-scale verification remain open items (see `V5_3_ACCESSIBILITY.md`).

