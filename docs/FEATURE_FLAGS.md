# Feature flags

`src/services/feature-flags/feature-flags.ts` supplies a deterministic local provider. Flags work offline and do not require a remote service.

| Flag | Default | Purpose |
|---|---:|---|
| `newHome` | true | New Home experience |
| `newLearningPath` | true | Timeline path UI |
| `mascot` | true | Internal neutral learning guide |
| `uiSounds` | false | Future licensed UI sounds |
| `aiTutor` | false | Future provider-backed tutor |
| `pitchAnalysis` | false | Future pronunciation analysis |
| `newStats` | true | Updated statistics |
| `quickSessions` | true | Short study sessions |
| `comebackPrompt` | true | Gentle return prompt |

`configureFeatureFlags()` can replace the provider. A thrown read returns the local default; a failed refresh is ignored so provider outages cannot block learning. No remote flag service is configured in this phase. New remote rollouts still require privacy review, deterministic offline fallback, and staged-release testing.
