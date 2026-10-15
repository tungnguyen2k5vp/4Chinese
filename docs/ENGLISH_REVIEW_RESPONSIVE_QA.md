# English Review V7.2 — Responsive QA

Review presentation was adjusted without changing the review scheduler: compact speech controls replace the overflowing full-width row, and IPA is laid out separately from the controls. English US/UK machine speech remains labeled as machine-generated. The question, answer-reveal and quick-session states keep their existing meaning/example and “Not remembered / Remembered” actions.

The Web runner checks 320, 360, 390 and 412 CSS-pixel viewports at normal size, then 130%, 160% and 200% injected text-size stress at 390 pixels, light/dark states, horizontal document overflow and the IPA/control bounding boxes. Exact per-case PASS/FAIL values are recorded in `artifacts/english-ui-v7-2-final/manifest.json`; these are browser-layout checks, not a claim that Android native font scaling or TalkBack was tested.

Native keyboard interaction, safe-area insets and screen-reader operation remain unverified. No SRS interval, grading, persistence or review progress code was modified.

The additional critical matrix checks 130%/160% at all four widths in both themes for Review and populated Statistics (32 cases), plus answer/quick review at 320px/160% in both themes (4 cases). All 36 pass their recorded bounds/action assertions; controls can be scrolled into view and have at least a 44px touch area. These checks do not certify the fixed navigation labels under the synthetic font injection, which bypasses React Native's native `fontScale` branch.
