# Reader V5 — bounded TXT and lazy reading

## Supported, with explicit bounds

Manual/pasted text and TXT support **100,000 Unicode code points** per document. TXT accepts validated UTF-8 (with or without BOM) and UTF-16 LE/BE with BOM. The byte ceiling is **400,003 bytes**, allowing 100k four-byte characters plus a UTF-8 BOM. Unsupported encodings (including GBK/Big5/UTF-32), malformed sequences, binary control characters, empty content, wrong extensions and oversized input produce Vietnamese errors before any document write. TXT is never silently truncated. BOM removal, CRLF/CR normalization and outer whitespace trimming are intentional; internal whitespace/order/Unicode code points are preserved.

OCR retains its existing explicit 2,000-character preview/truncation warning. **EPUB, PDF, scanned-PDF OCR and URL import remain deferred**, not advertised as implemented. No dependency, app-config, cloud-sync or SRS scheduler change was made.

## Pipeline and UI bounds

User import/paste → validated text → 2,000-code-point chunks → current-chunk analysis → 160-token pages. Sentence extraction is lazy, on an explicit word-context save. A sentence crossing a chunk boundary is reconstructed from neighboring raw chunks only when needed; no adjacent vocabulary analysis runs.

New document saves retain the existing schema-v28 chunk table and bounded legacy preview. Opening saved content uses `getReadingDocumentLayout` plus `getReadingDocumentChunk`, not `getReadingDocumentContent`: one chunk is fetched/tokenized at a time. Historical documents without chunks use SQLite `substr` to read a bounded fallback page. History rows also select bounded previews. The complete-content API remains available for existing callers/backup tests but is no longer the Reader screen's opening path.

Imported TXT opens its first page without putting a full novel in the editor. Manual editing is bounded at 100k and rejects oversized changes while retaining the previous draft. Reading mode shows only current raw text and token page; pinyin/Vietnamese toggles remain. Previous/next chunk and token-page controls are explicit and bounded. Per-page coverage is labelled as such; multi-chunk saves do not misrepresent page-only vocabulary occurrences/coverage as full-novel metrics.

Analysis yields before lookup so loading can paint, has a 10-second timeout, and ignores canceled/late results. UI exposes loading, cancellation, retryable error and no-Hanzi states. Blur/background/unmount cancel analysis/import; document save cancellation checks between chunk inserts and rolls back its transaction. Picker read cancellation resolves promptly, cleans the app-cache copy only, and never deletes the user's original. The platform byte read itself may continue after cancellation; late data is discarded.

Native picker selection is distinguished from processing: opening a system picker can temporarily background the app Activity, so that event does not itself abort selection. The read-phase callback re-enables background cancellation after a selected file is handed to the app. Blur/unmount/explicit cancel still invalidate late picker results.

## Durable resume and back

The existing `reading_progress.last_token_index` field is reused without schema changes. Old values under `1,000,000,000` remain legacy token indices. V5 encodes a stable absolute Unicode-code-point offset as `1,000,000,000 + offset`; `decodeReaderPosition` distinguishes the formats. Existing backup exports/imports preserve this integer unchanged. `updateReadingPosition` keeps its existing legacy API semantics; new UI uses `updateReadingCharacterPosition`.

Character offsets survive token-match/status changes better than a global token index. Resume loads the corresponding chunk, bounded token page and selected token. Legacy UI documents were capped at 2k, so their old token resume is interpreted in the first chunk without scanning the novel. The schema-v28 external-storage case with historical global token positions spanning multiple chunks is not inferred or eagerly reanalyzed; such non-UI documents need a separately reviewed compatibility rule. Chunk boundaries remain exactly compatible with existing fixed-2k storage.

Writes are serialized so rapid taps/pages cannot persist an earlier position after a later one. Page navigation, token taps and opening word detail save offsets. Returning from word detail retains the mounted Reader's chunk/page/selection and ScrollView offset. A cold start retains the semantic character position rather than a screen-pixel coordinate (which changes with font scaling/device size). Opening saved documents waits for queued position writes before reading fresh progress.

## Personal context integration (main-owned migration 36)

After `copyVocabularyBatchToDeck` succeeds, `saveReaderWordContext` invokes main's `saveVocabularyContext`. An already-present word may still record a new encounter. Payload:

- `vocabularyId`: existing stable vocabulary ID, no rekeying.
- `sentence`: exact current sentence from unmodified stored/draft text; no fabrication/truncation.
- `sourceType`: STORY for a story, LESSON for an attached activity, OCR for OCR input, otherwise READER.
- `sourceId`: story ID, saved document ID, activity ID, or stable per-draft local encounter ID.
- `location`: `chunk:<index>:token:<chunk-local-index>:char:<absolute-code-point-offset>`.
- `senseId`: omitted (null); no guessed sense.

The existing deck-copy workflow creates a separate custom vocabulary ID. Reader resolves the saved/existing deck copy using the same normalized Hanzi+pinyin key and attaches the encounter to both dictionary and deck-copy IDs, so personal-deck SRS can retrieve it too. No source IDs are changed and repeat encounters upsert rather than duplicate.

Context is local-only; this code has no network/AI transport. Main owns schema/migrations/backup and the context module. Explicit backup can include contexts under that existing contract. Context failures are caught separately: the word stays saved and UI reports that context was not saved. The shared context contract currently limits sentences to 2,000 UTF-16 units; an overlong exact sentence is rejected, not silently clipped.

## Validation and handoff

Focused command: `npx vitest run src/db/reading.test.ts src/db/reading-chunks.test.ts src/services/reader`.

Covered: 100k chunk order/code-point boundaries; UTF-8/BOM/UTF-16 LE/BE; malformed/unsupported encoding; binary/empty/oversize; metadata and actual-byte limits; native-cache safety and browser File fallback; prompt cancellation/late result/timeout; lazy chunk-only lookup; legacy resume; stable offsets/page selection; 100k backup round-trip; transactional interrupted-save rollback; deleted-document fallback; exact cross-chunk sentence and main-owned context upsert/rejection.

Scoped lint: `npx eslint src/app/reader/index.tsx src/db/reading.ts src/db/reading.test.ts src/db/reading-chunks.test.ts src/services/reader`. Typecheck: `npm run typecheck`.

Final worker checkpoint (2026-10-01): focused Reader tests **10 files / 50 tests PASS**; scoped lint **PASS** with no warnings; repository typecheck **PASS**; owned tracked-file `git diff --check` **PASS** (only existing CRLF conversion notices). The real SQLite integration includes actual dictionary-to-deck copying, duplicate-copy skip, and context availability under both original and copied IDs.

No full test suite/build/export was run by this parallel worker. The baseline belongs to main. No commit/push/deploy/install performed.

Platform status: native code uses existing SDK-57 FileSystem/DocumentPicker modules available in matching Expo Go/development builds; OCR still requires its existing custom build. Web uses a user-triggered picker plus browser File, not native FileSystem. **Android/iOS/Expo Go/release picker, real-device performance, back/lifecycle, low-storage and font scaling: NOT DEVICE TESTED (no device connected).** Browser runtime smoke remains an integration gate. No device/performance/production-ready claim.

References inspected before implementation: [SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/), [SDK 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).
