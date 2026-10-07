# Reader UX V2

Status: V5.2 UX and implementation notes based on current source. The route already supports bounded chunks, local document storage, saved-position resume, word lookup, and optional file/OCR input. The screenshot audit captured the no-document start screen, not a populated reading session; reading typography, imported documents, OCR, and resume were not visually/manual certified as passing.

## Verified current behavior

- src/app/reader/index.tsx is a local-first Reader. Its home state offers recent-document resume, stories, TXT/EPUB import, optional image OCR, and pasted text.
- Reading content is split into 2,000 Unicode code-point chunks. Word analysis is limited to the current chunk; the UI pages the resulting vocabulary tokens in groups of 160. The document cap is 100,000 characters.
- Saved documents are stored in existing reading_documents, reading_document_chunks, reading_progress, and reading_vocabulary tables. The legacy reading_documents.content field is retained as a bounded preview/fallback; normal reading fetches the requested chunk rather than rebuilding a saved book in JavaScript.
- Saved resume uses the existing progress field with an encoded character offset while decodeReaderPosition still accepts older token-index values. Position writes are serialized to prevent fast navigation/taps persisting an older offset.
- Opening a saved document loads the saved offset’s chunk. Chunk navigation, tapping a token, changing the token page, and opening a word detail save the current character position for saved documents. A draft is not durably resumable until the learner explicitly saves it.
- The Reader uses the local vocabulary repository to analyze the active chunk. Importing a document does not automatically save it; the learner explicitly saves the document. Saving selected vocabulary is a separate action and can also save sentence context. Context sentence lookup can read neighboring chunks to recover a sentence crossing a chunk boundary.
- Deleting a reading document is a soft hide via deleted_at. The existing UI message says learned words are not deleted with the document.
- Supported file paths are TXT and reflowable EPUB. TXT accepts UTF-8 or UTF-16 with BOM; import is capped at 100,000 characters and 400,003 bytes. EPUB is capped at 8 MiB and 100,000 extracted characters; source supports constrained EPUB 2/3 reflowable XHTML and rejects fixed-layout/unsupported ZIP/XML input. PDF and URL import are explicitly unsupported.
- OCR is an optional native DigitalInkRecognition module. If unavailable, the button is disabled and the UI offers text paste. OCR returns at most 2,000 characters, indicates truncation, and asks the learner to inspect/edit the text before analysis; it does not save vocabulary automatically.
- The native file picker may temporarily background the app; the source avoids cancelling while the picker is open, but cancels in-flight processing when the route backgrounds or loses focus. Import, OCR, analysis, and save operations have cancellation/timeout paths.
- The screen uses the READ presentation surface for the reading panel. The selected token exposes a label/state in source; the input, loading text, error, token page controls, and delete buttons have some explicit accessibility semantics.

Source references: src/app/reader/index.tsx, src/db/reading.ts, src/db/schema.ts, src/services/reader/pages.ts, src/services/reader/segment.ts, src/services/reader/chunk-analysis.ts, src/services/reader/document-import.ts, src/services/reader/text-import.ts, src/services/reader/epub-import.ts, src/services/reader/ocr.ts, src/services/reader/word-context.ts, src/theme/visual-modes.ts.

## V2 reading experience

Default mode: READ. Keep the actual Chinese text central and the surrounding controls quiet. Use the existing readingBackground/theme tokens, not a separate fixed “paper” theme. Reading should remain usable in dark mode; do not reduce contrast to imitate aged paper.

### Reader home

Prioritize “Tiếp tục đọc” when a saved document exists, with its title and last-opened date. Keep story discovery and “Thêm nội dung” as secondary actions. When there are no saved documents, use a calm invitation and explain supported input; do not present no history as an error.

The current document/deck library fetch has no dedicated initial loading flag, while the initial document list is empty. Avoid flashing a false zero-document state before the query resolves: model initial load separately from a genuinely empty library and from load failure.

### Import and review

Keep manual paste, TXT/EPUB picker, and native OCR distinct. Show size/character limit and supported-format guidance before the learner selects a file. After import/OCR, show the source name where available, character count, chunk count, truncation notice if applicable, and a clear “Tách và tra từ” next action. Do not auto-save the imported text or words.

For validation failures, retain the current draft and explain how to recover: unsupported encoding, malformed/unsafe EPUB, fixed-layout EPUB, over-limit file/text, unsupported PDF/URL, missing OCR module, OCR timeout, or user cancellation. A cancellation is not an import failure.

### Reading view

Keep paragraphs selectable/readable and use generous line height. Show an unobtrusive current chunk indicator and explicit “Phần trước/Phần sau” controls. Keep token-page navigation separate from chunk navigation: one moves within the current analysis results; the other loads the next 2,000-character document segment.

Token selection opens a small contextual panel with Hanzi, pinyin, Vietnamese meaning, HSK/status, “Mở chi tiết từ,” and an explicit deck selection/save action. Do not treat token selection as “learned,” schedule SRS, or award progress. Pinyin/translation toggles need a visible and accessible on/off state. If a chunk contains no analyzable Hanzi, keep the text visible and explain that reading can continue; do not show a blank page.

