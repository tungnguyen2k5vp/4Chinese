# English Bulk Add — Current Capabilities and Gaps

## Superseded baseline — 2026-10-11 personal vocabulary update

The plain-word bulk lookup, Skypedia sense selection, per-row exclusion/undo, dictionary POS/IPA/example enrichment and private offline source cache are now implemented. New decks and all confirmed cards are saved atomically. See `ENGLISH_BULK_ADD.md` and `ENGLISH_PERSONAL_VOCABULARY_QA_2026-10-11.md` for current behavior and evidence. The distribution approval gate is unchanged; the corpus is not bundled in APK/Web exports.

Remaining limits: exact headword/phrase lookup (no fuzzy/semantic recognition), no generated translations/images, IPA not guaranteed accent- or sense-specific, US/UK buttons use installed TTS voices, no cloud sync of this import, native platform validation limited to the matrix explicitly recorded in the new QA report.

The text below is retained as the historical V7.2 capability baseline, not current status.

## What the current implementation does

- Accepts explicit English headword/phrase + one Vietnamese meaning per line, separated by a TAB.
- Validates rows and reports malformed or duplicate pairs; allows the same headword with a different meaning.
- Enforces a 230,000-character text limit, at most 100 non-empty rows per batch, a 300-character headword and a 2,000-character meaning.
- Preserves a local draft and presents a validation/preview step before the user explicitly saves to a selected deck.
- Treats NFC-normalized, case-insensitive identical headword/meaning pairs in the same import as duplicates.

## Not implemented (do not imply otherwise)

- No automatic lookup in a large English dictionary, retrieval of all senses, or sense selection.
- No part-of-speech or IPA matching, pronunciation enrichment, semantic deduplication, translation generation or automatic meaning completion.
- No server-side import or cloud synchronization in this flow.

V7.2 keeps the parser, persistence, validation rules and database untouched; it only adjusts presentation/responsiveness. Imported meanings remain user-provided. The capture suite exercises preview/empty states with temporary browser fixtures only and does not seed production data.
