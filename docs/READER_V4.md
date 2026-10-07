# Reader V4 (Phase 39)

## Implemented

Schema v28 adds `reading_document_chunks`. New documents are split on Unicode code points into 2,000-character chunks, with the legacy `reading_documents.content` retained as a bounded preview and fallback. Full text is reconstructed locally by `getReadingDocumentContent`; documents created before v28 still open from their original content. Backup format v3 exports and restores chunks atomically with documents, progress, and vocabulary links.

The UI now asks the repository for the full document when reopening saved content. Current manual/TXT entry remains deliberately capped at 2,000 characters, so long-document ingestion is not advertised as complete.

## Remaining release gate

Long TXT/EPUB/PDF ingestion, per-chunk tokenization, pagination/virtualization, bookmark offsets, and device performance measurements remain required before Reader V4 can claim large-document support. The storage change makes those additions recoverable without a destructive migration.

