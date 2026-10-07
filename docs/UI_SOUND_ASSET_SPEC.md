# UI sound specification

UI feedback is routed through `ui-sound-service.ts`. The current manifest is intentionally silent; core learning never depends on a sound asset.

Future assets must be owned or appropriately licensed, short (under 300 ms), low-volume, and mapped only to `tap`, `success`, `error`, `complete`, `achievement`, and `milestone`. Respect the user sound setting; never use these assets for TTS.