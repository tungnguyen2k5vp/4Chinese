# English Reader V7.2 — Refinement

The reading surface now renders word tokens as ordinary inline text with natural spaces, punctuation, contractions and wrapping. Only the selected word receives a visible selection style. This keeps the existing tap-to-lookup interaction without presenting every token as a separate blue chip.

The reader home, current reading title/progress controls, font-size controls, add/edit text flow and personal-deck lookup remain. The lookup makes its actual scope clear: it checks the learner's personal English collection. If there is no saved meaning, the UI says so and asks the learner to enter one; no dictionary sense is fabricated and saving still requires explicit confirmation.

Long text is rendered by the existing bounded reading window. Automated tokenizer/window tests exercise 100, 1,000, 10,000 and 100,000 characters and preserve source offsets. The Web visual runner additionally opens a 100,000-character text in its isolated browser fixture; these samples do not enter the user's SQLite database or collections. Captures/results are in `artifacts/english-ui-v7-2-final/manifest.json`.

Native Android text selection, OS accessibility font scaling, native keyboard avoidance and scroll restoration were not certified by the Web run. The results are an Expo Web preview only.
