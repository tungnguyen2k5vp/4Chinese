# 4Chinese V5.3 — Reader redesign

Date: 2026-10-06

The `/reader` landing screen is now a reading corner rather than a form-first entry: a paper-toned editorial hero introduces the reading experience, followed by separate guided stories and personal/offline-content destinations. Story selection keeps its existing content and routing. The story index (`/stories`) uses original scalable landscape covers and shows only verified story level, duration, and reading-question/attempt information available from the source data.

The immersive reader, text import, OCR entry, local document/position persistence, and contextual word lookup remain in the existing reader flow. This pass does not change text parsing, lookup, local storage, or reading-comprehension logic. No progress or story metadata is fabricated.

Evidence: [Reader landing](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/reader-v2.png), [story index](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/stories.png).

Runtime QA covered the landing route only; imported text, OCR permission, word sheet, and a complete story session were not exercised in this emulator pass.

