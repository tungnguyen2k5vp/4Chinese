# V8.2 HSK hub

The HSK tab keeps three distinct destinations—Học, Ôn thi, Đề cương—then shows a compact level selector and the currently selected level's actual progress and next step. Levels 1–6 and 7–9 remain selectable. The HSK 3.0 catalog is identified as a separate, dated reference rather than blended into the app's course count.

Primary source: `src/app/(tabs)/hsk.tsx`. Syllabus/catalog: `src/app/hsk/syllabus.tsx` and `src/components/Hsk30Catalog.tsx`. Native captures: `hsk-tab.png`, `hsk-level-1.png`, `47-hsk-syllabus.png`.

## Count reconciliation

Historical screenshots showed 674 items in the app course and 300 items in a reference. They are not silently forced to match. The current UI identifies the course-progress count as “tiến độ trong ứng dụng” and the separate reference as “Danh mục HSK 3.0 · 11/2025”; current QA shows HSK 1 with 509 app-course vocabulary items. The old 674/300 pair has not been reconciled row-by-row to the current data sources or crosswalk. Do not market either number as official coverage. See `V8_2_DATA_CONSISTENCY_AUDIT.md`.

Current native QA was against the retained private emulator DB: schema version 45, 11,877 internal vocabulary rows and 16,986 syllabus rows. It did not modify the catalog. Content validation reports 11,828 bundled vocabulary records and 11,877 internal records; this validates structure, not academic accuracy.

## Verification limits

Hub/level/catalog rendered on Android API 36. HSK 7–9 and the complete lesson-to-progress path were not exhaustively walked. Progress remains sourced from existing app/course data; no HSK score or completion value was fabricated.
