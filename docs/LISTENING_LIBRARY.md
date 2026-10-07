# Listening Library V5 — first usable slice

`/listening` is reachable from Practice/Library hubs. It reuses shared `sentences` IDs and provenance rather than copying a second corpus. Only active REVIEWED sentence rows with nonempty translations are listed; pending contrasts remain excluded. Current type: SENTENCE. Model supports WORD/DIALOGUE/ANNOUNCEMENT/STORY/CONVERSATION/LECTURE later; no unsupported format is shown as available.

Local indexed level/review queries, pages of 20 (hard maximum 40), on-demand selection. Transcript/pinyin/translation are hidden until requested. Replay/stop, three speeds, missing-voice/error fallback, background/unmount cleanup. This is TTS, not native/licensed audio. There are currently no comprehension questions or automatic scores here; self-check is explicit. No cloud service is required. Offline speech depends on an installed Chinese TTS voice.

No new audio files or unlimited cache were introduced. Target vocabulary/grammar can be loaded lazily from shared sentence links. Native audio packs/license/LRU architecture already exists but actual approved recordings and storage UI are pending. Review status inherited from legacy corpus is not new independent academic verification.