For a saved document, indicate that position is stored on this device and provide a truthful save/resume state. For a draft, state that resume becomes durable only after explicit save. On save failure, keep the draft and position in memory where possible, offer retry, and never imply a persisted save.

### Long-text layout

Use the existing chunk/page model; do not create an unbounded, full-book rendered component. Avoid auto-scrolling to token selection or the bottom on every state change. A route return from word detail should preserve the in-session scroll location and saved document offset. Make chunk boundaries obvious without splitting a displayed surrogate pair or changing the source text.

## State and edge-case contract

| State | Required UX |
|---|---|
| Initial library load | Show a stable loading state; do not mislabel not-yet-loaded as an empty library. |
| No saved documents | Explain that no reading is saved yet; offer story discovery, file, OCR if available, or paste. |
| Saved recent document | Show title/date and resume action; resume at the saved character offset, including legacy documents. |
| Import picker cancelled | Return to prior usable state without an error or implicit save. |
| Unsupported/malformed file | Explain the supported format/limit, preserve prior user text, and provide a retry or paste option. |
| OCR unavailable | Clearly disable/explain native requirement and keep paste/file alternatives available. |
| OCR successful/truncated | Put recognized text into editable draft. If truncated, state only the first 2,000 characters were returned. Require explicit user review and analysis. |
| Empty/whitespace paste or text over 100,000 characters | Do not analyze/save. Give inline validation and keep the previous valid draft/content intact. |
| Chunk lookup pending | Announce a polite loading state, disable conflicting navigation, allow cancellation, and do not publish stale results after cancellation. |
| Analysis timeout/error | Keep the document text visible, explain the current chunk could not be analyzed, and offer retry. Do not report that the document itself was lost. |
| No vocabulary matches/Hanzi tokens | Keep the original text and chunk controls usable; show a non-blocking explanation. |
| Saved position write fails | Keep reading; explicitly say the current position may not be durable until retry/close. |
| Document save succeeds | Update the library/recent item only after the DB write succeeds; retain the exact current position. |
| Document delete | Confirm hide from library; explain that learned words are retained. Do not hard-delete or change IDs. |
| Story read | Preserve existing story content/question behavior. Do not claim the custom-document resume model also covers story progress unless source verifies it. |

## Accessibility, theme, and motion

- Reading controls need descriptive labels: chunk number/count, token-page number/count, previous/next, show/hide pinyin, show/hide Vietnamese, selected Hanzi, deck selection, save, and resume.
- Keep original paragraphs selectable. Avoid making each glyph a separate focus stop; token buttons can be separate only where lookup is an intentional interaction.
- Communicate selected token and visible toggles through accessible state, not color alone. Ensure Chinese, pinyin marks, and Vietnamese diacritics remain legible at large text sizes.
- The reading surface and selected/error/status surfaces must use light/dark theme tokens. Dark-theme Reader screenshots and contrast checks have not been performed.
- Do not animate reading text, auto-scroll during token selection, or use continuous decoration. Respect the app/system motion preference for any new transitions.
- On focus change, explain loading/cancel/error without stealing focus from the active paragraph or input. Verify TalkBack/VoiceOver and keyboard behavior manually.

## Data and compatibility constraints

- Preserve document IDs, existing table/column contracts, soft-delete semantics, reading_vocabulary links, and old token-index resume values.
- Keep 2,000-character bounded chunking, 100,000-character limit, token paging, and explicit save semantics unless a separately reviewed data migration is approved.
- Do not rewrite stored text for typography, normalize offsets, flatten all chunks into a newly persisted field, or reset reading progress.
- Preserve sentence context across neighboring chunks when saving a word. If context save fails after the word itself was saved, state that distinction truthfully.
- Do not claim OCR is present on every platform/build; the native module is optional.

## Validation checklist

The prior screenshot audit captured only the Reader start state and explicitly lacked a sample document. Before declaring this screen complete:

- [ ] Test manual text and multi-chunk document at start, middle, and final chunk.
- [ ] Save, close/reopen, and confirm exact resume location; cover a legacy document/token-index fixture.
- [ ] Open a word detail and return; verify both visible scroll position and durable offset.
- [ ] Test TXT UTF-8, UTF-16 with BOM, malformed bytes, unsupported extension, and size/character limits.
- [ ] Test valid EPUB 2/3 reflowable, fixed-layout EPUB, malformed archive/XML, excessive expansion, and unsupported assets.
- [ ] Test OCR available/unavailable, permission/cancel, no text, timeout, and >2,000-character truncation.
- [ ] Test no Hanzi match, lookup timeout/cancel, storage full/write failure, delete confirmation, and deck unavailable.
- [ ] Check light/dark, large font, TalkBack/VoiceOver, keyboard, and reduced motion on supported devices.

These are test targets, not results. None of the above is marked passed by this specification.
