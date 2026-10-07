# Performance V3 status

Implemented performance boundaries include SQLite-backed vocabulary search, bounded Reader token display, content download byte limits, and chunked Reader persistence. These are design safeguards, not benchmark results.

No representative Android low-end-device measurements have been collected in this workspace. Release requires recording cold start, dictionary search, review start, Reader import/open, memory during reading, and sync retry behavior on a release-like build; results must be compared with the existing `PERFORMANCE_BASELINE.md` rather than inferred from unit tests.

