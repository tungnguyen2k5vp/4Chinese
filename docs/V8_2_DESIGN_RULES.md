# V8.2 Chinese design rules

1. Apply the compact layout only to Chinese routes through `ChineseScreen`; keep default `Screen` behavior for English and shared routes.
2. Keep one primary action per screen. Put secondary actions in compact groups or disclosures.
3. Use concise Vietnamese labels, preserve Chinese characters and Pinyin, and explain whether a count is an app-course count or an external standard.
4. Do not imply official HSK readiness, certified scoring, speech recognition, human-recorded audio, or licensed content unless the feature/data actually provides it.
5. Make answer reveal intentional; hearing a prompt must not select or grade an answer.
6. Preserve data, routing, DB schema, SRS schedule, XP/scoring logic, and accessible control roles. UI selection is not a learner-progress event.
7. Keep flexible, scrollable content and safe-area handling on Chinese screens; do not force fixed-height cards for long text.
8. Use `Disclosure` for explanatory or secondary detail that should not dominate the first viewport.
9. Keep empty and unavailable states actionable and specific; distinguish “no data yet” from a loading or error state.
10. Validate screen captures at font scale 1.0 on emulator only in this pass. Larger text, dark mode, TalkBack, and physical-device behavior remain open checks.

Implementation references: `src/components/ChineseScreen.tsx`, `src/components/Screen.tsx`, `src/components/chinese/Disclosure.tsx`, and `src/constants/design.ts`.
